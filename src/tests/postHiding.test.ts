import mongoose from "mongoose";

const mockPostSelect = jest.fn();
const mockPostFindOne = jest.fn(() => ({ select: mockPostSelect }));
const mockPostPopulate = jest.fn().mockResolvedValue([]);
const mockPostLimit = jest.fn(() => ({ populate: mockPostPopulate }));
const mockPostSkip = jest.fn(() => ({ limit: mockPostLimit }));
const mockPostSort = jest.fn(() => ({ skip: mockPostSkip }));
const mockPostFind = jest.fn(() => ({ sort: mockPostSort }));
const mockPostCountDocuments = jest.fn().mockResolvedValue(1);

const mockUserSelect = jest.fn();
const mockUserFindOne = jest.fn(() => ({ select: mockUserSelect }));

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {
    findOne: mockPostFindOne,
    find: mockPostFind,
    countDocuments: mockPostCountDocuments,
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

import { getHiddenPostsService, hidePostService, unhidePostService } from "../services/postService";

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
    });
    expect(result?.pagination.total).toBe(1);
  });
});
