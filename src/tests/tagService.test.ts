import mongoose from "mongoose";

const mockAggregate = jest.fn();
const mockCountDocuments = jest.fn();
const mockPopulate = jest.fn().mockResolvedValue([]);
const mockLimit = jest.fn(() => ({ populate: mockPopulate }));
const mockSkip = jest.fn(() => ({ limit: mockLimit }));
const mockSort = jest.fn(() => ({ skip: mockSkip }));
const mockFind = jest.fn(() => ({ sort: mockSort }));
const mockUserSelect = jest.fn();
const mockUserFindOne = jest.fn(() => ({ select: mockUserSelect }));

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {
    aggregate: mockAggregate,
    countDocuments: mockCountDocuments,
    find: mockFind,
  },
}));

jest.mock("../models/User", () => ({
  __esModule: true,
  default: {
    findOne: mockUserFindOne,
  },
}));

import {
  getPostsByTagService,
  getTagSuggestionsService,
  getTrendingTagsService,
} from "../services/tagService";

describe("tagService", () => {
  const viewerId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
  const savedPostId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");

  beforeEach(() => {
    jest.clearAllMocks();
    mockAggregate.mockResolvedValue([]);
    mockCountDocuments.mockResolvedValue(0);
    mockPopulate.mockResolvedValue([]);
    mockUserSelect.mockResolvedValue({ savedPosts: [savedPostId] });
  });

  it("returns popular tag suggestions matching the query prefix", async () => {
    await getTagSuggestionsService("Tra", 5);

    const pipeline = mockAggregate.mock.calls[0][0];
    expect(pipeline).toContainEqual({
      $match: {
        visibility: "public",
        isArchived: { $ne: true },
        isModerationHidden: { $ne: true },
        tags: /^tra/i,
      },
    });
    expect(pipeline).toContainEqual({ $limit: 5 });
    expect(pipeline).toContainEqual({ $project: { _id: 0, tag: "$_id", postsCount: 1 } });
  });

  it("returns trending tags ordered by public post usage", async () => {
    await getTrendingTagsService(20);

    const pipeline = mockAggregate.mock.calls[0][0];
    expect(pipeline).toContainEqual({
      $sort: { postsCount: -1, lastUsedAt: -1, _id: 1 },
    });
    expect(pipeline).toContainEqual({ $limit: 20 });
  });

  it("returns paginated lightweight posts for one normalized tag", async () => {
    mockPopulate.mockResolvedValueOnce([{ _id: savedPostId, likes: [viewerId], comments: [] }]);
    mockCountDocuments.mockResolvedValueOnce(1);

    const result = await getPostsByTagService(
      " Travel ",
      { page: 1, limit: 20, skip: 0 },
      viewerId.toString()
    );

    expect(mockFind).toHaveBeenCalledWith({
      visibility: "public",
      isArchived: { $ne: true },
      isModerationHidden: { $ne: true },
      tags: "travel",
    });
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        _id: savedPostId,
        likesCount: 1,
        commentsCount: 0,
        isLikedByMe: true,
        isSavedByMe: true,
      })
    );
  });
});
