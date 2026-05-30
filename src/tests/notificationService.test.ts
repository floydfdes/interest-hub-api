import mongoose from "mongoose";

const mockNotificationCreate = jest.fn();
const mockNotificationCountDocuments = jest.fn();
const mockNotificationFindOneAndUpdate = jest.fn();
const mockNotificationUpdateMany = jest.fn();
const mockPopulateComment = jest.fn();
const mockPopulatePost = jest.fn(() => ({ populate: mockPopulateComment }));
const mockPopulateActor = jest.fn(() => ({ populate: mockPopulatePost }));
const mockLimit = jest.fn(() => ({ populate: mockPopulateActor }));
const mockSkip = jest.fn(() => ({ limit: mockLimit }));
const mockSort = jest.fn(() => ({ skip: mockSkip }));
const mockNotificationFind = jest.fn(() => ({ sort: mockSort }));

jest.mock("../models/Notification", () => ({
  __esModule: true,
  default: {
    create: mockNotificationCreate,
    countDocuments: mockNotificationCountDocuments,
    find: mockNotificationFind,
    findOneAndUpdate: mockNotificationFindOneAndUpdate,
    updateMany: mockNotificationUpdateMany,
  },
}));

import {
  createNotification,
  getNotificationsService,
  getUnreadNotificationCountService,
  markAllNotificationsReadService,
  markNotificationReadService,
} from "../services/notificationService";

describe("notificationService", () => {
  const recipientId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
  const actorId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");
  const postId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");

  beforeEach(() => {
    jest.clearAllMocks();
    mockPopulateComment.mockResolvedValue([]);
    mockNotificationCountDocuments.mockResolvedValue(2);
  });

  it("creates a notification for another user", async () => {
    const notification = { _id: new mongoose.Types.ObjectId() };
    mockNotificationCreate.mockResolvedValueOnce(notification);

    await expect(
      createNotification({
        recipientId,
        actorId,
        postId,
        type: "post_liked",
        message: "Someone liked your post.",
      })
    ).resolves.toBe(notification);

    expect(mockNotificationCreate).toHaveBeenCalledWith({
      recipient: recipientId,
      actor: actorId,
      type: "post_liked",
      post: postId,
      message: "Someone liked your post.",
    });
  });

  it("does not create self notifications", async () => {
    await expect(
      createNotification({
        recipientId,
        actorId: recipientId,
        type: "post_liked",
        message: "Someone liked your post.",
      })
    ).resolves.toBeNull();

    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it("returns paginated notifications for a user", async () => {
    const result = await getNotificationsService(recipientId.toString(), {
      page: 1,
      limit: 20,
      skip: 0,
    });

    expect(mockNotificationFind).toHaveBeenCalledWith({ recipient: recipientId.toString() });
    expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(mockPopulateActor).toHaveBeenCalledWith("actor", "name profilePic");
    expect(mockPopulatePost).toHaveBeenCalledWith("post", "title image");
    expect(mockPopulateComment).toHaveBeenCalledWith("comment", "content");
    expect(result.pagination.total).toBe(2);
  });

  it("returns unread notification count", async () => {
    await expect(getUnreadNotificationCountService(recipientId.toString())).resolves.toEqual({
      unreadCount: 2,
    });
    expect(mockNotificationCountDocuments).toHaveBeenCalledWith({
      recipient: recipientId.toString(),
      isRead: false,
    });
  });

  it("marks one notification read for the owner", async () => {
    await markNotificationReadService(recipientId.toString(), "notification-id");

    expect(mockNotificationFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: "notification-id", recipient: recipientId.toString() },
      { $set: { isRead: true, readAt: expect.any(Date) } },
      { new: true }
    );
  });

  it("marks all unread notifications read", async () => {
    mockNotificationUpdateMany.mockResolvedValueOnce({ modifiedCount: 3 });

    await expect(markAllNotificationsReadService(recipientId.toString())).resolves.toEqual({
      updated: 3,
    });
    expect(mockNotificationUpdateMany).toHaveBeenCalledWith(
      { recipient: recipientId.toString(), isRead: false },
      { $set: { isRead: true, readAt: expect.any(Date) } }
    );
  });
});
