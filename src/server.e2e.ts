import test from 'tape';
import WebSocket from 'ws';
import request from "supertest";
import {Server} from './server'

// ensure main is running in another process
test("server", (t) => {
  let app
  t.test('init',async t=>{
    app = await Server()
    t.end()
  })
  t.test("fail deposit", (t) => {
    request(app)
      .post("/deposit")
      .expect(500)
      .end(()=>t.end())
  });
  t.test("success deposit", (t) => {
    request(app)
      .post("/deposit")
      .send({
        recipient:'test',
        tokenAddress:'test',
        amount:'10000',
        destinationChainId:10,
        relayerFeePct:'1',
        quoteTimeStamp:1,
        message:'',
        maxCount:1,
        txValue:1,
      })
      .set('Accept','application/json')
      .expect('Content-Type','/json/')
      .expect(200)
      .end(()=>t.end())
  });
  t.test('end app',t=>{
    app.close(t.end)
  })
});
