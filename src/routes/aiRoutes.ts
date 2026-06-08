import express from "express";
import {
  expandSearchQuery,
  improvePost,
  moderateContent,
  suggestPost,
  summarizeReport,
} from "../controllers/aiController";
import authMiddleware from "../middleware/authMiddleware";
import {
  aiImprovePostValidation,
  aiModerationValidation,
  aiReportSummaryValidation,
  aiSearchQueryValidation,
  aiSuggestPostValidation,
} from "../middleware/validateAi";
import validate from "../middleware/validate";
import { aiRateLimiter } from "../middleware/rateLimiters";

const router = express.Router();

router.post("/moderate-content", authMiddleware, aiRateLimiter, aiModerationValidation, validate, moderateContent);
router.post("/suggest-post", authMiddleware, aiRateLimiter, aiSuggestPostValidation, validate, suggestPost);
router.post("/improve-post", authMiddleware, aiRateLimiter, aiImprovePostValidation, validate, improvePost);
router.post("/report-summary", authMiddleware, aiRateLimiter, aiReportSummaryValidation, validate, summarizeReport);
router.post("/search-query", authMiddleware, aiRateLimiter, aiSearchQueryValidation, validate, expandSearchQuery);

export default router;
