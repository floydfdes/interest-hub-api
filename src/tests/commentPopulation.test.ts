const mockFindOneAndUpdate = jest.fn();
const mockReportFindOne = jest.fn();
const mockReportCreate = jest.fn();
const mockCreateNotification = jest.fn();
const mockNotifyMentionedUsers = jest.fn();

jest.mock("../models/Comment", () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: mockFindOneAndUpdate,
  },
}));

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {},
}));

jest.mock("../models/Report", () => ({
  __esModule: true,
  default: {
    findOne: mockReportFindOne,
    create: mockReportCreate,
  },
}));

jest.mock("../services/notificationService", () => ({
  createNotification: mockCreateNotification,
}));

jest.mock("../services/mentionService", () => ({
  notifyMentionedUsers: mockNotifyMentionedUsers,
}));

import { replyToCommentService } from "../services/commentService";
import mongoose from "mongoose";

describe("replyToCommentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReportFindOne.mockResolvedValue(null);
    mockCreateNotification.mockResolvedValue({});
  });

  it("populates comment and reply authors in its response", async () => {
    const comment = { populate: jest.fn().mockResolvedValue(undefined) };
    mockFindOneAndUpdate.mockResolvedValue(comment);

    const result = await replyToCommentService(
      "507f1f77bcf86cd799439011",
      "507f1f77bcf86cd799439012",
      "Thank you"
    );

    expect(comment.populate).toHaveBeenCalledWith([
      { path: "user", select: "name profilePic" },
      { path: "replies.user", select: "name profilePic" },
    ]);
    expect(result).toBe(comment);
  });

  it("marks comments with bad language for admin review when replying", async () => {
    const commentId = "507f1f77bcf86cd799439011";
    const commentObjectId = new mongoose.Types.ObjectId(commentId);
    const comment = { _id: commentObjectId, populate: jest.fn().mockResolvedValue(undefined) };
    const flaggedWord = String.fromCharCode(115, 104, 105, 116);
    mockFindOneAndUpdate.mockResolvedValue(comment);

    await replyToCommentService(commentId, "507f1f77bcf86cd799439012", `This is ${flaggedWord}`);

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: commentId, isDeleted: { $ne: true } },
      expect.objectContaining({
        $push: {
          replies: expect.objectContaining({
            isDeleted: false,
            deletedAt: null,
          }),
        },
        $set: { isModerationHidden: true, needsReview: true },
        $addToSet: { moderationReasons: { $each: ["bad_language"] } },
      }),
      { new: true }
    );
    expect(mockReportCreate).toHaveBeenCalledWith({
      targetType: "comment",
      comment: commentObjectId,
      reason: "bad_language",
      source: "system",
      details: "Automatically flagged for bad language review",
    });
  });
});
