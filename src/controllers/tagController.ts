import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  getPostsByTagService,
  getTagSuggestionsService,
  getTrendingTagsService,
} from "../services/tagService";
import { logError } from "../utils/logger";
import { getPagination } from "../utils/pagination";

const getLimit = (value: unknown, defaultLimit = 10) => {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 50) : defaultLimit;
};

export const getTagSuggestions = async (req: AuthRequest, res: Response) => {
  const query = typeof req.query.query === "string" ? req.query.query : "";

  try {
    res.status(200).json(await getTagSuggestionsService(query, getLimit(req.query.limit)));
  } catch (error) {
    logError("Failed to fetch tag suggestions", error, { query });
    res.status(500).json({ message: "Failed to fetch tag suggestions" });
  }
};

export const getTrendingTags = async (req: AuthRequest, res: Response) => {
  try {
    res.status(200).json(await getTrendingTagsService(getLimit(req.query.limit, 20)));
  } catch (error) {
    logError("Failed to fetch trending tags", error);
    res.status(500).json({ message: "Failed to fetch trending tags" });
  }
};

export const getPostsByTag = async (req: AuthRequest, res: Response) => {
  try {
    res
      .status(200)
      .json(await getPostsByTagService(req.params.tag, getPagination(req.query), req.userId));
  } catch (error) {
    logError("Failed to fetch posts by tag", error, {
      tag: req.params.tag,
      userId: req.userId,
    });
    res.status(500).json({ message: "Failed to fetch posts by tag" });
  }
};
