import mongoose from "mongoose";

const mockPostCreate = jest.fn();
const mockPostFindOne = jest.fn();
const mockPostCountDocuments = jest.fn();
const mockPostPopulate = jest.fn().mockResolvedValue([]);
const mockPostLimit = jest.fn(() => ({ populate: mockPostPopulate }));
const mockPostSkip = jest.fn(() => ({ limit: mockPostLimit }));
const mockPostSort = jest.fn(() => ({ skip: mockPostSkip }));
const mockPostFind = jest.fn(() => ({ sort: mockPostSort }));
const mockReportFindOne = jest.fn();
const mockReportCreate = jest.fn();
const mockReportUpdateMany = jest.fn();
const mockCreateNotification = jest.fn();

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {
    create: mockPostCreate,
    countDocuments: mockPostCountDocuments,
    find: mockPostFind,
    findOne: mockPostFindOne,
  },
}));

jest.mock("../models/Comment", () => ({
  __esModule: true,
  default: {},
}));

jest.mock("../models/Report", () => ({
  __esModule: true,
  default: {
    findOne: mockReportFindOne,
    create: mockReportCreate,
    updateMany: mockReportUpdateMany,
  },
}));

jest.mock("../models/User", () => ({
  __esModule: true,
  default: {},
}));

jest.mock("../utils/uploadImage", () => ({
  uploadImageToCloudinary: jest.fn().mockResolvedValue("uploaded-image"),
}));

jest.mock("../services/notificationService", () => ({
  createNotification: mockCreateNotification,
}));

import {
  createDraftPostService,
  getDraftPostsService,
  publishDraftPostService,
  updateDraftPostService,
} from "../services/postService";

describe("draft posts", () => {
  const authorId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
  const postId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");

  beforeEach(() => {
    jest.clearAllMocks();
    mockPostCountDocuments.mockResolvedValue(1);
    mockPostPopulate.mockResolvedValue([]);
    mockReportFindOne.mockResolvedValue(null);
    mockCreateNotification.mockResolvedValue({});
  });

  it("creates an owner-only draft without requiring publish fields", async () => {
    mockPostCreate.mockResolvedValueOnce({
      _id: postId,
      author: authorId,
      status: "draft",
      likes: [],
      comments: [],
    });

    await createDraftPostService({ author: authorId, title: "Idea" });

    expect(mockPostCreate).toHaveBeenCalledWith({
      title: "Idea",
      content: "",
      category: "",
      tags: [],
      visibility: "public",
      author: authorId,
      image: "",
      status: "draft",
      isModerationHidden: false,
      needsReview: false,
      moderationReasons: [],
    });
  });

  it("updates only drafts owned by the user", async () => {
    const draft: Record<string, unknown> & {
      status: string;
      save: jest.Mock;
    } = {
      _id: postId,
      author: authorId,
      status: "draft",
      title: "",
      tags: [],
      save: jest.fn(),
    };
    mockPostFindOne.mockResolvedValueOnce(draft);

    await updateDraftPostService(postId.toString(), authorId.toString(), {
      title: "Updated",
      tags: [" Travel ", "travel"],
    });

    expect(mockPostFindOne).toHaveBeenCalledWith({
      _id: postId.toString(),
      author: authorId.toString(),
      status: "draft",
    });
    expect(draft.title).toBe("Updated");
    expect(draft.tags).toEqual(["travel"]);
    expect(draft.save).toHaveBeenCalled();
  });

  it("does not publish incomplete drafts", async () => {
    mockPostFindOne.mockResolvedValueOnce({
      _id: postId,
      author: authorId,
      status: "draft",
      title: "Almost",
      content: "",
      category: "Travel",
      image: "",
    });

    await expect(publishDraftPostService(postId.toString(), authorId.toString())).rejects.toThrow(
      "Draft is missing required fields: content, image"
    );
  });

  it("publishes complete drafts", async () => {
    const draft: Record<string, unknown> & {
      status: string;
      isModerationHidden?: boolean;
      needsReview?: boolean;
      moderationReasons?: string[];
      save: jest.Mock;
    } = {
      _id: postId,
      author: authorId,
      status: "draft",
      title: "Ready",
      content: "Clean content",
      category: "Travel",
      image: "image-url",
      likes: [],
      comments: [],
      save: jest.fn(),
    };
    mockPostFindOne.mockResolvedValueOnce(draft);

    await publishDraftPostService(postId.toString(), authorId.toString());

    expect(draft.status).toBe("published");
    expect(draft.isModerationHidden).toBe(false);
    expect(draft.needsReview).toBe(false);
    expect(draft.moderationReasons).toEqual([]);
    expect(draft.save).toHaveBeenCalled();
  });

  it("returns paginated drafts for the owner", async () => {
    await getDraftPostsService(authorId.toString(), { page: 1, limit: 20, skip: 0 });

    expect(mockPostFind).toHaveBeenCalledWith({
      author: authorId.toString(),
      status: "draft",
      isArchived: { $ne: true },
    });
    expect(mockPostSort).toHaveBeenCalledWith({ updatedAt: -1 });
  });
});
