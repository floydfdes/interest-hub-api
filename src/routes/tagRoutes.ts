import express from "express";
import { getPostsByTag, getTagSuggestions, getTrendingTags } from "../controllers/tagController";
import { optionalAuthMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/suggestions", optionalAuthMiddleware, getTagSuggestions);
router.get("/trending", optionalAuthMiddleware, getTrendingTags);
router.get("/:tag/posts", optionalAuthMiddleware, getPostsByTag);

export default router;
