const mockPopulateComments = jest.fn().mockResolvedValue(null);
const mockPopulateAuthor = jest.fn(() => ({ populate: mockPopulateComments }));
const mockFindOne = jest.fn(() => ({ populate: mockPopulateAuthor }));
const mockUserSelect = jest.fn();
const mockUserFindOne = jest.fn(() => ({ select: mockUserSelect }));

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
  },
}));

import { getPostByIdService } from "../services/postService";
import mongoose from "mongoose";

describe("getPostByIdService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPopulateComments.mockResolvedValue(null);
  });

  it("populates authors for comments and nested replies", async () => {
    await getPostByIdService("507f1f77bcf86cd799439011");

    expect(mockPopulateComments).toHaveBeenCalledWith({
      path: "comments",
      model: "Comment",
      match: { isModerationHidden: { $ne: true } },
      populate: [
        { path: "user", select: "name profilePic" },
        { path: "replies.user", select: "name profilePic" },
      ],
    });
  });

  it("does not reveal a private post to a viewer other than its owner", async () => {
    const authorId = new mongoose.Types.ObjectId();
    const post = {
      author: { _id: authorId },
      visibility: "private",
      viewCount: 0,
      save: jest.fn(),
    };
    mockPopulateComments.mockResolvedValueOnce(post);

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
    mockPopulateComments.mockResolvedValueOnce(post);

    await expect(
      getPostByIdService("post-id", new mongoose.Types.ObjectId().toString())
    ).resolves.toBeNull();
    expect(post.save).not.toHaveBeenCalled();
  });

  it("allows an owner to read a moderation-hidden post for editing", async () => {
    const authorId = new mongoose.Types.ObjectId();
    const post = {
      author: { _id: authorId },
      visibility: "public",
      isModerationHidden: true,
      needsReview: true,
      viewCount: 0,
      save: jest.fn(),
    };
    mockPopulateComments.mockResolvedValueOnce(post);

    await expect(getPostByIdService("post-id", authorId.toString())).resolves.toBe(post);
    expect(post.viewCount).toBe(1);
    expect(post.save).toHaveBeenCalled();
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
      author: { _id: authorId },
      visibility: "followersOnly",
      viewCount: 0,
      save: jest.fn(),
    };
    mockPopulateComments.mockResolvedValueOnce(post);
    mockUserSelect.mockResolvedValueOnce({ _id: authorId });

    await expect(getPostByIdService("post-id", viewerId)).resolves.toBe(post);
    expect(mockUserFindOne).toHaveBeenCalledWith({
      _id: authorId.toString(),
      followers: viewerId,
      isDeleted: false,
    });
    expect(post.viewCount).toBe(1);
  });
});
