import {Client } from '../src/client'

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

async function run(){
  const client = Client({
    handleComplete:console.log,
    handleDeposit:console.log,
  })
  const depositResult = await client.deposit(testDeposit)
  console.log({depositResult})
}

run().then(()=>console.log('done')).catch(console.error)
