import mongoose from "mongoose";

const mockPostPopulate = jest.fn().mockResolvedValue([]);
const mockPostLimit = jest.fn(() => ({ populate: mockPostPopulate }));
const mockPostSort = jest.fn(() => ({ limit: mockPostLimit }));
const mockPostFind = jest.fn(() => ({ sort: mockPostSort }));
const mockPostAggregate = jest.fn().mockResolvedValue([]);
const mockPostSelect = jest.fn();
const mockPostFindOne = jest.fn(() => ({ select: mockPostSelect }));

const mockUserSelect = jest.fn();
const mockUserPopulate = jest.fn();
const mockUserFindOne = jest.fn();
const mockUserFindOneAndUpdate = jest.fn();
const mockUserAggregate = jest.fn().mockResolvedValue([]);

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {
    aggregate: mockPostAggregate,
    find: mockPostFind,
    findOne: mockPostFindOne,
  },
}));

jest.mock("../models/User", () => ({
  __esModule: true,
  default: {
    aggregate: mockUserAggregate,
    findOne: mockUserFindOne,
    findOneAndUpdate: mockUserFindOneAndUpdate,
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
  bookmarkPostService,
  getBookmarkedPostsService,
  getFollowingFeedService,
  getRecommendedPostsService,
  getTrendingPostsService,
} from "../services/postService";
import { getSuggestedUsers } from "../services/userService";

describe("post discovery services", () => {
  const userId = "507f1f77bcf86cd799439011";
  const followedId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");
  const postId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserFindOne.mockReturnValue({ select: mockUserSelect });
    mockUserSelect.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(userId),
      following: [followedId],
      interests: ["Travel", "Photography"],
    });
  });

  it("builds a chronological public feed from followed authors", async () => {
    await getFollowingFeedService(userId, 20);

    expect(mockPostFind).toHaveBeenCalledWith({
      author: { $in: [followedId] },
      visibility: "public",
    });
    expect(mockPostSort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(mockPostLimit).toHaveBeenCalledWith(20);
  });

  it("ranks trending posts in the requested recent time window", async () => {
    await getTrendingPostsService("week", 10);

    const pipeline = mockPostAggregate.mock.calls[0][0];
    expect(pipeline[0]).toEqual({
      $match: {
        visibility: "public",
        createdAt: { $gte: expect.any(Date) },
      },
    });
    expect(pipeline).toContainEqual({ $limit: 10 });
  });

  it("builds recommendations for public posts other than the user's own", async () => {
    await getRecommendedPostsService(userId, 15);

    const pipeline = mockPostAggregate.mock.calls[0][0];
    expect(pipeline[0]).toEqual({
      $match: {
        visibility: "public",
        author: { $ne: new mongoose.Types.ObjectId(userId) },
      },
    });
    expect(pipeline).toContainEqual({ $limit: 15 });
  });

  it("bookmarks only an existing public post", async () => {
    mockPostSelect.mockResolvedValue({ _id: postId });
    mockUserFindOneAndUpdate.mockResolvedValue({ _id: userId });

    await bookmarkPostService(postId.toString(), userId);

    expect(mockPostFindOne).toHaveBeenCalledWith({
      _id: postId.toString(),
      visibility: "public",
    });
    expect(mockUserFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: userId, isDeleted: false },
      { $addToSet: { savedPosts: postId } },
      { new: true }
    );
  });

  it("returns only visible posts from the user's bookmarks", async () => {
    const savedPosts = [{ _id: postId }];
    mockUserFindOne.mockReturnValueOnce({ populate: mockUserPopulate });
    mockUserPopulate.mockResolvedValue({ savedPosts });

    const result = await getBookmarkedPostsService(userId);

    expect(mockUserPopulate).toHaveBeenCalledWith({
      path: "savedPosts",
      match: { visibility: "public" },
      options: { sort: { createdAt: -1 } },
      populate: { path: "author", select: "name profilePic" },
    });
    expect(result).toEqual(savedPosts);
  });
});

describe("suggested users", () => {
  it("excludes the current user and existing follows before ranking candidates", async () => {
    const userId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439021");
    const followedId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439022");
    mockUserFindOne.mockReturnValue({ select: mockUserSelect });
    mockUserSelect.mockResolvedValue({
      _id: userId,
      following: [followedId],
      interests: ["Travel"],
    });

    await getSuggestedUsers(userId.toString(), 5);

    const pipeline = mockUserAggregate.mock.calls[0][0];
    expect(pipeline[0]).toEqual({
      $match: {
        _id: { $nin: [userId, followedId] },
        isDeleted: false,
        isBlocked: false,
      },
    });
    expect(pipeline).toContainEqual({ $limit: 5 });
  });
});
