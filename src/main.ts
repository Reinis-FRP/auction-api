import * as dotenv from 'dotenv'
import http from 'http'
import Events from 'events'

import * as express from './express'
import * as ws from './ws'

dotenv.config()

async function run(env:NodeJS.ProcessEnv){
  const port = Number(env.port ?? 2999)
  const events = new Events()
  // todo add auction here
  // const auction = new Auction((type,data)=>events.emit('message',type,data))
  const auction = {}
  const app = await express.Init({port},auction)
  const server = http.createServer(app);
  const broadcast = ws.WsApp(server)

  // listen to events from auction and broadcast to websocket
  events.on('message',(type,data)=>{
    try{
    switch(type){
      case 'Deposit':
        broadcast.startAuction(data)  
        break;
      }
    }catch(err){
      console.error(`Error broadcasting event: ${type} ${data}`)
    }
  })
  return 'Auction Server Running'
}


run(process.env).then(console.log).catch(console.error)

