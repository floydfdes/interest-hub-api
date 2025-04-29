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
    unlikeReply
} from "../controllers/commentController";

import express from "express";
import authMiddleware from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", authMiddleware, createComment);
router.patch("/:commentId", authMiddleware, editComment);
router.delete("/:commentId", authMiddleware, deleteComment);
router.post("/:commentId/like", authMiddleware, likeComment);
router.post("/:commentId/unlike", authMiddleware, unlikeComment);

router.post("/:commentId/reply", authMiddleware, replyToComment);
router.patch("/:commentId/reply/:replyIndex", authMiddleware, editReply);
router.delete("/:commentId/reply/:replyIndex", authMiddleware, deleteReply);
router.post("/:commentId/reply/:replyIndex/like", authMiddleware, likeReply);
router.post("/:commentId/reply/:replyIndex/unlike", authMiddleware, unlikeReply);

router.post("/:commentId/reply/:parentReplyIndex/reply", authMiddleware, replyToReply);

export default router;
