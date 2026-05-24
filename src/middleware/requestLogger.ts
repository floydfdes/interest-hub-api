import { NextFunction, Request, Response } from "express";
import logger from "../utils/logger";

interface UserRequest extends Request {
  userId?: string;
}

const redactedKeys = new Set([
  "authorization",
  "currentPassword",
  "image",
  "newPassword",
  "otp",
  "password",
  "profilePic",
  "refreshToken",
  "resetToken",
  "token",
]);
const maxStoredLength = 4000;
const maxSanitizeDepth = 8;

const sanitize = (value: unknown, seen = new WeakSet<object>(), depth = 0): unknown => {
  if (!value || typeof value !== "object") return value;
  if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`;
  if (value instanceof Date) return value.toISOString();
  if ("toJSON" in value && typeof value.toJSON === "function") {
    try {
      const jsonValue = value.toJSON();
      if (jsonValue !== value) {
        return sanitize(jsonValue, seen, depth);
      }
    } catch {
      return "[Unserializable]";
    }
  }
  if (seen.has(value)) return "[Circular]";
  if (depth >= maxSanitizeDepth) return "[Max Depth]";

  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((entry) => sanitize(entry, seen, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      redactedKeys.has(key) ? "[REDACTED]" : sanitize(nestedValue, seen, depth + 1),
    ])
  );
};

const toStoredString = (value: unknown): string => {
  let output: string;

  try {
    output = typeof value === "string" ? value : JSON.stringify(sanitize(value));
  } catch {
    output = "[Unserializable]";
  }

  return output.length > maxStoredLength
    ? `${output.slice(0, maxStoredLength)}...[TRUNCATED]`
    : output;
};

const requestLogger = (req: UserRequest, res: Response, next: NextFunction): void => {
  const startedAt = Date.now();
  let responseBody: unknown;
  let responseCapturedByJson = false;
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = ((body: unknown) => {
    responseCapturedByJson = true;
    responseBody = body;
    return originalJson(body);
  }) as Response["json"];

  res.send = ((body: unknown) => {
    if (!responseCapturedByJson) {
      responseBody = body;
    }
    return originalSend(body);
  }) as Response["send"];

  res.on("finish", () => {
    const requestBody =
      req.body && Object.keys(req.body as Record<string, unknown>).length > 0
        ? ` body=${toStoredString(req.body)}`
        : "";

    logger.http("HTTP request", {
      userId: req.userId,
      request: `${req.method} ${req.originalUrl}${requestBody}`,
      response: toStoredString(responseBody ?? ""),
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      method: req.method,
      path: req.path,
    });
  });

  next();
};

export default requestLogger;
