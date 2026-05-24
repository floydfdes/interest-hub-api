import { NextFunction, Response } from "express";
import { AuthRequest } from "./authMiddleware";
import User from "../models/User";
import { logError } from "../utils/logger";

const adminMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const user = await User.findOne({
      _id: req.userId,
      isDeleted: false,
      isBlocked: false,
    }).select("role");

    if (!user || user.role !== "admin") {
      res.status(403).json({ message: "Admin access required" });
      return;
    }

    next();
  } catch (error) {
    logError("Failed to verify admin access", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to verify admin access" });
  }
};

export default adminMiddleware;
