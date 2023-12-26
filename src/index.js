// require('dotenv').config({path:"./env"})

import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({ path: "./env" });

connectDB();

/* 

import { Express } from "express";
const app = express();

(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("ERROR", (err) => console.error(err));
    throw err;

    app.listen(process.env.PORT, () =>
      console.log(`listening on port${process.env.PORT}`)
    );
  } catch (error) {
    console.error("ERROR : ", error);
    throw Error;
  }
})();

*/
//MONGODB_URI = mongosh "mongodb+srv://cluster0.mnav6t4.mongodb.net/" --apiVersion 1 --username prajwalthete
