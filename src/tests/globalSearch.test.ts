import mongoose from "mongoose";

const mockUserLimit = jest.fn();
const mockUserSelect = jest.fn(() => ({ limit: mockUserLimit }));
const mockUserFind = jest.fn(() => ({ select: mockUserSelect }));
const mockUserFindOneSelect = jest.fn();
const mockUserFindOne = jest.fn(() => ({ select: mockUserFindOneSelect }));

const mockPostPopulate = jest.fn();
const mockPostLimit = jest.fn(() => ({ populate: mockPostPopulate }));
const mockPostSort = jest.fn(() => ({ limit: mockPostLimit }));
const mockPostFind = jest.fn(() => ({ sort: mockPostSort }));
const mockPostAggregate = jest.fn();

jest.mock("../models/User", () => ({
  __esModule: true,
  default: {
    find: mockUserFind,
    findOne: mockUserFindOne,
  },
}));

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {
    aggregate: mockPostAggregate,
    find: mockPostFind,
  },
}));

import { globalSearchService } from "../services/searchService";

describe("globalSearchService", () => {
  const viewerId = "507f1f77bcf86cd799439011";
  const savedPostId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserFindOneSelect.mockResolvedValue({ savedPosts: [savedPostId] });
    mockUserLimit.mockResolvedValue([]);
    mockPostPopulate.mockResolvedValue([]);
    mockPostAggregate.mockResolvedValue([]);
  });

  it("searches users, posts, and tags in one response", async () => {
    const user = {
      toObject: () => ({
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439013"),
        name: "Travel Friend",
        username: "traveler",
        profilePic: "",
        bio: "Public bio",
        interests: ["travel"],
        isPrivate: false,
      }),
    };
    mockUserLimit.mockResolvedValueOnce([user]);
    mockPostPopulate.mockResolvedValueOnce([{ _id: savedPostId, likes: [], comments: [] }]);
    mockPostAggregate.mockResolvedValueOnce([{ tag: "travel", postsCount: 4 }]);

    const result = await globalSearchService("travel", viewerId, 5);

    expect(mockUserFind).toHaveBeenCalledWith({
      isDeleted: false,
      isBlocked: { $ne: true },
      $or: [
        { name: /travel/i },
        { username: /travel/i },
        { interests: /travel/i, isPrivate: { $ne: true } },
      ],
    });
    expect(mockPostFind).toHaveBeenCalledWith({
      visibility: "public",
      status: { $ne: "draft" },
      isArchived: { $ne: true },
      isModerationHidden: { $ne: true },
      $or: [
        { title: /travel/i },
        { content: /travel/i },
        { category: /travel/i },
        { tags: /travel/i },
      ],
    });
    expect(result).toEqual({
      query: "travel",
      users: [
        {
          _id: expect.any(mongoose.Types.ObjectId),
          name: "Travel Friend",
          username: "traveler",
          profilePic: null,
          bio: "Public bio",
          interests: ["travel"],
          isPrivate: false,
        },
      ],
      posts: [expect.objectContaining({ _id: savedPostId, isSavedByMe: true })],
      tags: [{ tag: "travel", postsCount: 4 }],
    });
  });

  it("returns restricted data for private users", async () => {
    mockUserLimit.mockResolvedValueOnce([
      {
        toObject: () => ({
          _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439014"),
          name: "Private User",
          username: "private_user",
          profilePic: null,
          bio: "secret",
          interests: ["secret"],
          isPrivate: true,
        }),
      },
    ]);

    const result = await globalSearchService("private", viewerId, 5);

    expect(result.users[0]).toEqual({
      _id: expect.any(mongoose.Types.ObjectId),
      name: "Private User",
      username: "private_user",
      profilePic: null,
      isPrivate: true,
    });
  });
});
