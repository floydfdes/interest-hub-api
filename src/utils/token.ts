import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/env";

type TokenType = "access" | "refresh";
type TokenPayload = { userId: string; type: TokenType };

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId, type: "access" }, getJwtSecret(), {
    expiresIn: "7d",
  });
};

export const verifyToken = (token: string, expectedType: TokenType): TokenPayload => {
  const decoded = jwt.verify(token, getJwtSecret()) as TokenPayload;

  if (decoded.type !== expectedType) {
    throw new Error("Invalid token type");
  }

  return decoded;
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId, type: "refresh" }, getJwtSecret(), {
    expiresIn: "30d",
  });
};

export const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};
