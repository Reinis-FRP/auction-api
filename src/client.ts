import * as auction from './auction'

type Config = { 
  baseUrl?:string;
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
    console.log(error)
    return response.text()
  }
}
export function Client(config:Config={}){
  const {baseUrl='http://localhost:2999'} = config

  async function deposit(params:auction.DepositData){
    return postData([baseUrl,'deposit'].join('/'),params )
  }
  async function bid(params:auction.BidData){
    return postData([baseUrl,'bid'].join('/'),params )
  }
  return {deposit,bid}
}
