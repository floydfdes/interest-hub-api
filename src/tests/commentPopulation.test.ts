const mockFindByIdAndUpdate = jest.fn();

jest.mock("../models/Comment", () => ({
  __esModule: true,
  default: {
    findByIdAndUpdate: mockFindByIdAndUpdate,
  },
}));

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {},
}));

import { replyToCommentService } from "../services/commentService";

describe("replyToCommentService", () => {
  it("populates comment and reply authors in its response", async () => {
    const comment = { populate: jest.fn().mockResolvedValue(undefined) };
    mockFindByIdAndUpdate.mockResolvedValue(comment);

    const result = await replyToCommentService(
      "507f1f77bcf86cd799439011",
      "507f1f77bcf86cd799439012",
      "Thank you"
    );

    expect(comment.populate).toHaveBeenCalledWith([
      { path: "user", select: "name profilePic" },
      { path: "replies.user", select: "name profilePic" },
    ]);
    expect(result).toBe(comment);
  });
});
