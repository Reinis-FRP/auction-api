import Express from "express";
import * as ss from 'superstruct'
import cors from "cors";
import bodyParser from "body-parser";
import assert from "assert";
import type { Request, Response, NextFunction } from "express";
import * as auction from './auction'

type Config = {
  port:number
}
export function ExpressApp(_auction:auction.Auction) {
  const app = Express();

  app.use(cors());
  app.use(bodyParser.json({ limit: "1mb" }));
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get("/favicon.ico", (req: Request, res: Response) => {
    res.status(404);
  });
  app.post("/deposit", (req: Request, res: Response, next:NextFunction) => {
    try{
      ss.assert(req.body,auction.DepositStruct)
      _auction.deposit(req.body).then(res.json).catch(next)
    }catch(err){
      next(err)
    }
  });
  // TODO: Add bid
  // app.post("/bid", (req: Request, res: Response, next:NextFunction) => {
  //   auction.bid(req.body).then(res.json).catch(next)
  // });

  app.use(function (req: Request, res: Response, next: NextFunction) {
    next(new Error("Invalid Request"));
  });

  app.use(function (err: Error, req: Request, res: Response) {
    res.status(500).send(err.message || err);
  });

  return app;
}

export async function Init(config: Config, auction:auction.Auction) {
  const app = await ExpressApp(auction);
  await new Promise((res) => {
    app.listen(config.port, () => res(app));
  });
  console.log('Listening on ' + config.port)
  return app
}
