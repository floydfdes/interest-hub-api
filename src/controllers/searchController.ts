import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { globalSearchService } from "../services/searchService";
import { logError } from "../utils/logger";

const getLimit = (value: unknown, defaultLimit = 5) => {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 20) : defaultLimit;
};

export const globalSearch = async (req: AuthRequest, res: Response) => {
  const query = typeof req.query.query === "string" ? req.query.query : req.query.q;
  if (typeof query !== "string" || query.trim().length < 2) {
    res.status(400).json({ message: "Search query must contain at least 2 characters" });
    return;
  }

  try {
    res.status(200).json(await globalSearchService(query, req.userId, getLimit(req.query.limit)));
  } catch (error) {
    logError("Global search failed", error, { query, userId: req.userId });
    res.status(500).json({ message: "Search failed" });
  }
};
