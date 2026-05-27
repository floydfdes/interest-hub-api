const mockPopulate = jest.fn().mockResolvedValue([]);
const mockFind = jest.fn(() => ({ populate: mockPopulate }));
const mockCreate = jest.fn().mockResolvedValue({});

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {
    create: mockCreate,
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

import {
  advancedSearchPostsService,
  createPostService,
  searchPostsService,
} from "../services/postService";
import mongoose from "mongoose";

describe("post search and tags", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it("quick searches public posts by one escaped query across searchable fields", async () => {
    await searchPostsService("C++");

    expect(mockFind).toHaveBeenCalledWith({
      visibility: "public",
      isArchived: { $ne: true },
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
      title: /only title/i,
    });
  });
});
