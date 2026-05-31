import mongoose from "mongoose";

const mockPostSelect = jest.fn();
const mockPostFindOne = jest.fn(() => ({ select: mockPostSelect }));
const mockPostPopulate = jest.fn().mockResolvedValue([]);
const mockPostLimit = jest.fn(() => ({ populate: mockPostPopulate }));
const mockPostSkip = jest.fn(() => ({ limit: mockPostLimit }));
const mockPostSort = jest.fn(() => ({ skip: mockPostSkip }));
const mockPostFind = jest.fn(() => ({ sort: mockPostSort }));
const mockPostCountDocuments = jest.fn().mockResolvedValue(1);
const mockPostFindById = jest.fn();

const mockUserSelect = jest.fn();
const mockUserFindOne = jest.fn(() => ({ select: mockUserSelect }));

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {
    findOne: mockPostFindOne,
    find: mockPostFind,
    countDocuments: mockPostCountDocuments,
    findById: mockPostFindById,
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

import {
  archivePostService,
  getArchivedPostsService,
  getHiddenPostsService,
  getPostsUnderReviewService,
  hidePostService,
  unhidePostService,
} from "../services/postService";

const userId = "507f1f77bcf86cd799439011";
const postId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");

describe("personal post hiding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("hides a visible post for the requesting user", async () => {
    const user = { hiddenPosts: [] as mongoose.Types.ObjectId[], save: jest.fn() };
    mockPostSelect.mockResolvedValueOnce({ _id: postId });
    mockUserSelect.mockResolvedValueOnce(user);

    await expect(hidePostService(postId.toString(), userId)).resolves.toEqual({ didHide: true });
    expect(user.hiddenPosts).toEqual([postId]);
    expect(user.save).toHaveBeenCalled();
  });

  it("unhides a post without requiring it to still exist", async () => {
    const user = { hiddenPosts: [postId], save: jest.fn() };
    mockUserSelect.mockResolvedValueOnce(user);

    await expect(unhidePostService(postId.toString(), userId)).resolves.toEqual({
      didUnhide: true,
    });
    expect(user.hiddenPosts).toEqual([]);
  });

  it("returns hidden public posts with pagination", async () => {
    mockUserSelect.mockResolvedValueOnce({ hiddenPosts: [postId] });

    const result = await getHiddenPostsService(userId, { page: 1, limit: 20, skip: 0 });

    expect(mockPostFind).toHaveBeenCalledWith({
      _id: { $in: [postId] },
      visibility: "public",
      isArchived: { $ne: true },
      isModerationHidden: { $ne: true },
      status: { $ne: "draft" },
    });
    expect(result?.pagination.total).toBe(1);
  });
});

describe("post archiving", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("archives a post owned by the signed-in user", async () => {
    const post = {
      author: new mongoose.Types.ObjectId(userId),
      isArchived: false,
      archivedAt: null as Date | null,
      save: jest.fn(),
    };
    mockPostFindById.mockResolvedValueOnce(post);

    await expect(archivePostService(postId.toString(), userId, true)).resolves.toEqual(
      expect.objectContaining({
        likesCount: 0,
        commentsCount: 0,
        isLikedByMe: false,
        isSavedByMe: false,
      })
    );
    expect(post.isArchived).toBe(true);
    expect(post.archivedAt).toEqual(expect.any(Date));
    expect(post.save).toHaveBeenCalled();
  });

  it("unarchives an owned post", async () => {
    const post = {
      author: new mongoose.Types.ObjectId(userId),
      isArchived: true,
      archivedAt: new Date(),
      save: jest.fn(),
    };
    mockPostFindById.mockResolvedValueOnce(post);

    await archivePostService(postId.toString(), userId, false);
    expect(post.isArchived).toBe(false);
    expect(post.archivedAt).toBeNull();
  });

  it("returns only the owner's archived posts with pagination", async () => {
    await getArchivedPostsService(userId, { page: 1, limit: 20, skip: 0 });

    expect(mockPostFind).toHaveBeenCalledWith({
      author: userId,
      isArchived: true,
      isModerationHidden: { $ne: true },
    });
    expect(mockPostSort).toHaveBeenCalledWith({ archivedAt: -1 });
  });

  it("returns only the owner's posts waiting for moderation review", async () => {
    const result = await getPostsUnderReviewService(userId, { page: 1, limit: 20, skip: 0 });

    expect(mockPostFind).toHaveBeenCalledWith({
      author: userId,
      needsReview: true,
      isModerationHidden: true,
    });
    expect(mockPostSort).toHaveBeenCalledWith({ updatedAt: -1 });
    expect(result.pagination.total).toBe(1);
  });
});
