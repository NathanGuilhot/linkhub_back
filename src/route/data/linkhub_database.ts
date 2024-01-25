

export const db = require('better-sqlite3')("./src/route/data/data.db", {fileMustExist:true});
db.pragma('journal_mode = WAL');

import { userPublicData } from "../type/userPublicData"
import bcrypt from 'bcryptjs';
const jwt = require('jsonwebtoken');
import { JwtPayload } from 'jsonwebtoken'
const stripe = require('stripe')(process.env.STRIPE_API_KEY_PRIVATE)


const database:{
                create: (_body:any)=>(string|undefined),
                login:(_body:any)=>(string|undefined),
                getallids:()=>any,
                get_stripe_id:(_id:string)=>string,
                get:(_id:string)=>userPublicData|boolean,
                delete:(_body:any)=>boolean,
                edit:(_body:any)=>userPublicData|boolean
                edit_avatar:(_id:string, _filename:string)=>boolean
            } = {
    create: (body)=>{
        if (!body.id) return undefined;
        if (!body.email) return undefined;
        if (!body.password) return undefined;
        console.log(body)

        const default_data:userPublicData = {
            name: body.id,
            avatar: "default.jpg",
            tagline: "Welcome to my Linkhub!",
            bgcolor: "green",
            links: [],
            sub_end:0
        }

        //TODO(Nighten) CHANGE THIS LATER
        const hashed_password = bcrypt.hashSync(body.password, 10);

        
        const sql = "INSERT INTO users (id, name, avatar, tagline, bgcolor, links, email, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?);";
        try{
            const links_text = JSON.stringify({links:default_data.links});
            let res = db.prepare(sql).run([default_data.name, default_data.name, default_data.avatar, default_data.tagline, default_data.bgcolor, links_text, body.email, hashed_password])
            const token = jwt.sign({ id: body.id }, process.env.JWT_PRIVATEKEY as string);
            
            StripeCreateCustomer(body.email, body.id);

            return token;
        } catch(error) {
            console.log(error)
            return undefined;
        }
        return undefined;
    },
    login: (body)=>{
        
        const sql = "SELECT * from users WHERE email = ?";
        console.log(body)
        let res = db.prepare(sql).get([body.email])
        if (res===undefined) return undefined;
        console.log(res)

        
        //TODO IMPLEMENT PROPER HASH CHECKS
        const isPasswordMatching = bcrypt.compareSync(body.password, res.password)
        if (!isPasswordMatching) return undefined
        
        const token = jwt.sign({ id: res.id }, process.env.JWT_PRIVATEKEY as string);

        return token
    },
    getallids: ()=>{
        const sql = "SELECT id FROM users";
        let rows = db.prepare(sql).all();
        if (rows.length==0) return false
        return rows;
    },
    get : (id)=>{
        const sql = "SELECT * FROM users WHERE id=?";
        let rows = db.prepare(sql).all([id]);
        if (rows.length==0) return false

        return {
            "id":rows[0].id,
            "name":rows[0].name,
            "avatar":rows[0].avatar,
            "tagline":rows[0].tagline,
            "bgcolor":rows[0].bgcolor,
            "links":JSON.parse(rows[0].links).links,
            "sub_end": rows[0].sub_end
        }
    },
    get_stripe_id: (id)=>{
        const sql = "SELECT stripe_id FROM users WHERE id=?";
        let rows = db.prepare(sql).all([id]);
        if (rows.length==0) return ""
        return rows[0].stripe_id
    },
    delete : (body) => {
        if (!body.id) return false;

        const sql = "DELETE FROM users WHERE id=?";
        try{
            const res = db.prepare(sql).run([body.id]);
        } catch {
            return false;
        }

        return true
    },
    edit : (body) => {
        const identifier:JwtPayload = jwt.verify(body.token, process.env.JWT_PRIVATEKEY as string) as JwtPayload
        
        const sql = "UPDATE users SET (name, avatar, tagline, bgcolor, links) = (?, ?, ?, ?, ?) WHERE id = ?;"
        try{
            const links_text = JSON.stringify({links:body.links});
            console.log(links_text)
            const rows = db.prepare(sql).run([body.name, body.avatar, body.tagline, body.bgcolor, links_text, identifier.id]);
            console.log(rows);
            if (rows.changes == 0) return false;
            return true;
        } catch (error) {
            console.log(error)
            return false;
        }
    },
    edit_avatar: (pId:string, pFilename:string) => {
        const sql = "UPDATE users SET (avatar) = (?) WHERE id = ?;"
        const rows = db.prepare(sql).run([pFilename, pId]);
        if (rows.changes == 0) return false;
        return true;
    }
}

async function StripeCreateCustomer(pEmail:string, pId:string){
    console.log("=== Create Stripe Costumer")
    try{
        const customer = await stripe.customers.create({
            email: pEmail,
            description: 'New Customer'
        });
        // console.log(customer)

        const sql = "UPDATE users SET (stripe_id) = ? WHERE id = ?"
        db.prepare(sql).run([customer.id, pId]);
    }
    catch(err){
        console.log(err);
        return;
    }

}

export default database;
