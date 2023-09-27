import http from "http";
import Events from "events";

import * as express from "./express";
import * as ws from "./ws";
import * as auction from "./auction";

// This retrns the express server so we can hook and test it using supertest
export async function Server(env?: NodeJS.ProcessEnv) {
  const port = Number(env?.port ?? 2999);
  const bidWaitTimeMs = Number(env?.bidWaitTimeMs ?? 60 * 1000); // Default to 60s (in ms).
  const winnerPermissionTime = Number(env?.winnerPermissionTime ?? 60 * 5); // Default to 5m (in s).

  const events = new Events();

  const emitter: auction.EventEmitter = {
    deposit: (data) => events.emit("message", "Deposit", data),
    bid: (data) => events.emit("message", "Bid", data),
    complete: (data) => events.emit("message", "AuctionComplete", data),
  };

  const _auction = new auction.Auction({ bidWaitTimeMs, winnerPermissionTime }, emitter);
  const app = express.ExpressApp(_auction);
  const server = http.createServer(app);
  const broadcast = ws.WsApp(server);

  // listen to events from auction and broadcast to websocket
  events.on("message", (type, data) => {
    console.log(type, data);
    try {
      const broadcastData = JSON.stringify({ type, data });
      switch (type) {
        case "Deposit":
          broadcast.startAuction(broadcastData);
          break;
        case "Bid":
          broadcast.submitBid(broadcastData);
          break;
        case "AuctionComplete":
          broadcast.endAuction(broadcastData);
          break;
      }
    } catch (err) {
      console.error(`Error broadcasting event: ${type} ${data}`);
    }
  });
  await new Promise((res) => {
    server.listen(port, () => res(app));
  });
  console.log("Listening on " + port);
  return server;
}
