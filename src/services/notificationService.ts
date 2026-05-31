import { Types } from "mongoose";
import Notification, { NotificationType } from "../models/Notification";
import { paginatedResponse, PaginationParams } from "../utils/pagination";

interface CreateNotificationInput {
  recipientId: string | Types.ObjectId;
  actorId?: string | Types.ObjectId;
  type: NotificationType;
  postId?: string | Types.ObjectId;
  commentId?: string | Types.ObjectId;
  message: string;
}

const toObjectId = (id: string | Types.ObjectId): Types.ObjectId =>
  id instanceof Types.ObjectId ? id : new Types.ObjectId(id);

export const createNotification = async ({
  recipientId,
  actorId,
  type,
  postId,
  commentId,
  message,
}: CreateNotificationInput) => {
  if (actorId && toObjectId(recipientId).equals(toObjectId(actorId))) return null;

  return Notification.create({
    recipient: toObjectId(recipientId),
    ...(actorId && { actor: toObjectId(actorId) }),
    type,
    ...(postId && { post: toObjectId(postId) }),
    ...(commentId && { comment: toObjectId(commentId) }),
    message,
  });
};

export const getNotificationsService = async (userId: string, pagination: PaginationParams) => {
  const filter = { recipient: userId };
  const [notifications, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("actor", "name profilePic")
      .populate("post", "title image")
      .populate("comment", "content"),
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
