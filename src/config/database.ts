import logger from "../utils/logger";
import mongoose from "mongoose";

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI must be configured");
  }

  const conn = await mongoose.connect(uri);
  logger.info(`MongoDB connected: ${conn.connection.host}`);
  return conn;
};

export default connectDB;
