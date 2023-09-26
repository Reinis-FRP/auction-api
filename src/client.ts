import WebSocket from 'ws';

import * as auction from './auction'
import * as ss from 'superstruct'

const DepositReturnData = ss.object({
  type:ss.literal('Deposit'),
  data:ss.object({
    auctionId: ss.string(),
    deposit: auction.DepositStruct,
    bidDeadlineMs: ss.number(),
    expiry: ss.number()
  })
})

export type DepositReturnData = ss.Infer<typeof DepositReturnData>;

const CompleteReturnData = ss.object({
  type:ss.literal('AuctionComplete'),
  data:ss.object({
    auctionId: ss.string(),
  })
})

export type CompleteReturnData = ss.Infer<typeof CompleteReturnData>;
type Config = { 
  baseUrl?:string;
  handleDeposit?:(data:DepositReturnData["data"])=>void;
  handleComplete?:(data:CompleteReturnData["data"])=>void;
  handleError?:(error:Error)=>void;
}
async function postData(url = '', data = {}) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data) 
  });

    // Check if the response is ok (status in the range 200-299)
  if (!response.ok) {
    throw new Error('Network response was not ok. Status: ' + response.status);
  }

  // Try to parse the response body as JSON
  try {
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    return response.text()
  }
}
export function Client(config:Config={}){
  const {baseUrl='http://localhost:2999'} = config
  const ws = new WebSocket(baseUrl);
  ws.on('open',()=>console.log('connected'))
  ws.on('message',(data:WebSocket.Data)=>{
    try{
      const json:unknown = JSON.parse(data.toString())
      if(config.handleComplete && ss.is(json,CompleteReturnData)){
        config.handleComplete(json.data)
      }
      if(config.handleDeposit && ss.is(json,DepositReturnData)){
        config.handleDeposit(json.data)
      }
    }catch(err){
      config.handleError && config.handleError(err as Error)
    }
  })

  async function deposit(params:auction.DepositData){
    return postData([baseUrl,'deposit'].join('/'),params )
  }
  // TODO figure out signing
  async function bid(params:auction.BidData){
    return postData([baseUrl,'bid'].join('/'),params )
  }
  return {deposit,bid}
}
