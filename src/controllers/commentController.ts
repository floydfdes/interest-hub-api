import { Request, Response } from "express";
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
    unlikeReplyService
} from "../services/commentService";

import { AuthRequest } from "../middleware/authMiddleware";

export const createComment = async (req: Request, res: Response) => {
    try {
        const { postId, content } = req.body;
        const userId = (req as any).userId;

        const comment = await createCommentService(userId, postId, content);
        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ message: "Failed to create comment" });
    }
};

export const editComment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;
        const userId = req.userId;  // No (any) casting needed

        const comment = await editCommentService(commentId, userId!, content);
        if (!comment) {
            res.status(404).json({ message: "Comment not found or unauthorized" });
            return;
        }

        res.status(200).json(comment);
    } catch (error) {
        res.status(500).json({ message: "Failed to edit comment" });
    }
}

export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { commentId } = req.params;
        const userId = req.userId;  // No (as any) needed

        const comment = await deleteCommentService(commentId, userId!);
        if (!comment) {
            res.status(404).json({ message: "Comment not found or unauthorized" });
            return;
        }

        res.status(200).json({ message: "Comment deleted" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete comment" });
    }
};


export const likeComment = async (req: Request, res: Response) => {
    try {
        const { commentId } = req.params;
        const userId = (req as any).userId;

        const comment = await likeCommentService(commentId, userId);
        res.json(comment);
    } catch (error) {
        res.status(500).json({ message: "Failed to like comment" });
    }
};

export const unlikeComment = async (req: Request, res: Response) => {
    try {
        const { commentId } = req.params;
        const userId = (req as any).userId;

        const comment = await unlikeCommentService(commentId, userId);
        res.json(comment);
    } catch (error) {
        res.status(500).json({ message: "Failed to unlike comment" });
    }
};

export const replyToComment = async (req: Request, res: Response) => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;
        const userId = (req as any).userId;

        const comment = await replyToCommentService(commentId, userId, content);
        res.json(comment);
    } catch (error) {
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
        res.status(500).json({ message: "Failed to delete reply" });
    }
};


export const likeReply = async (req: Request, res: Response) => {
    try {
        const { commentId, replyIndex } = req.params;
        const userId = (req as any).userId;

        const comment = await likeReplyService(commentId, Number(replyIndex), userId);
        res.json(comment);
    } catch (error) {
        res.status(500).json({ message: "Failed to like reply" });
    }
};

export const unlikeReply = async (req: Request, res: Response) => {
    try {
        const { commentId, replyIndex } = req.params;
        const userId = (req as any).userId;

        const comment = await unlikeReplyService(commentId, Number(replyIndex), userId);
        res.json(comment);
    } catch (error) {
        res.status(500).json({ message: "Failed to unlike reply" });
    }
};

export const replyToReply = async (req: Request, res: Response) => {
    try {
        const { commentId, parentReplyIndex } = req.params;
        const { content } = req.body;
        const userId = (req as any).userId;

        const comment = await replyToReplyService(commentId, Number(parentReplyIndex), userId, content);
        res.json(comment);
    } catch (error) {
        res.status(500).json({ message: "Failed to reply to a reply" });
    }
};
