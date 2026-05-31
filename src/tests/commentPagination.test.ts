const mockCommentCountDocuments = jest.fn();
const mockPopulate = jest.fn();
const mockLimit = jest.fn(() => ({ populate: mockPopulate }));
const mockSkip = jest.fn(() => ({ limit: mockLimit }));
const mockSort = jest.fn(() => ({ skip: mockSkip }));
const mockCommentFind = jest.fn(() => ({ sort: mockSort }));
const mockPostSelect = jest.fn();
const mockPostFindOne = jest.fn(() => ({ select: mockPostSelect }));
const mockUserSelect = jest.fn();
const mockUserFindOne = jest.fn(() => ({ select: mockUserSelect }));

jest.mock("../models/Comment", () => ({
  __esModule: true,
  default: {
    countDocuments: mockCommentCountDocuments,
    find: mockCommentFind,
  },
}));

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {
    findOne: mockPostFindOne,
  },
}));

jest.mock("../models/User", () => ({
  __esModule: true,
  default: {
    findOne: mockUserFindOne,
  },
}));

jest.mock("../models/Report", () => ({
  __esModule: true,
  default: {},
}));

jest.mock("../services/notificationService", () => ({
  createNotification: jest.fn(),
}));

import mongoose from "mongoose";
import { getPostCommentsService } from "../services/commentService";
import { PaginatedResponse } from "../utils/pagination";
import { IComment } from "../models/Comment";

describe("getPostCommentsService", () => {
  const postId = "507f1f77bcf86cd799439011";
  const authorId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");
  const viewerId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");

  beforeEach(() => {
    jest.clearAllMocks();
    mockPopulate.mockResolvedValue([{ _id: new mongoose.Types.ObjectId() }]);
    mockCommentCountDocuments.mockResolvedValue(1);
  });

  it("returns paginated comments for a visible post", async () => {
    mockPostSelect.mockResolvedValueOnce({ author: authorId, visibility: "public" });

    const result = await getPostCommentsService(postId, { page: 2, limit: 10, skip: 10 });

    expect(result).not.toBe(false);
    expect(result).not.toBeNull();
    const paginatedResult = result as PaginatedResponse<IComment>;

    expect(mockCommentFind).toHaveBeenCalledWith({
      post: postId,
      isModerationHidden: { $ne: true },
    });
    expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(mockSkip).toHaveBeenCalledWith(10);
    expect(mockLimit).toHaveBeenCalledWith(10);
    expect(mockPopulate).toHaveBeenCalledWith([
      { path: "user", select: "name profilePic" },
      { path: "replies.user", select: "name profilePic" },
    ]);
    expect(paginatedResult.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it("does not expose private post comments to non-owners", async () => {
    mockPostSelect.mockResolvedValueOnce({ author: authorId, visibility: "private" });

    await expect(
      getPostCommentsService(postId, { page: 1, limit: 20, skip: 0 }, viewerId.toString())
    ).resolves.toBe(false);
    expect(mockCommentFind).not.toHaveBeenCalled();
  });

  it("allows followers to read followers-only post comments", async () => {
    mockPostSelect.mockResolvedValueOnce({ author: authorId, visibility: "followersOnly" });
    mockUserSelect.mockResolvedValueOnce({ _id: authorId });

    await getPostCommentsService(postId, { page: 1, limit: 20, skip: 0 }, viewerId.toString());

    expect(mockUserFindOne).toHaveBeenCalledWith({
      _id: authorId.toString(),
      followers: viewerId.toString(),
      isDeleted: false,
    });
    expect(mockCommentFind).toHaveBeenCalled();
  });
});
