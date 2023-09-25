import Express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import assert from "assert";
import type { Request, Response, NextFunction } from "express";

type Config = {
  port:number
}
type Auction = any

export function ExpressApp(auction:Auction) {
  const app = Express();

  app.use(cors());
  app.use(bodyParser.json({ limit: "1mb" }));
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get("/favicon.ico", (req: Request, res: Response) => {
    res.status(404);
  });
  app.post("/deposit", (req: Request, res: Response, next:NextFunction) => {
    auction.deposit(req.body).then(res.json).catch(next)
  });
  app.post("/bid", (req: Request, res: Response, next:NextFunction) => {
    auction.bid(req.body).then(res.json).catch(next)
  });

  app.use(function (req: Request, res: Response, next: NextFunction) {
    next(new Error("Invalid Request"));
  });

  app.use(function (err: Error, req: Request, res: Response) {
    res.status(500).send(err.message || err);
  });

  return app;
}

export async function Init(config: Config, auction:Auction) {
  const app = await ExpressApp(auction);
  await new Promise((res) => {
    app.listen(config.port, () => res(app));
  });
  console.log('Listening on ' + config.port)
  return app
}
