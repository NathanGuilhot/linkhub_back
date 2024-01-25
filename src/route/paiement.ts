import express, {Request, Response} from "express"
const stripe = require('stripe')(process.env.STRIPE_API_KEY_PRIVATE)
import {StatusCodes} from "http-status-codes"
import database from "./data/linkhub_database"
const jwt = require('jsonwebtoken');
import { JwtPayload } from 'jsonwebtoken'

import { db } from './data/linkhub_database'

export const paiementRouter = express.Router()

paiementRouter.get("/subscription/:user", async (req : Request, res : Response) => {
    try{
        const sql_select = "SELECT stripe_id FROM users WHERE id = ?"
        const rows = db.prepare(sql_select).all(req.params.user);
        if (rows.length == 0 || rows[0].stripe_id === null) {throw "NO STRIPE ACCOUNT FOUND";}
        
        const subscription = await stripe.subscriptions.list(
            {"customer":rows[0].stripe_id,
            "price": process.env.STRIPE_SUBSCRIPTION_ID}
        )
        if (subscription.data.length === 0) {throw "NO SUBSCRIPTION FOUND";}

        res.json({"sub_end":subscription.data[0].current_period_end})
            
        const sql_update = "UPDATE users SET sub_end = ? WHERE id = ?"
        db.prepare(sql_update).run(subscription.data[0].current_period_end, req.params.user);
    } catch(err){
        res.status(StatusCodes.NOT_FOUND).send(err);
    }

})

paiementRouter.post("/checkout", async (req : Request, res : Response) => {
    const token = req.body.token
    const {id} = jwt.verify(token, process.env.JWT_PRIVATEKEY as string) as JwtPayload
    const user_stripe_id = database.get_stripe_id(id);

    try{
        const stripe_session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer: user_stripe_id,
            mode: 'subscription',
            line_items: [{
                price: process.env.STRIPE_SUBSCRIPTION_ID,
                quantity: 1,

            }],
            success_url:"http://localhost:5173/edit",
            cancel_url:"http://localhost:5173/edit"
        })
        res.json({url: stripe_session.url})
    } catch(err) {
        console.log(err)
        res.status(StatusCodes.BAD_REQUEST).send("ERROR")
    }
})


paiementRouter.put("/", async (req : Request, res : Response) => {
    
})
paiementRouter.delete("/", async (req : Request, res : Response) => {

})