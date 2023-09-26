import WebSocket from 'ws';
import assert from 'assert'
import { Wallet} from 'ethers'

import * as auction from './auction'
import * as ss from 'superstruct'

const DepositReturnData = ss.object({
  recipient: ss.string(),
  relayerFeePct: ss.string(),
  message: ss.string(),
})
export type DepositReturnData = ss.Infer<typeof DepositReturnData>;

const DepositEventData = ss.object({
  type:ss.literal('Deposit'),
  data:ss.object({
    auctionId: ss.string(),
    deposit: auction.DepositStruct,
    bidDeadlineMs: ss.number(),
    expiry: ss.number(),
  })
})

export type DepositEventData = ss.Infer<typeof DepositEventData>;

const CompleteEventData = ss.object({
  type:ss.literal('AuctionComplete'),
  data:ss.object({
    auctionId: ss.string(),
  })
})

export type CompleteEventData = ss.Infer<typeof CompleteEventData>;

const BidEventData = ss.object({
  type:ss.literal('Bid'),
  data:ss.object({
    auctionId: ss.string(),
    relayerAddress: ss.string(),
    bidTimeMs: ss.number(),
  }),
})
export type Config = { 
  baseUrl?:string;
  handleDeposit?:(data:DepositEventData["data"])=>void;
  handleComplete?:(data:CompleteEventData["data"])=>void;
  handleBid?:(data:CompleteEventData["data"])=>void;
  handleError?:(error:Error)=>void;
}
// something is wrong wiht this signer
export async function signMessage(params:{expiry:number,auctionId:string, chainId:number}, wallet:Wallet) {
  const baseDomain = {
    name: "RelayerCartel",
    version: "0",
    chainId: 1, // Will be overriden with actual target chainId.
  };
  const signatureTypes = {
    auction: [
      { name: "id", type: "uint32" },
      { name: "expiry", type: "uint32" },
    ],
  };

  const domain = { ...baseDomain, chainId: params.chainId }; // Replace with destination chain
  const signedAuctionData = {id: Number(params.auctionId), expiry:params.expiry}; // Replace `auctionId` and `expiry`
  return wallet._signTypedData(domain, signatureTypes, signedAuctionData);
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
    // console.log(error)
    return undefined
  }
}
export function Client(config:Config={}){
  const {baseUrl='http://localhost:2999'} = config
  const ws = new WebSocket(baseUrl);
  ws.on('open',()=>console.log('connected'))
  ws.on('message',(data:WebSocket.Data)=>{
    try{
      const json:unknown = JSON.parse(data.toString())
      if(config.handleComplete && ss.is(json,CompleteEventData)){
        config.handleComplete(json.data)
      }else if(config.handleDeposit && ss.is(json,DepositEventData)){
        config.handleDeposit(json.data)
      }else if(config.handleBid && ss.is(json,BidEventData)){
        config.handleBid(json.data)
      }else {
        console.log('unknown ws event:',json)
      }
    }catch(err){
      config.handleError && config.handleError(err as Error)
    }
  })

  async function deposit(params:auction.DepositData){
    return ss.create(await postData([baseUrl,'deposit'].join('/'),params ),DepositReturnData)
  }
  async function bid(privateKey:string, params:{expiry:number,auctionId:string, chainId:number}){
    const wallet = new Wallet(privateKey)
    const signature = await signMessage(params,wallet)
    return postData([baseUrl,'bid'].join('/'),{auctionId:params.auctionId,relayerAddress:wallet.address,signature} )
  }
  return {deposit,bid}
}
