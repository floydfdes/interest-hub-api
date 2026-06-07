import { NextFunction, Request, Response } from "express";

import User from "../models/User";
import { verifyToken } from "../utils/token";

interface AuthRequest extends Request {
  userId?: string;
}

const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Authorization header missing or invalid" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token, "access");
    const user = await User.findOne({
      _id: decoded.userId,
      isDeleted: false,
      isBlocked: false,
      isDeactivated: { $ne: true },
    }).select("_id");
    if (!user) {
      res.status(401).json({ message: "Account is inactive or unavailable" });
      return;
    }
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const optionalAuthMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    next();
    return;
  }
  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Authorization header invalid" });
    return;
  }

  try {
    const decoded = verifyToken(authHeader.split(" ")[1], "access");
    User.findOne({
      _id: decoded.userId,
      isDeleted: false,
      isBlocked: false,
      isDeactivated: { $ne: true },
    })
      .select("_id")
      .then((user) => {
        if (!user) {
          res.status(401).json({ message: "Account is inactive or unavailable" });
          return;
        }
        req.userId = decoded.userId;
        next();
      })
      .catch(() => {
        res.status(401).json({ message: "Invalid or expired token" });
      });
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default authMiddleware;
export type { AuthRequest };
