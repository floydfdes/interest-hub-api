import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  createShareService,
  getReceivedSharesService,
  getSentSharesService,
} from "../services/shareService";
import { logError } from "../utils/logger";
import { getPagination } from "../utils/pagination";

export const createShare = async (req: AuthRequest, res: Response) => {
  try {
    const share = await createShareService({
      senderId: req.userId!,
      recipientId: req.body.recipientId,
      targetType: req.body.targetType,
      targetId: req.body.targetId,
      message: req.body.message,
    });

    if (!share) {
      res.status(404).json({ message: "Share target or recipient not found" });
      return;
    }

    res.status(201).json(share);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to share";
    if (
      [
        "Cannot share with yourself",
        "Cannot share with a blocked user",
        "Cannot share with this user",
        "You cannot share this post",
        "Recipient cannot view this post",
        "You cannot share this comment",
        "Recipient cannot view this comment",
      ].includes(message)
    ) {
      res.status(400).json({ message });
      return;
    }

    logError("Failed to create share", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to share" });
  }
};

export const getReceivedShares = async (req: AuthRequest, res: Response) => {
  try {
    res.status(200).json(await getReceivedSharesService(req.userId!, getPagination(req.query)));
  } catch (error) {
    logError("Failed to fetch received shares", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to fetch received shares" });
  }
};

export const getSentShares = async (req: AuthRequest, res: Response) => {
  try {
    res.status(200).json(await getSentSharesService(req.userId!, getPagination(req.query)));
  } catch (error) {
    logError("Failed to fetch sent shares", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to fetch sent shares" });
  }
};
