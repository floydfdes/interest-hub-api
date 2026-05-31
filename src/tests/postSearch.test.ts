const mockPopulate = jest.fn().mockResolvedValue([]);
const mockFind = jest.fn(() => ({ populate: mockPopulate }));
const mockCreate = jest.fn().mockResolvedValue({});
const mockReportFindOne = jest.fn();
const mockReportCreate = jest.fn();
const mockReportUpdateMany = jest.fn();
const mockFindById = jest.fn();
const mockCreateNotification = jest.fn();

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {
    create: mockCreate,
    findById: mockFindById,
    find: mockFind,
  },
}));

jest.mock("../models/Comment", () => ({
  __esModule: true,
  default: {},
}));

jest.mock("../utils/uploadImage", () => ({
  uploadImageToCloudinary: jest.fn().mockResolvedValue("uploaded-image"),
}));

jest.mock("../models/Report", () => ({
  __esModule: true,
  default: {
    findOne: mockReportFindOne,
    create: mockReportCreate,
    updateMany: mockReportUpdateMany,
  },
}));

jest.mock("../services/notificationService", () => ({
  createNotification: mockCreateNotification,
}));

import {
  advancedSearchPostsService,
  createPostService,
  searchPostsService,
  updatePostService,
} from "../services/postService";
import mongoose from "mongoose";

describe("post search and tags", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({
      _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439013"),
      author: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
    });
    mockFindById.mockResolvedValue(null);
    mockReportFindOne.mockResolvedValue(null);
    mockCreateNotification.mockResolvedValue({});
  });

  it("normalizes tags when a post is created", async () => {
    await createPostService({
      title: "Post",
      content: "Content",
      image: "image",
      category: "Technology",
      author: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      tags: [" TypeScript ", "typescript", "API"],
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ["typescript", "api"] })
    );
  });

  it("marks posts with bad language for admin review", async () => {
    const postId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439014");
    const authorId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
    const flaggedWord = String.fromCharCode(115, 104, 105, 116);
    mockCreate.mockResolvedValueOnce({ _id: postId, author: authorId });

    await createPostService({
      title: "Post",
      content: `This is ${flaggedWord}`,
      image: "image",
      category: "Technology",
      author: authorId,
      tags: [],
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        isModerationHidden: true,
        needsReview: true,
        moderationReasons: ["bad_language"],
      })
    );
    expect(mockReportCreate).toHaveBeenCalledWith({
      targetType: "post",
      post: postId,
      reason: "bad_language",
      source: "system",
      details: "Automatically flagged for bad language review",
    });
    expect(mockCreateNotification).toHaveBeenCalledWith({
      recipientId: authorId,
      type: "post_under_review",
      postId,
      message: "Your post is under review and hidden until moderation is complete.",
    });
  });

  it("unhides an under-review post when the owner edits out bad language", async () => {
    const postId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439014");
    const authorId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
    const post = {
      _id: postId,
      title: "Post",
      content: "Clean content",
      author: authorId,
      isModerationHidden: true,
      needsReview: true,
      moderationReasons: ["bad_language"],
      save: jest.fn(),
    };
    mockFindById.mockResolvedValueOnce(post);

    await expect(
      updatePostService(postId.toString(), authorId.toString(), {
        content: "Clean updated content",
      })
    ).resolves.toEqual(
      expect.objectContaining({
        _id: postId,
        likesCount: 0,
        commentsCount: 0,
        isLikedByMe: false,
        isSavedByMe: false,
      })
    );

    expect(post.isModerationHidden).toBe(false);
    expect(post.needsReview).toBe(false);
    expect(post.moderationReasons).toEqual([]);
    expect(mockReportUpdateMany).toHaveBeenCalledWith(
      {
        targetType: "post",
        post: postId,
        reason: "bad_language",
        source: "system",
        status: { $in: ["pending", "reviewing"] },
      },
      {
        $set: {
          status: "dismissed",
          reviewedAt: expect.any(Date),
          resolutionNote: "Content edited and no longer flagged automatically",
        },
      }
    );
  });

  it("quick searches public posts by one escaped query across searchable fields", async () => {
    await searchPostsService("C++");

    expect(mockFind).toHaveBeenCalledWith({
      visibility: "public",
      isArchived: { $ne: true },
      isModerationHidden: { $ne: true },
      $or: [{ title: /C\+\+/i }, { content: /C\+\+/i }, { category: /C\+\+/i }, { tags: /C\+\+/i }],
    });
    expect(mockPopulate).toHaveBeenCalledWith("author", "name profilePic");
  });

  it("advanced searches by each supplied optional text filter", async () => {
    await advancedSearchPostsService({
      category: "Technology",
      title: "Typescript",
      content: "service",
      tags: [" TypeScript ", "typescript", " API "],
    });

    expect(mockFind).toHaveBeenCalledWith({
      visibility: "public",
      isArchived: { $ne: true },
      isModerationHidden: { $ne: true },
      category: /Technology/i,
      title: /Typescript/i,
      content: /service/i,
      tags: { $all: [/typescript/i, /api/i] },
    });
  });

  it("does not apply absent advanced filters", async () => {
    await advancedSearchPostsService({ title: "only title" });

    expect(mockFind).toHaveBeenCalledWith({
      visibility: "public",
      isArchived: { $ne: true },
      isModerationHidden: { $ne: true },
      title: /only title/i,
    });
  });
});
