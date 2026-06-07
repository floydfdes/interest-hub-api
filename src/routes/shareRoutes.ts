import express from "express";
import { createShare, getReceivedShares, getSentShares } from "../controllers/shareController";
import authMiddleware from "../middleware/authMiddleware";
import { shareRateLimiter } from "../middleware/rateLimiters";
import { createShareValidation } from "../middleware/validateShare";
import validate from "../middleware/validate";

const router = express.Router();

router.post("/", authMiddleware, shareRateLimiter, createShareValidation, validate, createShare);
router.get("/received", authMiddleware, getReceivedShares);
router.get("/sent", authMiddleware, getSentShares);

export default router;
