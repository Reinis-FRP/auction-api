import * as dotenv from 'dotenv'

import {Server} from './server'

dotenv.config()

Server(process.env)
  .then(()=>console.log("Auction Server Running"))
  .catch(console.error)

