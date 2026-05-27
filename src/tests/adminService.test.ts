import mongoose from "mongoose";

const mockPostFindByIdAndDelete = jest.fn();
const mockPostDeleteMany = jest.fn();
const mockPostUpdateMany = jest.fn();
const mockPostInsertMany = jest.fn();
const mockPostSelect = jest.fn();
const mockPostFind = jest.fn(() => ({ select: mockPostSelect }));

const mockCommentFindByIdAndDelete = jest.fn();
const mockCommentDeleteMany = jest.fn();
const mockCommentUpdateMany = jest.fn();
const mockCommentSelect = jest.fn();
const mockCommentFind = jest.fn(() => ({ select: mockCommentSelect }));

const mockUserFindById = jest.fn();
const mockUserFindOne = jest.fn();
const mockUserFindByIdAndDelete = jest.fn();
const mockUserInsertMany = jest.fn();
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
    insertMany: mockPostInsertMany,
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
    findOne: mockUserFindOne,
    findByIdAndDelete: mockUserFindByIdAndDelete,
    insertMany: mockUserInsertMany,
    deleteMany: mockUserDeleteMany,
    updateMany: mockUserUpdateMany,
  },
}));

const mockHash = jest.fn().mockResolvedValue("hashed-password");
jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: { hash: mockHash },
}));

const mockUploadImage = jest.fn().mockResolvedValue("uploaded-image");
jest.mock("../utils/uploadImage", () => ({
  uploadImageToCloudinary: mockUploadImage,
}));

import {
  bulkCreateAdminPostsService,
  bulkCreateAdminUsersService,
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
    expect(mockUserUpdateMany).toHaveBeenCalledWith(
      {},
      { $pull: { savedPosts: postId, hiddenPosts: postId } }
    );
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
    expect(mockUserUpdateMany).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        $pull: expect.objectContaining({ blockedUsers: targetObjectId }),
      })
    );
    expect(mockUserUpdateMany).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        $pull: expect.objectContaining({ mutedUsers: targetObjectId }),
      })
    );
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

  it("bulk-creates users with hashed passwords and excludes passwords from the result", async () => {
    const userId = new mongoose.Types.ObjectId();
    const returnedUsers = [{ _id: userId, email: "first@example.com" }];
    mockUserFindOne.mockResolvedValue(null);
    mockUserInsertMany.mockResolvedValue([{ _id: userId }]);
    mockUserSelect.mockResolvedValue(returnedUsers);

    const result = await bulkCreateAdminUsersService([
      { name: "First", email: "FIRST@EXAMPLE.COM", password: "password" },
    ]);

    expect(mockHash).toHaveBeenCalledWith("password", 10);
    expect(mockUserInsertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "First",
        email: "first@example.com",
        password: "hashed-password",
      }),
    ]);
    expect(mockUserSelect).toHaveBeenCalledWith(
      "-password -otp -otpExpires -twoFASecret -resetToken -resetTokenExpiry"
    );
    expect(result).toBe(returnedUsers);
  });

  it("rejects duplicate emails within a bulk user creation request", async () => {
    await expect(
      bulkCreateAdminUsersService([
        { name: "One", email: "same@example.com", password: "password" },
        { name: "Two", email: "SAME@example.com", password: "password" },
      ])
    ).rejects.toThrow("Email already in use");

    expect(mockUserFindOne).not.toHaveBeenCalled();
    expect(mockUserInsertMany).not.toHaveBeenCalled();
  });

  it("bulk-creates posts for active authors with uploaded images and normalized tags", async () => {
    const authorId = new mongoose.Types.ObjectId();
    const createdPosts = [{ _id: new mongoose.Types.ObjectId() }];
    mockUserSelect.mockResolvedValue([{ _id: authorId }]);
    mockPostInsertMany.mockResolvedValue(createdPosts);

    const result = await bulkCreateAdminPostsService([
      {
        author: authorId.toString(),
        title: "First post",
        content: "Content",
        image: "base64-image",
        category: "Tech",
        tags: [" TypeScript ", "typescript", " API "],
        visibility: "public",
      },
    ]);

    expect(mockUploadImage).toHaveBeenCalledWith("base64-image", "post_images");
    expect(mockPostInsertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        author: authorId,
        image: "uploaded-image",
        tags: ["typescript", "api"],
      }),
    ]);
    expect(result).toBe(createdPosts);
  });

  it("does not upload or create bulk posts when an author is missing", async () => {
    mockUserSelect.mockResolvedValue([]);

    await expect(
      bulkCreateAdminPostsService([
        {
          author: new mongoose.Types.ObjectId().toString(),
          title: "Post",
          content: "Content",
          image: "base64-image",
          category: "Tech",
        },
      ])
    ).rejects.toThrow("One or more post authors not found");

    expect(mockUploadImage).not.toHaveBeenCalled();
    expect(mockPostInsertMany).not.toHaveBeenCalled();
  });
});
