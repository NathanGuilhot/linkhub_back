import express, {Request, Response} from "express"
import {StatusCodes} from "http-status-codes"
import database from "./data/linkhub_database"
import { userPublicData } from "./type/userPublicData"
const jwt = require('jsonwebtoken');
import { JwtPayload } from 'jsonwebtoken'

export const linkhubRouter = express.Router()

const fs = require('fs');
var crypto = require('crypto');
const path = require('path');

linkhubRouter.get("/user", async (req : Request, res : Response) => {
    const token = (req.query.token as string);
    try{
        const identifier:JwtPayload = jwt.verify(token, process.env.JWT_PRIVATEKEY as string) as JwtPayload;
        const user_public_data:userPublicData|boolean = database.get(identifier.id);
        if (user_public_data===false) {res.status(StatusCodes.NOT_FOUND).json({ERROR:"USER NOT FOUND"}); return}
        res.status(StatusCodes.OK).json(user_public_data)  
    } catch (err) {
        res.status(400).send('Invalid token')
    }

})
linkhubRouter.get("/user/public", async (req : Request, res : Response) => {
    const name = (req.query.name as string).toLowerCase();
    const user_public_data:userPublicData|boolean = database.get(name);
    if (user_public_data===false) {res.status(StatusCodes.NOT_FOUND).json({ERROR:"USER NOT FOUND"}); return}
    res.status(StatusCodes.OK).json(user_public_data)  
})
linkhubRouter.get("/user/all", async (req : Request, res : Response) => {

    const ids:any = database.getallids();
    if (!ids) {res.status(StatusCodes.NOT_FOUND).json({ERROR:"USER NOT FOUND"}); return}
    res.status(StatusCodes.OK).json(ids);
})

//Register
linkhubRouter.post("/user", async (req : Request, res : Response) => {
    const sessionId = database.create(req.body);
    if (!sessionId) res.status(StatusCodes.NOT_FOUND);
    res.json({'sessionId':sessionId});
})

//Login
linkhubRouter.post("/user/login", async (req : Request, res : Response) => {
    const sessionId = database.login(req.body);
    if (sessionId === undefined) res.status(StatusCodes.NOT_FOUND);
    res.json({'sessionId':sessionId});
    
})

linkhubRouter.put("/user", async (req : Request, res : Response) => {
    res.send(JSON.stringify(database.edit(req.body)));
    
})
linkhubRouter.delete("/user", async (req : Request, res : Response) => {
    res.send(JSON.stringify(database.delete(req.body)));
})


const PATH_TO_IMAGE_FOLDER = process.env.LINKHUB_PATH_IMAGE_FOLDER || "C:\\Users\\Lenovo\\code\\REACT\\linkhub_front\\public\\avatar";

linkhubRouter.post('/upload', async (req, res)=>{
    console.log("upload request")
    const token = (req.body.token as string);
    let user_id:string = "";
    try{
        const identifier:JwtPayload = jwt.verify(token, process.env.JWT_PRIVATEKEY as string) as JwtPayload;
        user_id = identifier.id;
        // const user_public_data:userPublicData|boolean = database.get(identifier.id);
    } catch (err) {
        res.status(400).send('Invalid token'); return;
    }

    if (!req.body.data) return res.status(300).send("Bad input");
    
    //WRITE IMAGE TO THE DISK
    const filename = `${crypto.createHash('md5').update(req.body.data).digest('hex')}.jpg`
    const filepath = path.join(PATH_TO_IMAGE_FOLDER, filename);
    console.log(`Writing image to ${filepath}`)

    const file = await fs.writeFile(filepath, req.body.data.replace(/^data:.*;base64,/, ""), 'base64', (err:any)=>{if (err) throw err;})

    //UPDATE THE DATABASE
    database.edit_avatar(user_id, filename)
    
    //SEND THE DATABASE BACK
    res.json({filename:filename})
})