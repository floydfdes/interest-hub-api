import express from "express";
import { createReport, getMyReports } from "../controllers/reportController";
import authMiddleware from "../middleware/authMiddleware";
import { reportRateLimiter } from "../middleware/rateLimiters";
import validate from "../middleware/validate";
import { createReportValidation } from "../middleware/validateReport";

const router = express.Router();

router.post("/", authMiddleware, reportRateLimiter, createReportValidation, validate, createReport);
router.get("/me", authMiddleware, getMyReports);

export default router;
