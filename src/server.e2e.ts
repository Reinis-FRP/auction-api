import test from "tape";
import WebSocket from "ws";
import request from "supertest";
import { Server } from "./server";

// ensure main is running in another process
test("server", (t) => {
  let app;
  t.test("init", async (t) => {
    app = await Server({ bidWaitTimeMs: "1000" }); // Change wait to 1s (defaults to 60s).
    t.end();
  });
  t.test("fail deposit", (t) => {
    request(app)
      .post("/deposit")
      .expect(500)
      .end(() => t.end());
  });
  t.test("success deposit", (t) => {
    request(app)
      .post("/deposit")
      .send({
        recipient: "0x9A8f92a830A5cB89a3816e3D267CB7791c16b04D",
        tokenAddress: "0x9A8f92a830A5cB89a3816e3D267CB7791c16b04D",
        amount: "10000",
        destinationChainId: 10,
        relayerFeePct: "1",
        quoteTimestamp: "1",
        message: "0x",
        maxCount: "1",
        txValue: "1",
      })
      .set("Accept", "application/json")
      .expect("Content-Type", "/json/")
      .expect(200)
      .end(() => t.end());
  });
  t.test("end app", (t) => {
    app.close(t.end);
  });
});
