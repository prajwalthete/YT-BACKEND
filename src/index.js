import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({ path: "./env" });

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log(`mongoDB connection Failed !!`, err);
  });

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
