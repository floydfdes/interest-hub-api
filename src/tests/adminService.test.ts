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
const mockUserDeleteMany = jest.fn();
const mockUserUpdateMany = jest.fn();
const mockUserSelect = jest.fn();
const mockUserFind = jest.fn(() => ({ select: mockUserSelect }));

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
    find: mockUserFind,
    findById: mockUserFindById,
    findByIdAndDelete: mockUserFindByIdAndDelete,
    deleteMany: mockUserDeleteMany,
    updateMany: mockUserUpdateMany,
  },
}));

import {
  bulkDeleteAdminPostsService,
  bulkDeleteAdminUsersService,
  deleteAdminPostService,
  deleteAdminUserService,
} from "../services/adminService";

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

  it("bulk-deletes selected posts once and reports missing records", async () => {
    const existingId = new mongoose.Types.ObjectId();
    const missingId = new mongoose.Types.ObjectId();
    mockPostSelect.mockResolvedValue([{ _id: existingId }]);
    mockPostDeleteMany.mockResolvedValue({});
    mockCommentDeleteMany.mockResolvedValue({});
    mockPostUpdateMany.mockResolvedValue({});
    mockUserUpdateMany.mockResolvedValue({});

    const result = await bulkDeleteAdminPostsService([
      existingId.toString(),
      existingId.toString(),
      missingId.toString(),
    ]);

    expect(result).toEqual({ requested: 2, deleted: 1 });
    expect(mockPostDeleteMany).toHaveBeenCalledWith({ _id: { $in: [existingId] } });
    expect(mockCommentDeleteMany).toHaveBeenCalledWith({ post: { $in: [existingId] } });
  });

  it("rejects a bulk user deletion when the signed-in admin is selected", async () => {
    const adminId = "507f1f77bcf86cd799439abc";
    mockUserSelect.mockResolvedValue([{ _id: new mongoose.Types.ObjectId(adminId) }]);

    await expect(bulkDeleteAdminUsersService([adminId], adminId)).rejects.toThrow(
      "Cannot delete your own admin account"
    );
    expect(mockUserDeleteMany).not.toHaveBeenCalled();
    expect(mockPostFind).not.toHaveBeenCalled();
  });
});
