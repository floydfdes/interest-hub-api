import mongoose from "mongoose";

const mockPostSelect = jest.fn();
const mockPostFindById = jest.fn(() => ({ select: mockPostSelect }));
const mockPostFindByIdAndUpdate = jest.fn();
const mockCommentSelect = jest.fn();
const mockCommentFindById = jest.fn(() => ({ select: mockCommentSelect }));
const mockCommentFindByIdAndUpdate = jest.fn();
const mockUserSelect = jest.fn();
const mockUserFindOne = jest.fn(() => ({ select: mockUserSelect }));
const mockUserFindById = jest.fn();
const mockReportFindOne = jest.fn();
const mockReportCreate = jest.fn();
const mockReportFindById = jest.fn();

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {
    findById: mockPostFindById,
    findByIdAndUpdate: mockPostFindByIdAndUpdate,
  },
}));

jest.mock("../models/Comment", () => ({
  __esModule: true,
  default: {
    findById: mockCommentFindById,
    findByIdAndUpdate: mockCommentFindByIdAndUpdate,
  },
}));

jest.mock("../models/User", () => ({
  __esModule: true,
  default: {
    findOne: mockUserFindOne,
    findById: mockUserFindById,
  },
}));

jest.mock("../models/Report", () => ({
  __esModule: true,
  default: {
    findOne: mockReportFindOne,
    create: mockReportCreate,
    findById: mockReportFindById,
  },
}));

jest.mock("../services/adminService", () => ({
  deleteAdminCommentService: jest.fn(),
  deleteAdminPostService: jest.fn(),
}));

import {
  createReportService,
  moderateReportService,
  reviewReportService,
} from "../services/reportService";

describe("reporting and moderation", () => {
  const reporterId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
  const targetUserId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");
  const postId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");
  const adminId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439014");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits a post report against content owned by another user", async () => {
    const createdReport = { _id: new mongoose.Types.ObjectId() };
    mockPostSelect.mockResolvedValueOnce({ author: targetUserId });
    mockReportFindOne.mockResolvedValueOnce(null);
    mockReportCreate.mockResolvedValueOnce(createdReport);

    await expect(
      createReportService({
        reporterId: reporterId.toString(),
        targetType: "post",
        targetId: postId.toString(),
        reason: "spam",
        details: " repeated links ",
      })
    ).resolves.toBe(createdReport);

    expect(mockReportCreate).toHaveBeenCalledWith({
      reporter: reporterId,
      source: "user",
      targetType: "post",
      post: postId,
      reason: "spam",
      details: "repeated links",
    });
  });

  it("rejects reports against the reporter's own content", async () => {
    mockPostSelect.mockResolvedValueOnce({ author: reporterId });

    await expect(
      createReportService({
        reporterId: reporterId.toString(),
        targetType: "post",
        targetId: postId.toString(),
        reason: "spam",
      })
    ).rejects.toThrow("Cannot report your own content");
    expect(mockReportCreate).not.toHaveBeenCalled();
  });

  it("hides reported content and resolves the report", async () => {
    const report = {
      targetType: "post",
      post: postId,
      action: "none",
      status: "pending",
      reviewedBy: undefined,
      reviewedAt: undefined,
      save: jest.fn(),
    };
    mockReportFindById.mockResolvedValueOnce(report);
    mockPostFindByIdAndUpdate.mockResolvedValueOnce({ _id: postId });

    await expect(
      moderateReportService("report-id", adminId.toString(), "content_hidden")
    ).resolves.toBe(report);

    expect(mockPostFindByIdAndUpdate).toHaveBeenCalledWith(
      postId,
      { $set: { isModerationHidden: true, needsReview: false } },
      { new: true }
    );
    expect(report.action).toBe("content_hidden");
    expect(report.status).toBe("resolved");
    expect(report.save).toHaveBeenCalled();
  });

  it("dismisses automatic bad language reports by approving the content", async () => {
    const report = {
      reason: "bad_language",
      targetType: "post",
      post: postId,
      status: "pending",
      reviewedBy: undefined,
      reviewedAt: undefined,
      save: jest.fn(),
    };
    mockReportFindById.mockResolvedValueOnce(report);
    mockPostFindByIdAndUpdate.mockResolvedValueOnce({ _id: postId });

    await expect(
      reviewReportService("report-id", adminId.toString(), "dismissed", "Allowed")
    ).resolves.toBe(report);

    expect(mockPostFindByIdAndUpdate).toHaveBeenCalledWith(postId, {
      $set: { needsReview: false, isModerationHidden: false },
      $pull: { moderationReasons: "bad_language" },
    });
    expect(report.status).toBe("dismissed");
    expect(report.save).toHaveBeenCalled();
  });

  it("suspends the user named by a user report", async () => {
    const user = { isBlocked: false, save: jest.fn() };
    const report = {
      targetType: "user",
      targetUser: targetUserId,
      action: "none",
      status: "pending",
      reviewedBy: undefined,
      reviewedAt: undefined,
      save: jest.fn(),
    };
    mockReportFindById.mockResolvedValueOnce(report);
    mockUserFindById.mockResolvedValueOnce(user);

    await moderateReportService("report-id", adminId.toString(), "user_suspended");

    expect(user.isBlocked).toBe(true);
    expect(user.save).toHaveBeenCalled();
    expect(report.status).toBe("resolved");
  });
});
