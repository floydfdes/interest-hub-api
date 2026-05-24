import mongoose from "mongoose";

const mockPostFindByIdAndDelete = jest.fn();
const mockPostDeleteMany = jest.fn();
const mockPostUpdateMany = jest.fn();
const mockPostSelect = jest.fn();
const mockPostFind = jest.fn(() => ({ select: mockPostSelect }));

const mockCommentFindByIdAndDelete = jest.fn();
const mockCommentDeleteMany = jest.fn();
const mockCommentUpdateMany = jest.fn();
const mockCommentSelect = jest.fn();
const mockCommentFind = jest.fn(() => ({ select: mockCommentSelect }));

const mockUserFindById = jest.fn();
const mockUserFindByIdAndDelete = jest.fn();
const mockUserUpdateMany = jest.fn();

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {
    find: mockPostFind,
    findByIdAndDelete: mockPostFindByIdAndDelete,
    deleteMany: mockPostDeleteMany,
    updateMany: mockPostUpdateMany,
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("../models/Comment", () => ({
  __esModule: true,
  default: {
    find: mockCommentFind,
    findByIdAndDelete: mockCommentFindByIdAndDelete,
    deleteMany: mockCommentDeleteMany,
    updateMany: mockCommentUpdateMany,
  },
}));

jest.mock("../models/User", () => ({
  __esModule: true,
  default: {
    findById: mockUserFindById,
    findByIdAndDelete: mockUserFindByIdAndDelete,
    updateMany: mockUserUpdateMany,
  },
}));

import { deleteAdminPostService, deleteAdminUserService } from "../services/adminService";

describe("admin destructive actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes a post together with comments and saved-post references", async () => {
    const postId = new mongoose.Types.ObjectId();
    mockPostFindByIdAndDelete.mockResolvedValue({ _id: postId });
    mockCommentDeleteMany.mockResolvedValue({});
    mockUserUpdateMany.mockResolvedValue({});

    expect(await deleteAdminPostService(postId.toString())).toBe(true);

    expect(mockCommentDeleteMany).toHaveBeenCalledWith({ post: postId });
    expect(mockPostUpdateMany).toHaveBeenCalledWith(
      { sharedFrom: postId },
      { $set: { sharedFrom: null } }
    );
    expect(mockUserUpdateMany).toHaveBeenCalledWith({}, { $pull: { savedPosts: postId } });
  });

  it("hard-deletes a user and removes their owned and referenced content", async () => {
    const actorId = new mongoose.Types.ObjectId().toString();
    const targetId = new mongoose.Types.ObjectId().toString();
    const targetObjectId = new mongoose.Types.ObjectId(targetId);
    const postId = new mongoose.Types.ObjectId();
    const commentId = new mongoose.Types.ObjectId();
    mockUserFindById.mockResolvedValue({ _id: targetObjectId });
    mockPostSelect.mockResolvedValue([{ _id: postId }]);
    mockCommentSelect.mockResolvedValue([{ _id: commentId }]);
    mockCommentDeleteMany.mockResolvedValue({});
    mockCommentUpdateMany.mockResolvedValue({});
    mockPostDeleteMany.mockResolvedValue({});
    mockPostUpdateMany.mockResolvedValue({});
    mockUserUpdateMany.mockResolvedValue({});
    mockUserFindByIdAndDelete.mockResolvedValue({});

    expect(await deleteAdminUserService(targetId, actorId)).toBe(true);

    expect(mockPostDeleteMany).toHaveBeenCalledWith({ _id: { $in: [postId] } });
    expect(mockPostUpdateMany).toHaveBeenCalledWith(
      { sharedFrom: { $in: [postId] } },
      { $set: { sharedFrom: null } }
    );
    expect(mockCommentDeleteMany).toHaveBeenCalledWith({ _id: { $in: [commentId] } });
    expect(mockCommentUpdateMany).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        $pull: expect.objectContaining({ replies: { user: targetObjectId } }),
      })
    );
    expect(mockUserFindByIdAndDelete).toHaveBeenCalledWith(targetObjectId);
  });

  it("prevents an administrator from deleting their own account", async () => {
    const adminId = "507f1f77bcf86cd799439abc";
    mockUserFindById.mockResolvedValue({ _id: new mongoose.Types.ObjectId(adminId) });

    await expect(deleteAdminUserService(adminId.toUpperCase(), adminId)).rejects.toThrow(
      "Cannot delete your own admin account"
    );
    expect(mockUserFindByIdAndDelete).not.toHaveBeenCalled();
  });
});
