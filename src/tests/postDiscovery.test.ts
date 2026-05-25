import mongoose from "mongoose";

const mockPostPopulate = jest.fn().mockResolvedValue([]);
const mockPostLimit = jest.fn(() => ({ populate: mockPostPopulate }));
const mockPostSkip = jest.fn(() => ({ limit: mockPostLimit }));
const mockPostSort = jest.fn(() => ({ skip: mockPostSkip }));
const mockPostFind = jest.fn(() => ({ sort: mockPostSort }));
const mockPostCountDocuments = jest.fn().mockResolvedValue(24);
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
    countDocuments: mockPostCountDocuments,
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
  getPostLikesService,
  getRecommendedPostsService,
  getTrendingPostsService,
} from "../services/postService";
import { getSuggestedUsers } from "../services/userService";
import { getFollowers } from "../services/userService";

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
    const result = await getFollowingFeedService(userId, { page: 2, limit: 20, skip: 20 });

    expect(mockPostFind).toHaveBeenCalledWith({
      author: { $in: [followedId] },
      visibility: "public",
    });
    expect(mockPostSort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(mockPostSkip).toHaveBeenCalledWith(20);
    expect(mockPostLimit).toHaveBeenCalledWith(20);
    expect(result?.pagination).toEqual({
      page: 2,
      limit: 20,
      total: 24,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
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

  it("returns a paginated list of users who liked a public post", async () => {
    const populate = jest.fn().mockResolvedValue(undefined);
    mockPostSelect.mockResolvedValueOnce({ likes: [postId], populate });

    const result = await getPostLikesService(postId.toString(), {
      page: 1,
      limit: 10,
      skip: 0,
    });

    expect(populate).toHaveBeenCalledWith({
      path: "likes",
      select: "name profilePic",
      options: { skip: 0, limit: 10 },
    });
    expect(result?.pagination.total).toBe(1);
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
    expect(pipeline).toContainEqual({
      $group: { _id: "$_id", candidate: { $first: "$$ROOT" } },
    });
    expect(pipeline).toContainEqual({
      $sort: { matchingInterests: -1, followersCount: -1, createdAt: -1, _id: -1 },
    });
    expect(pipeline).toContainEqual({ $limit: 5 });
  });
});

describe("follower lists", () => {
  it("populates only the requested followers page and returns the total", async () => {
    const firstFollower = new mongoose.Types.ObjectId("507f1f77bcf86cd799439031");
    const secondFollower = new mongoose.Types.ObjectId("507f1f77bcf86cd799439032");
    const populate = jest.fn().mockResolvedValue(undefined);
    mockUserFindOne.mockReturnValueOnce({ select: mockUserSelect });
    mockUserSelect.mockResolvedValueOnce({
      followers: [firstFollower, secondFollower],
      populate,
    });

    const result = await getFollowers("507f1f77bcf86cd799439030", {
      page: 2,
      limit: 1,
      skip: 1,
    });

    expect(populate).toHaveBeenCalledWith({
      path: "followers",
      select: "name profilePic",
      options: { skip: 1, limit: 1 },
    });
    expect(result?.pagination.total).toBe(2);
  });
});
