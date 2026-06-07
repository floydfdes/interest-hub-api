import {
  createComment,
  deleteComment,
  deleteReply,
  editComment,
  editReply,
  likeComment,
  likeReply,
  replyToComment,
  replyToReply,
  unlikeComment,
  unlikeReply,
} from "../controllers/commentController";

import express from "express";
import authMiddleware from "../middleware/authMiddleware";
import validate from "../middleware/validate";
import { commentContentValidation, createCommentValidation } from "../middleware/validateComment";
import { commentRateLimiter, socialActionRateLimiter } from "../middleware/rateLimiters";

const router = express.Router();

router.post("/", authMiddleware, commentRateLimiter, createCommentValidation, validate, createComment);
router.patch("/:commentId", authMiddleware, commentRateLimiter, commentContentValidation, validate, editComment);
router.delete("/:commentId", authMiddleware, deleteComment);
router.post("/:commentId/like", authMiddleware, socialActionRateLimiter, likeComment);
router.post("/:commentId/unlike", authMiddleware, socialActionRateLimiter, unlikeComment);

router.post(
  "/:commentId/reply",
  authMiddleware,
  commentRateLimiter,
  commentContentValidation,
  validate,
  replyToComment
);
router.patch(
  "/:commentId/reply/:replyIndex",
  authMiddleware,
  commentRateLimiter,
  commentContentValidation,
  validate,
  editReply
);
router.delete("/:commentId/reply/:replyIndex", authMiddleware, deleteReply);
router.post("/:commentId/reply/:replyIndex/like", authMiddleware, socialActionRateLimiter, likeReply);
router.post("/:commentId/reply/:replyIndex/unlike", authMiddleware, socialActionRateLimiter, unlikeReply);

router.post(
  "/:commentId/reply/:parentReplyIndex/reply",
  authMiddleware,
  commentRateLimiter,
  commentContentValidation,
  validate,
  replyToReply
);

export default router;
