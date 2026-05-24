import mongoose from "mongoose";
import winston from "winston";
import Transport from "winston-transport";
import Log from "../models/Log";

const logLevel = process.env.LOG_LEVEL || "http";
const isTestEnvironment = process.env.NODE_ENV === "test";

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`)
);

export class MongoLogTransport extends Transport {
  log(info: winston.Logform.TransformableInfo, callback: () => void): void {
    setImmediate(() => this.emit("logged", info));

    if (mongoose.connection.readyState === 1) {
      const metadata = Object.fromEntries(
        Object.entries(info).filter(([key]) => key !== "level" && key !== "message")
      );
      void Log.create({
        level: info.level,
        message: String(info.message),
        metadata,
      }).catch(() => {
        // A log persistence failure must not interrupt an API request.
      });
    }

    callback();
  }
}

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

if (!isTestEnvironment) {
  transports.push(new MongoLogTransport());
}

const logger = winston.createLogger({
  level: logLevel,
  transports,
});

export const logError = (
  message: string,
  error: unknown,
  metadata: Record<string, unknown> = {}
): void => {
  logger.error(message, {
    ...metadata,
    error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
  });
};

export default logger;
