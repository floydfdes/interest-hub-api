import {
  acceptRequest,
  activities,
  block,
  blocked,
  deactivateAccount,
  deleteAccount,
  follow,
  followRequests,
  followers,
  following,
  getMe,
  getProfile,
  mute,
  muted,
  profilePosts,
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
import { socialActionRateLimiter } from "../middleware/rateLimiters";

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.get("/activities", authMiddleware, activities);
router.get("/suggested", authMiddleware, suggested);
router.get("/blocked", authMiddleware, blocked);
router.get("/muted", authMiddleware, muted);
router.get("/follow-requests", authMiddleware, followRequests);
router.get("/profile/:id", optionalAuthMiddleware, getProfile);
router.get("/:id/posts", optionalAuthMiddleware, profilePosts);
router.patch("/update", authMiddleware, updateProfile);
router.patch("/deactivate", authMiddleware, deactivateAccount);
router.delete("/delete", authMiddleware, deleteAccount);

router.post("/follow/:targetUserId", authMiddleware, socialActionRateLimiter, follow);
router.post("/unfollow/:targetUserId", authMiddleware, socialActionRateLimiter, unfollow);
router.post(
  "/follow-requests/:requesterId/accept",
  authMiddleware,
  socialActionRateLimiter,
  acceptRequest
);
router.post(
  "/follow-requests/:requesterId/reject",
  authMiddleware,
  socialActionRateLimiter,
  rejectRequest
);

router.get("/:id/followers", optionalAuthMiddleware, followers);
router.get("/:id/following", optionalAuthMiddleware, following);

router.post("/block/:targetUserId", authMiddleware, socialActionRateLimiter, block);
router.post("/unblock/:targetUserId", authMiddleware, socialActionRateLimiter, unblock);
router.post("/mute/:targetUserId", authMiddleware, socialActionRateLimiter, mute);
router.post("/unmute/:targetUserId", authMiddleware, socialActionRateLimiter, unmute);

router.get("/search", search);

export default router;
