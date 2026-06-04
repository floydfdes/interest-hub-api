import express from "express";
import { globalSearch } from "../controllers/searchController";
import { optionalAuthMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", optionalAuthMiddleware, globalSearch);

export default router;
