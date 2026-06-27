import { Types } from "mongoose";
import Notification, { NotificationType } from "../models/Notification";
import User from "../models/User";
import { paginatedResponse, PaginationParams } from "../utils/pagination";

interface CreateNotificationInput {
  recipientId: string | Types.ObjectId;
  actorId?: string | Types.ObjectId;
  type: NotificationType;
  postId?: string | Types.ObjectId;
  commentId?: string | Types.ObjectId;
  targetUserId?: string | Types.ObjectId;
  message: string;
}

const toObjectId = (id: string | Types.ObjectId): Types.ObjectId =>
  id instanceof Types.ObjectId ? id : new Types.ObjectId(id);

const notificationPreferenceByType: Record<NotificationType, string> = {
  post_liked: "likes",
  user_followed: "follows",
  follow_request_received: "followRequests",
  follow_request_accepted: "followRequests",
  comment_created: "comments",
  reply_created: "replies",
  post_under_review: "moderation",
  post_shared: "shares",
  profile_shared: "shares",
  comment_shared: "shares",
  user_mentioned: "mentions",
};

const canReceiveNotification = async (recipientId: string | Types.ObjectId, type: NotificationType) => {
  const user = await User.findOne({ _id: recipientId, isDeleted: false }).select("notificationPreferences");
  if (!user) return false;

  const preferenceKey = notificationPreferenceByType[type];
  const preferences = user.notificationPreferences as Record<string, boolean> | undefined;
  return preferences?.[preferenceKey] !== false;
};

export const createNotification = async ({
  recipientId,
  actorId,
  type,
  postId,
  commentId,
  targetUserId,
  message,
}: CreateNotificationInput) => {
  if (actorId && toObjectId(recipientId).equals(toObjectId(actorId))) return null;
  if (!(await canReceiveNotification(recipientId, type))) return null;

  return Notification.create({
    recipient: toObjectId(recipientId),
    ...(actorId && { actor: toObjectId(actorId) }),
    type,
    ...(postId && { post: toObjectId(postId) }),
    ...(commentId && { comment: toObjectId(commentId) }),
    ...(targetUserId && { targetUser: toObjectId(targetUserId) }),
    message,
  });
};

export const getNotificationPreferencesService = async (userId: string) => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).select("notificationPreferences");
  return user?.notificationPreferences ?? null;
};

export const getEmailPreferencesService = async (userId: string) => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).select("emailPreferences");
  return user ? (user.emailPreferences ?? { enabled: true }) : null;
};

export const updateNotificationPreferencesService = async (userId: string, preferences: Record<string, unknown>) => {
  const allowedKeys = ["likes", "comments", "replies", "follows", "followRequests", "mentions", "shares", "moderation"];
  const updates = Object.fromEntries(
    allowedKeys
      .filter((key) => typeof preferences[key] === "boolean")
      .map((key) => [`notificationPreferences.${key}`, preferences[key]])
  );

  if (Object.keys(updates).length === 0) {
    throw new Error("Provide at least one notification preference");
  }

  const user = await User.findOneAndUpdate({ _id: userId, isDeleted: false }, { $set: updates }, { new: true }).select(
    "notificationPreferences"
  );

  return user?.notificationPreferences ?? null;
};

export const updateEmailPreferencesService = async (userId: string, preferences: Record<string, unknown>) => {
  if (typeof preferences.enabled !== "boolean") {
    throw new Error("Provide enabled as a boolean");
  }

  const user = await User.findOneAndUpdate(
    { _id: userId, isDeleted: false },
    { $set: { "emailPreferences.enabled": preferences.enabled } },
    { new: true }
  ).select("emailPreferences");

  return user ? (user.emailPreferences ?? { enabled: true }) : null;
};

export const getNotificationsService = async (userId: string, pagination: PaginationParams) => {
  const filter = { recipient: userId };
  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("actor", "name username profilePic")
      .populate("post", "title image")
      .populate("comment", "content")
      .populate("targetUser", "name username profilePic isPrivate"),
    Notification.countDocuments(filter),
  ]);

  return paginatedResponse(notifications, total, pagination);
};

export const getUnreadNotificationCountService = async (userId: string) => {
  const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });
  return { unreadCount };
};

export const markNotificationReadService = async (userId: string, notificationId: string) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );
};

export const markNotificationUnreadService = async (userId: string, notificationId: string) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { $set: { isRead: false }, $unset: { readAt: "" } },
    { new: true }
  );
};

export const markAllNotificationsReadService = async (userId: string) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return { updated: result.modifiedCount };
};

export const markAllNotificationsUnreadService = async (userId: string) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: true },
    { $set: { isRead: false }, $unset: { readAt: "" } }
  );

  return { updated: result.modifiedCount };
};

export const deleteNotificationService = async (userId: string, notificationId: string) => {
  return Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
};

export const clearReadNotificationsService = async (userId: string) => {
  const result = await Notification.deleteMany({ recipient: userId, isRead: true });
  return { deleted: result.deletedCount };
};

export const clearAllNotificationsService = async (userId: string) => {
  const result = await Notification.deleteMany({ recipient: userId });
  return { deleted: result.deletedCount };
};
