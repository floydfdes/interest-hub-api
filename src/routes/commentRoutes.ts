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

const router = express.Router();

router.post("/", authMiddleware, createCommentValidation, validate, createComment);
router.patch("/:commentId", authMiddleware, commentContentValidation, validate, editComment);
router.delete("/:commentId", authMiddleware, deleteComment);
router.post("/:commentId/like", authMiddleware, likeComment);
router.post("/:commentId/unlike", authMiddleware, unlikeComment);

router.post(
  "/:commentId/reply",
  authMiddleware,
  commentContentValidation,
  validate,
  replyToComment
);
router.patch(
  "/:commentId/reply/:replyIndex",
  authMiddleware,
  commentContentValidation,
  validate,
  editReply
);
router.delete("/:commentId/reply/:replyIndex", authMiddleware, deleteReply);
router.post("/:commentId/reply/:replyIndex/like", authMiddleware, likeReply);
router.post("/:commentId/reply/:replyIndex/unlike", authMiddleware, unlikeReply);

router.post(
  "/:commentId/reply/:parentReplyIndex/reply",
  authMiddleware,
  commentContentValidation,
  validate,
  replyToReply
);

export default router;
