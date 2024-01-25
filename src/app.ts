import express from "express"
import * as dotevnv from "dotenv"
import cors from "cors"
import fs from "fs"
import path from "path"

dotevnv.config()

import {linkhubRouter} from "./route/linkhub"
import {paiementRouter} from "./route/paiement"


if (!process.env.LINKHUB_PORT) {
    console.log(`No port value specified...`)
}

const PORT = parseInt(process.env.LINKHUB_PORT as string, 10)

const app = express()

app.use(express.json())
app.use(express.urlencoded({extended : true}))
app.use(cors())

app.use('/linkhub', linkhubRouter)
app.use('/pay', paiementRouter)

if (process.env.LINKHUB_PATH_TO_FRONT){
    app.use(express.static(process.env.LINKHUB_PATH_TO_FRONT));
    app.use((req, res, next)=>{
        fs.readFile(path.join(process.env.LINKHUB_PATH_TO_FRONT as string, '/index.html'), 'utf-8', (err, content) => {
            if (err) {
            console.log('We cannot open "index.html" file.')
            }
            console.log("Serve not found file")
    
            res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            })
    
            res.end(content)
        })
    });
}

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`)
})