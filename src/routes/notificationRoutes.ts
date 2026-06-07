import express from "express";
import {
  clearAllNotifications,
  clearReadNotifications,
  deleteNotification,
  getNotificationPreferences,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markAllNotificationsUnread,
  markNotificationRead,
  markNotificationUnread,
  updateNotificationPreferences,
} from "../controllers/notificationController";
import authMiddleware from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", authMiddleware, getNotifications);
router.get("/unread-count", authMiddleware, getUnreadNotificationCount);
router.get("/preferences", authMiddleware, getNotificationPreferences);
router.patch("/preferences", authMiddleware, updateNotificationPreferences);
router.patch("/read-all", authMiddleware, markAllNotificationsRead);
router.patch("/unread-all", authMiddleware, markAllNotificationsUnread);
router.delete("/read", authMiddleware, clearReadNotifications);
router.delete("/", authMiddleware, clearAllNotifications);
router.patch("/:id/read", authMiddleware, markNotificationRead);
router.patch("/:id/unread", authMiddleware, markNotificationUnread);
router.delete("/:id", authMiddleware, deleteNotification);

export default router;
