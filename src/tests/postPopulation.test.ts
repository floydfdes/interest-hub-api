const mockPopulateAuthor = jest.fn().mockResolvedValue(null);
const mockFindOne = jest.fn(() => ({ populate: mockPopulateAuthor }));
const mockUserSelect = jest.fn();
const mockUserFindOne = jest.fn(() => ({ select: mockUserSelect }));
const mockUserUpdateOne = jest.fn();

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {
    findOne: mockFindOne,
  },
}));

jest.mock("../models/Comment", () => ({
  __esModule: true,
  default: {},
}));

jest.mock("../models/User", () => ({
  __esModule: true,
  default: {
    findOne: mockUserFindOne,
    updateOne: mockUserUpdateOne,
  },
}));

import { getPostByIdService } from "../services/postService";
import mongoose from "mongoose";

describe("getPostByIdService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPopulateAuthor.mockResolvedValue(null);
    mockUserUpdateOne.mockResolvedValue({});
  });

  it("populates only the post author and leaves comments for the comments endpoint", async () => {
    await getPostByIdService("507f1f77bcf86cd799439011");

    expect(mockPopulateAuthor).toHaveBeenCalledWith("author", "name profilePic");
    expect(mockPopulateAuthor).toHaveBeenCalledTimes(1);
  });

  it("does not reveal a private post to a viewer other than its owner", async () => {
    const authorId = new mongoose.Types.ObjectId();
    const post = {
      author: { _id: authorId },
      visibility: "private",
      viewCount: 0,
      save: jest.fn(),
    };
    mockPopulateAuthor.mockResolvedValueOnce(post);

    await expect(
      getPostByIdService("post-id", new mongoose.Types.ObjectId().toString())
    ).resolves.toBeNull();
    expect(post.save).not.toHaveBeenCalled();
  });

  it("does not reveal a moderation-hidden post to a non-owner", async () => {
    const authorId = new mongoose.Types.ObjectId();
    const post = {
      author: { _id: authorId },
      visibility: "public",
      isModerationHidden: true,
      viewCount: 0,
      save: jest.fn(),
    };
    mockPopulateAuthor.mockResolvedValueOnce(post);

    await expect(
      getPostByIdService("post-id", new mongoose.Types.ObjectId().toString())
    ).resolves.toBeNull();
    expect(post.save).not.toHaveBeenCalled();
  });

  it("allows an owner to read a moderation-hidden post for editing", async () => {
    const authorId = new mongoose.Types.ObjectId();
    const post = {
      _id: new mongoose.Types.ObjectId(),
      author: { _id: authorId },
      visibility: "public",
      isModerationHidden: true,
      needsReview: true,
      viewCount: 0,
      save: jest.fn(),
    };
    mockPopulateAuthor.mockResolvedValueOnce(post);

    await expect(getPostByIdService("post-id", authorId.toString())).resolves.toEqual(
      expect.objectContaining({
        _id: post._id,
        likesCount: 0,
        commentsCount: 0,
        isLikedByMe: false,
        isSavedByMe: false,
      })
    );
    expect(post.viewCount).toBe(1);
    expect(post.save).toHaveBeenCalled();
    expect(mockUserUpdateOne).toHaveBeenCalledTimes(2);
  });

  it("looks up a post by id even when it is hidden for moderation", async () => {
    await getPostByIdService("507f1f77bcf86cd799439011");

    expect(mockFindOne).toHaveBeenCalledWith({
      _id: "507f1f77bcf86cd799439011",
      isArchived: { $ne: true },
    });
  });

  it("allows a follower to read a followers-only post", async () => {
    const authorId = new mongoose.Types.ObjectId();
    const viewerId = new mongoose.Types.ObjectId().toString();
    const post = {
      _id: new mongoose.Types.ObjectId(),
      author: { _id: authorId },
      visibility: "followersOnly",
      viewCount: 0,
      save: jest.fn(),
    };
    mockPopulateAuthor.mockResolvedValueOnce(post);
    mockUserSelect.mockResolvedValueOnce({ _id: authorId });

    await expect(getPostByIdService("post-id", viewerId)).resolves.toEqual(
      expect.objectContaining({ _id: post._id, commentsCount: 0, likesCount: 0 })
    );
    expect(mockUserFindOne).toHaveBeenCalledWith({
      _id: authorId.toString(),
      followers: viewerId,
      isDeleted: false,
    });
    expect(post.viewCount).toBe(1);
    expect(mockUserUpdateOne).toHaveBeenCalledWith(
      { _id: viewerId, isDeleted: false },
      { $pull: { recentlyViewedPosts: { post: post._id } } }
    );
  });
});
