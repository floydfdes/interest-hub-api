const mockPopulateComments = jest.fn().mockResolvedValue(null);
const mockPopulateAuthor = jest.fn(() => ({ populate: mockPopulateComments }));
const mockFindOne = jest.fn(() => ({ populate: mockPopulateAuthor }));

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

import { getPostByIdService } from "../services/postService";

describe("getPostByIdService", () => {
  it("populates authors for comments and nested replies", async () => {
    await getPostByIdService("507f1f77bcf86cd799439011");

    expect(mockPopulateComments).toHaveBeenCalledWith({
      path: "comments",
      model: "Comment",
      populate: [
        { path: "user", select: "name profilePic" },
        { path: "replies.user", select: "name profilePic" },
      ],
    });
  });
});
