import WebSocket from 'ws';

// Connect to the WebSocket server on port 2999
const ws = new WebSocket('ws://localhost:2999');

// Listen for open events (when the connection is established)
ws.on('open', () => {
  console.log('Connected to the server');
});

// Listen for message events (when a message is received from the server)
ws.on('message', (data: WebSocket.Data) => {
  console.log(`Message from server: ${data}`);
});

// Listen for error events
ws.on('error', (error: Error) => {
  console.error(`Error: ${error.message}`);
});

// Listen for close events
ws.on('close', (code: number, reason: string) => {
  console.log(`Connection closed, code: ${code}, reason: ${reason}`);
});
