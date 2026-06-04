import mongoose from "mongoose";

const mockPostFindOne = jest.fn();
const mockPostFindById = jest.fn();
const mockPostUpdateMany = jest.fn();
const mockUserSelect = jest.fn();
const mockUserFindOne = jest.fn(() => ({ select: mockUserSelect }));

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {
    findById: mockPostFindById,
    findOne: mockPostFindOne,
    updateMany: mockPostUpdateMany,
  },
}));

jest.mock("../models/User", () => ({
  __esModule: true,
  default: {
    findOne: mockUserFindOne,
  },
}));

jest.mock("../models/Comment", () => ({
  __esModule: true,
  default: {},
}));

jest.mock("../utils/uploadImage", () => ({
  uploadImageToCloudinary: jest.fn(),
}));

jest.mock("../services/mentionService", () => ({
  notifyMentionedUsers: jest.fn(),
}));

import { archivePostService, pinPostService, unpinPostService } from "../services/postService";

describe("post pinning", () => {
  const userId = "507f1f77bcf86cd799439011";
  const postId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserSelect.mockResolvedValue({ savedPosts: [] });
    mockPostUpdateMany.mockResolvedValue({});
  });

  it("pins one visible owned post and unpins previous posts from the same author", async () => {
    const post = {
      _id: postId,
      author: new mongoose.Types.ObjectId(userId),
      isPinned: false,
      pinnedAt: null,
      likes: [],
      comments: [],
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockPostFindOne.mockResolvedValueOnce(post);

    const result = await pinPostService(postId.toString(), userId);

    expect(mockPostFindOne).toHaveBeenCalledWith({
      _id: postId.toString(),
      author: userId,
      status: { $ne: "draft" },
      isArchived: { $ne: true },
      isModerationHidden: { $ne: true },
    });
    expect(mockPostUpdateMany).toHaveBeenCalledWith(
      { author: userId, isPinned: true, _id: { $ne: postId } },
      { $set: { isPinned: false, pinnedAt: null } }
    );
    expect(post.isPinned).toBe(true);
    expect(post.pinnedAt).toEqual(expect.any(Date));
    expect(result).toEqual(expect.objectContaining({ isPinned: true }));
  });

  it("unpins an owned post", async () => {
    const post = {
      _id: postId,
      author: new mongoose.Types.ObjectId(userId),
      isPinned: true,
      pinnedAt: new Date(),
      likes: [],
      comments: [],
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockPostFindOne.mockResolvedValueOnce(post);

    const result = await unpinPostService(postId.toString(), userId);

    expect(mockPostFindOne).toHaveBeenCalledWith({ _id: postId.toString(), author: userId });
    expect(post.isPinned).toBe(false);
    expect(post.pinnedAt).toBeNull();
    expect(result).toEqual(expect.objectContaining({ isPinned: false }));
  });

  it("clears pin state when a post is archived", async () => {
    const post = {
      _id: postId,
      author: new mongoose.Types.ObjectId(userId),
      isPinned: true,
      pinnedAt: new Date(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockPostFindById.mockResolvedValueOnce(post);

    await archivePostService(postId.toString(), userId, true);

    expect(post.isPinned).toBe(false);
    expect(post.pinnedAt).toBeNull();
  });
});
