const mockCommentFindOne = jest.fn();
const mockCommentFindById = jest.fn();
const mockCommentFindOneAndUpdate = jest.fn();

jest.mock("../models/Comment", () => ({
  __esModule: true,
  default: {
    findById: mockCommentFindById,
    findOne: mockCommentFindOne,
    findOneAndUpdate: mockCommentFindOneAndUpdate,
  },
}));

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {},
}));

jest.mock("../models/Report", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../services/notificationService", () => ({
  createNotification: jest.fn(),
}));

jest.mock("../services/mentionService", () => ({
  notifyMentionedUsers: jest.fn(),
}));

import mongoose from "mongoose";
import {
  deleteCommentService,
  deleteReplyService,
  likeCommentService,
  likeReplyService,
  replyToReplyService,
} from "../services/commentService";

describe("soft delete comments", () => {
  const userId = "507f1f77bcf86cd799439011";
  const commentId = "507f1f77bcf86cd799439012";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("soft deletes a comment without removing the thread", async () => {
    const comment = {
      _id: new mongoose.Types.ObjectId(commentId),
      user: new mongoose.Types.ObjectId(userId),
      content: "Original",
      likes: [new mongoose.Types.ObjectId()],
      isDeleted: false,
      deletedAt: null,
      save: jest.fn().mockResolvedValue(undefined),
      populate: jest.fn().mockResolvedValue(undefined),
    };
    mockCommentFindOne.mockResolvedValueOnce(comment);

    const result = await deleteCommentService(commentId, userId);

    expect(mockCommentFindOne).toHaveBeenCalledWith({
      _id: commentId,
      user: userId,
      isDeleted: false,
    });
    expect(comment.content).toBe("This comment was deleted.");
    expect(comment.likes).toEqual([]);
    expect(comment.isDeleted).toBe(true);
    expect(comment.deletedAt).toEqual(expect.any(Date));
    expect(comment.save).toHaveBeenCalled();
    expect(result).toBe(comment);
  });

  it("soft deletes a reply and blocks interactions with deleted replies", async () => {
    const comment = {
      replies: [
        {
          user: new mongoose.Types.ObjectId(userId),
          content: "Reply",
          likes: [new mongoose.Types.ObjectId()],
          isDeleted: false,
          deletedAt: null,
        },
      ],
      save: jest.fn().mockResolvedValue(undefined),
      populate: jest.fn().mockResolvedValue(undefined),
    };
    mockCommentFindOne.mockResolvedValueOnce(comment);

    await deleteReplyService(commentId, 0, userId);

    expect(comment.replies[0]).toEqual(
      expect.objectContaining({
        content: "This comment was deleted.",
        likes: [],
        isDeleted: true,
        deletedAt: expect.any(Date),
      })
    );

    mockCommentFindById.mockResolvedValueOnce(comment);
    await expect(likeReplyService(commentId, 0, userId)).resolves.toBeNull();
  });

  it("blocks likes and nested replies on deleted comments", async () => {
    const deletedComment = {
      isDeleted: true,
      replies: [{ isDeleted: false }],
    };
    mockCommentFindById.mockResolvedValueOnce(deletedComment);
    await expect(replyToReplyService(commentId, 0, userId, "Nested")).resolves.toBeNull();

    mockCommentFindOneAndUpdate.mockResolvedValueOnce(null);

    await expect(likeCommentService(commentId, userId)).resolves.toBeNull();
    expect(mockCommentFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: commentId, isDeleted: { $ne: true } },
      { $addToSet: { likes: userId } },
      { new: true }
    );
  });
});
