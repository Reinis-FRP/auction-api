import http from 'http'
import Events from 'events'

import * as express from './express'
import * as ws from './ws'
import * as auction from './auction'

// This retrns the express server so we can hook and test it using supertest
export async function Server(env?:NodeJS.ProcessEnv){
  const port = Number(env?.port ?? 2999)
  const bidWaitTimeMs = Number(env?.bidWaitTimeMs ?? 60*1000)

  const events = new Events()
  const _auction = new auction.Auction({bidWaitTimeMs},(type,data)=>events.emit('message',type,data))
  const app = express.ExpressApp(_auction)
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
  await new Promise((res) => {
    server.listen(port, () => res(app));
  });
  console.log('Listening on ' + port)
  return server
}


