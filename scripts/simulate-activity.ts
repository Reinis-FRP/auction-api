import assert from 'assert'
import * as dotenv from 'dotenv'
import {Client } from '../src/client'
dotenv.config()


const testDeposit = {
  "recipient": "0x9A8f92a830A5cB89a3816e3D267CB7791c16b04D",
  "tokenAddress": "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
  "relayerFeePct": "1",
  "amount": "10000000000000000",
  "destinationChainId": 421613,
  "quoteTimestamp": "1695742882",
  "message": "0x",
  "maxCount": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
  "txValue": "0"
}
const testBid = {
  "auctionId":"0x1231597c",
  "relayerAddress":"0x9A8f92a830A5cB89a3816e3D267CB7791c16b04D",
  "signature":"0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
}

async function run(){
  const privateKey = process.env.privateKey
  assert(privateKey,'requires privateKey env')
  const client = Client({
    handleDeposit:(data=>{
      client.bid(privateKey,{auctionId:data.auctionId,expiry:data.expiry, chainId:data.deposit.destinationChainId}).then(console.log)
    }),
    handleBid:console.log,
    handleComplete:console.log,
  })
  const depositResult = await client.deposit(testDeposit)
}

run().then(()=>console.log('done')).catch(console.error)
