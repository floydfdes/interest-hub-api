import mongoose from "mongoose";

const mockUserSelect = jest.fn();
const mockUserFind = jest.fn(() => ({ select: mockUserSelect }));
const mockCreateNotification = jest.fn();

jest.mock("../models/User", () => ({
  __esModule: true,
  default: {
    find: mockUserFind,
  },
}));

jest.mock("../services/notificationService", () => ({
  createNotification: mockCreateNotification,
}));

import { notifyMentionedUsers } from "../services/mentionService";

describe("mentionService", () => {
  const actorId = "507f1f77bcf86cd799439011";
  const mentionedId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");
  const postId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserSelect.mockResolvedValue([{ _id: mentionedId }]);
    mockCreateNotification.mockResolvedValue({});
  });

  it("notifies users mentioned by username", async () => {
    await notifyMentionedUsers({
      actorId,
      text: "hello @Jane_Doe",
      postId,
    });

    expect(mockUserFind).toHaveBeenCalledWith({
      username: { $in: ["jane_doe"] },
      isDeleted: false,
      isBlocked: false,
    });
    expect(mockCreateNotification).toHaveBeenCalledWith({
      recipientId: mentionedId,
      actorId,
      type: "user_mentioned",
      postId,
      message: "Someone mentioned you.",
    });
  });

  it("does not re-notify mentions that already existed before an edit", async () => {
    await notifyMentionedUsers({
      actorId,
      previousText: "hello @jane_doe",
      text: "hello @jane_doe",
      postId,
    });

    expect(mockUserFind).not.toHaveBeenCalled();
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });
});
