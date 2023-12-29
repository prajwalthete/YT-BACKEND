import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

// Function to connect to the MongoDB database
const connectDB = async () => {
  try {
    // Attempt to establish a connection to MongoDB using the provided URI and database name
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`,
      { writeConcern: { w: "majority" } }
    );

    // Log a success message along with the host information upon successful connection
    console.log(
      `\n MongoDB Connected..!! DB HOST ${connectionInstance.connection.host}`
    );
  } catch (error) {
    // Log an error message if the connection attempt fails, and exit the process with an error code
    console.log(`MongoDB Connection Failed: ${error}`);
    process.exit(1);
  }
};

export default connectDB;
