import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  clearAllNotificationsService,
  clearReadNotificationsService,
  deleteNotificationService,
  getNotificationsService,
  getUnreadNotificationCountService,
  markAllNotificationsUnreadService,
  markAllNotificationsReadService,
  markNotificationReadService,
  markNotificationUnreadService,
} from "../services/notificationService";
import { logError } from "../utils/logger";
import { getPagination } from "../utils/pagination";

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    res.status(200).json(await getNotificationsService(req.userId!, getPagination(req.query)));
  } catch (error) {
    logError("Failed to fetch notifications", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

export const getUnreadNotificationCount = async (req: AuthRequest, res: Response) => {
  try {
    res.status(200).json(await getUnreadNotificationCountService(req.userId!));
  } catch (error) {
    logError("Failed to fetch unread notification count", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to fetch unread notification count" });
  }
};

export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  try {
    const notification = await markNotificationReadService(req.userId!, req.params.id);
    if (!notification) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }

    res.status(200).json(notification);
  } catch (error) {
    logError("Failed to mark notification read", error, {
      userId: req.userId,
      notificationId: req.params.id,
    });
    res.status(500).json({ message: "Failed to mark notification read" });
  }
};

export const markNotificationUnread = async (req: AuthRequest, res: Response) => {
  try {
    const notification = await markNotificationUnreadService(req.userId!, req.params.id);
    if (!notification) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }

    res.status(200).json(notification);
  } catch (error) {
    logError("Failed to mark notification unread", error, {
      userId: req.userId,
      notificationId: req.params.id,
    });
    res.status(500).json({ message: "Failed to mark notification unread" });
  }
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response) => {
  try {
    res.status(200).json(await markAllNotificationsReadService(req.userId!));
  } catch (error) {
    logError("Failed to mark notifications read", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to mark notifications read" });
  }
};

export const markAllNotificationsUnread = async (req: AuthRequest, res: Response) => {
  try {
    res.status(200).json(await markAllNotificationsUnreadService(req.userId!));
  } catch (error) {
    logError("Failed to mark notifications unread", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to mark notifications unread" });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const notification = await deleteNotificationService(req.userId!, req.params.id);
    if (!notification) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }

    res.status(200).json({ message: "Notification deleted" });
  } catch (error) {
    logError("Failed to delete notification", error, {
      userId: req.userId,
      notificationId: req.params.id,
    });
    res.status(500).json({ message: "Failed to delete notification" });
  }
};

export const clearReadNotifications = async (req: AuthRequest, res: Response) => {
  try {
    res.status(200).json(await clearReadNotificationsService(req.userId!));
  } catch (error) {
    logError("Failed to clear read notifications", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to clear read notifications" });
  }
};

export const clearAllNotifications = async (req: AuthRequest, res: Response) => {
  try {
    res.status(200).json(await clearAllNotificationsService(req.userId!));
  } catch (error) {
    logError("Failed to clear notifications", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to clear notifications" });
  }
};
