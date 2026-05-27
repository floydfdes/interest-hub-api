import {
  acceptRequest,
  activities,
  block,
  blocked,
  deleteAccount,
  follow,
  followRequests,
  followers,
  following,
  getMe,
  getProfile,
  mute,
  muted,
  rejectRequest,
  search,
  suggested,
  unblock,
  unmute,
  unfollow,
  updateProfile,
} from "../controllers/userController";

import express from "express";
import authMiddleware from "../middleware/authMiddleware";
import { optionalAuthMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.get("/activities", authMiddleware, activities);
router.get("/suggested", authMiddleware, suggested);
router.get("/blocked", authMiddleware, blocked);
router.get("/muted", authMiddleware, muted);
router.get("/follow-requests", authMiddleware, followRequests);
router.get("/profile/:id", optionalAuthMiddleware, getProfile);
router.patch("/update", authMiddleware, updateProfile);
router.delete("/delete", authMiddleware, deleteAccount);

router.post("/follow/:targetUserId", authMiddleware, follow);
router.post("/unfollow/:targetUserId", authMiddleware, unfollow);
router.post("/follow-requests/:requesterId/accept", authMiddleware, acceptRequest);
router.post("/follow-requests/:requesterId/reject", authMiddleware, rejectRequest);

router.get("/:id/followers", optionalAuthMiddleware, followers);
router.get("/:id/following", optionalAuthMiddleware, following);

router.post("/block/:targetUserId", authMiddleware, block);
router.post("/unblock/:targetUserId", authMiddleware, unblock);
router.post("/mute/:targetUserId", authMiddleware, mute);
router.post("/unmute/:targetUserId", authMiddleware, unmute);

router.get("/search", search);

export default router;
