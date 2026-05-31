import "./config/loadEnv";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";

import rateLimit from "express-rate-limit";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import connectDB from "./config/database";
import swaggerDocument from "./docs/swagger.json";
import errorHandler from "./middleware/errorHandler";
import requestLogger from "./middleware/requestLogger";
import adminRoutes from "./routes/adminRoutes";
import authRoutes from "./routes/authRoutes";
import commentRoutes from "./routes/commentRoutes";
import contactRoutes from "./routes/contactRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import postRoutes from "./routes/postRoutes";
import reportRoutes from "./routes/reportRoutes";
import tagRoutes from "./routes/tagRoutes";
import userRoutes from "./routes/userRoutes";
import logger, { logError } from "./utils/logger";

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:4300")
  .split(",")
  .map((origin) => origin.trim());

const app = express();
const PORT = process.env.PORT || 4300;

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(requestLogger);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests, please try again later.",
  })
);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/contact", contactRoutes);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV || "dev" });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use((_req, _res, next) => {
  const err = new Error("Not Found");
  next(err);
});

app.use(errorHandler);

export default app;

if (require.main === module) {
  void connectDB()
    .then(() => {
      app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      logError("MongoDB connection error", error);
      process.exitCode = 1;
    });
}
