import {Server} from 'http'

import WebSocket from 'ws';

export function WsApp(server:Server){
  const wss = new WebSocket.Server({ server });
  // Function to broadcast a message to all connected clients
  function broadcast(data: string): void {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  function startAuction(data:any){
    broadcast(data)
  }
  function endAuction(data:any){
    broadcast(data)
  }

  return {
    startAuction,
    endAuction,
  }
}
