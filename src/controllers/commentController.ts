import { Response } from "express";
import {
  createCommentService,
  deleteCommentService,
  deleteReplyService,
  editCommentService,
  editReplyService,
  likeCommentService,
  likeReplyService,
  replyToCommentService,
  replyToReplyService,
  unlikeCommentService,
  unlikeReplyService,
} from "../services/commentService";

import { AuthRequest } from "../middleware/authMiddleware";
import { logError } from "../utils/logger";

export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const { postId, content } = req.body;
    const userId = req.userId!;

    const comment = await createCommentService(userId, postId, content);
    res.status(201).json(comment);
  } catch (error) {
    logError("Failed to create comment", error, { postId: req.body.postId, userId: req.userId });
    res.status(500).json({ message: "Failed to create comment" });
  }
};

export const editComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.userId!;

    const comment = await editCommentService(commentId, userId, content);
    if (!comment) {
      res.status(404).json({ message: "Comment not found or unauthorized" });
      return;
    }

    res.status(200).json(comment);
  } catch (error) {
    logError("Failed to edit comment", error, {
      commentId: req.params.commentId,
      userId: req.userId,
    });
    res.status(500).json({ message: "Failed to edit comment" });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commentId } = req.params;
    const userId = req.userId!;

    const comment = await deleteCommentService(commentId, userId);
    if (!comment) {
      res.status(404).json({ message: "Comment not found or unauthorized" });
      return;
    }

    res.status(200).json({ message: "Comment deleted" });
  } catch (error) {
    logError("Failed to delete comment", error, {
      commentId: req.params.commentId,
      userId: req.userId,
    });
    res.status(500).json({ message: "Failed to delete comment" });
  }
};

export const likeComment = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId!;

    const comment = await likeCommentService(commentId, userId);
    res.json(comment);
  } catch (error) {
    logError("Failed to like comment", error, {
      commentId: req.params.commentId,
      userId: req.userId,
    });
    res.status(500).json({ message: "Failed to like comment" });
  }
};

export const unlikeComment = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId!;

    const comment = await unlikeCommentService(commentId, userId);
    res.json(comment);
  } catch (error) {
    logError("Failed to unlike comment", error, {
      commentId: req.params.commentId,
      userId: req.userId,
    });
    res.status(500).json({ message: "Failed to unlike comment" });
  }
};

export const replyToComment = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.userId!;

    const comment = await replyToCommentService(commentId, userId, content);
    res.json(comment);
  } catch (error) {
    logError("Failed to reply to comment", error, {
      commentId: req.params.commentId,
      userId: req.userId,
    });
    res.status(500).json({ message: "Failed to reply to comment" });
  }
};

export const editReply = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commentId, replyIndex } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    const comment = await editReplyService(commentId, Number(replyIndex), userId!, content);
    if (!comment) {
      res.status(404).json({ message: "Reply not found or unauthorized" });
      return;
    }

    res.status(200).json(comment);
  } catch (error) {
    logError("Failed to edit reply", error, {
      commentId: req.params.commentId,
      replyIndex: req.params.replyIndex,
      userId: req.userId,
    });
    res.status(500).json({ message: "Failed to edit reply" });
  }
};

export const deleteReply = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commentId, replyIndex } = req.params;
    const userId = req.userId;

    const comment = await deleteReplyService(commentId, Number(replyIndex), userId!);
    if (!comment) {
      res.status(404).json({ message: "Reply not found or unauthorized" });
      return;
    }

    res.status(200).json({ message: "Reply deleted" });
  } catch (error) {
    logError("Failed to delete reply", error, {
      commentId: req.params.commentId,
      replyIndex: req.params.replyIndex,
      userId: req.userId,
    });
    res.status(500).json({ message: "Failed to delete reply" });
  }
};

export const likeReply = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId, replyIndex } = req.params;
    const userId = req.userId!;

    const comment = await likeReplyService(commentId, Number(replyIndex), userId);
    res.json(comment);
  } catch (error) {
    logError("Failed to like reply", error, {
      commentId: req.params.commentId,
      replyIndex: req.params.replyIndex,
      userId: req.userId,
    });
    res.status(500).json({ message: "Failed to like reply" });
  }
};

export const unlikeReply = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId, replyIndex } = req.params;
    const userId = req.userId!;

    const comment = await unlikeReplyService(commentId, Number(replyIndex), userId);
    res.json(comment);
  } catch (error) {
    logError("Failed to unlike reply", error, {
      commentId: req.params.commentId,
      replyIndex: req.params.replyIndex,
      userId: req.userId,
    });
    res.status(500).json({ message: "Failed to unlike reply" });
  }
};

export const replyToReply = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId, parentReplyIndex } = req.params;
    const { content } = req.body;
    const userId = req.userId!;

    const comment = await replyToReplyService(commentId, Number(parentReplyIndex), userId, content);
    res.json(comment);
  } catch (error) {
    logError("Failed to reply to reply", error, {
      commentId: req.params.commentId,
      parentReplyIndex: req.params.parentReplyIndex,
      userId: req.userId,
    });
    res.status(500).json({ message: "Failed to reply to a reply" });
  }
};
