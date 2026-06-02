import mongoose from "mongoose";

const mockPostPopulate = jest.fn().mockResolvedValue([]);
const mockPostLimit = jest.fn(() => ({ populate: mockPostPopulate }));
const mockPostSkip = jest.fn(() => ({ limit: mockPostLimit }));
const mockPostSort = jest.fn(() => ({ skip: mockPostSkip }));
const mockPostFind = jest.fn(() => ({ sort: mockPostSort }));
const mockPostCountDocuments = jest.fn().mockResolvedValue(0);
const mockPostSelect = jest.fn();
const mockPostFindOne = jest.fn(() => ({ select: mockPostSelect }));

const mockUserSelect = jest.fn();
const mockUserFindOne = jest.fn(() => ({ select: mockUserSelect }));
const mockUserFindOneAndUpdate = jest.fn();
const mockUserUpdateMany = jest.fn();

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {
    countDocuments: mockPostCountDocuments,
    find: mockPostFind,
    findOne: mockPostFindOne,
  },
}));

jest.mock("../models/User", () => ({
  __esModule: true,
  default: {
    findOne: mockUserFindOne,
    findOneAndUpdate: mockUserFindOneAndUpdate,
    updateMany: mockUserUpdateMany,
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

import {
  addPostToSavedCollectionService,
  createSavedCollectionService,
  getSavedCollectionPostsService,
  removeBookmarkService,
} from "../services/postService";

describe("saved post collections", () => {
  const userId = "507f1f77bcf86cd799439011";
  const collectionId = new mongoose.Types.ObjectId();
  const postId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a named collection for the user", async () => {
    const user = { savedCollections: [], save: jest.fn().mockResolvedValue(undefined) };
    mockUserSelect.mockResolvedValueOnce(user);

    const collection = await createSavedCollectionService(userId, " Travel ");

    expect(collection).toEqual(
      expect.objectContaining({
        name: "Travel",
        postsCount: 0,
      })
    );
    expect(user.savedCollections).toHaveLength(1);
    expect(user.save).toHaveBeenCalled();
  });

  it("adds a visible post to a collection and the global saved list", async () => {
    const user = {
      savedPosts: [],
      savedCollections: [{ _id: collectionId, name: "Travel", posts: [] }],
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockPostSelect.mockResolvedValueOnce({ _id: postId });
    mockUserSelect.mockResolvedValueOnce(user);

    const collection = await addPostToSavedCollectionService(
      userId,
      collectionId.toString(),
      postId.toString()
    );

    expect(mockPostFindOne).toHaveBeenCalledWith({
      _id: postId.toString(),
      visibility: "public",
      isArchived: { $ne: true },
      isModerationHidden: { $ne: true },
      status: { $ne: "draft" },
    });
    expect(user.savedPosts).toEqual([postId]);
    expect(user.savedCollections[0].posts).toEqual([postId]);
    expect(collection?.postsCount).toBe(1);
  });

  it("removes a bookmark from every saved collection too", async () => {
    mockUserFindOneAndUpdate.mockResolvedValueOnce({ _id: userId });

    await removeBookmarkService(postId.toString(), userId);

    expect(mockUserFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: userId, isDeleted: false },
      { $pull: { savedPosts: postId.toString(), "savedCollections.$[].posts": postId.toString() } },
      { new: true }
    );
  });

  it("returns paginated visible posts in a saved collection", async () => {
    mockUserSelect.mockResolvedValueOnce({
      savedPosts: [postId],
      savedCollections: [{ _id: collectionId, name: "Travel", posts: [postId] }],
    });
    mockPostCountDocuments.mockResolvedValueOnce(1);
    mockPostPopulate.mockResolvedValueOnce([{ _id: postId }]);

    const result = await getSavedCollectionPostsService(userId, collectionId.toString(), {
      page: 1,
      limit: 10,
      skip: 0,
    });

    expect(mockPostFind).toHaveBeenCalledWith({
      _id: { $in: [postId] },
      visibility: "public",
      isArchived: { $ne: true },
      isModerationHidden: { $ne: true },
      status: { $ne: "draft" },
    });
    expect(result?.pagination.total).toBe(1);
    expect(result?.items[0]).toEqual(expect.objectContaining({ isSavedByMe: true }));
  });
});
