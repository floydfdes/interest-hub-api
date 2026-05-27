import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  bulkDeleteAdminCommentsService,
  bulkDeleteAdminPostsService,
  bulkDeleteAdminUsersService,
  bulkCreateAdminPostsService,
  bulkCreateAdminUsersService,
  createAdminUserService,
  deleteAdminCommentService,
  deleteAdminPostService,
  deleteAdminReplyService,
  deleteAdminUserService,
  getAdminDashboardService,
  getAdminPostByIdService,
  getAdminPostsService,
  getAdminUserByIdService,
  getAdminUsersService,
  setAdminUserBlockedService,
  updateAdminUserService,
} from "../services/adminService";
import { Visibility } from "../models/Post";
import { logError } from "../utils/logger";
import { getPagination } from "../utils/pagination";
import {
  getActivityRequestContext,
  getAdminActivitiesService,
  recordActivity,
} from "../services/activityService";
import { USER_ACTIVITY_TYPES, UserActivityType } from "../models/UserActivity";
import {
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  ReportStatus,
  ReportTargetType,
} from "../models/Report";
import {
  getAdminReportByIdService,
  getAdminReportsService,
  moderateReportService,
  reviewReportService,
} from "../services/reportService";

const errorResponse = (res: Response, error: unknown, operation: string): void => {
  const message = error instanceof Error ? error.message : operation;
  if (message === "Email already in use") {
    res.status(409).json({ message });
    return;
  }
  if (message === "One or more post authors not found") {
    res.status(404).json({ message });
    return;
  }
  if (message === "Reported content not found" || message === "Reported user not found") {
    res.status(404).json({ message });
    return;
  }
  if (message === "Action is not available for this report") {
    res.status(400).json({ message });
    return;
  }
  if (message.startsWith("Cannot ")) {
    res.status(400).json({ message });
    return;
  }

  logError(operation, error);
  res.status(500).json({ message: operation });
};

export const checkAdminAccess = async (_req: AuthRequest, res: Response) => {
  res.status(200).json({ isAdmin: true });
};

export const getAdminDashboard = async (_req: AuthRequest, res: Response) => {
  try {
    res.status(200).json(await getAdminDashboardService());
  } catch (error) {
    errorResponse(res, error, "Failed to fetch admin dashboard");
  }
};

export const getAdminActivities = async (req: AuthRequest, res: Response) => {
  const rawType = typeof req.query.type === "string" ? req.query.type : undefined;
  const actorId = typeof req.query.actorId === "string" ? req.query.actorId : undefined;
  if (rawType && !USER_ACTIVITY_TYPES.includes(rawType as UserActivityType)) {
    res.status(400).json({ message: "Invalid activity type" });
    return;
  }
  if (actorId && !mongoose.isValidObjectId(actorId)) {
    res.status(400).json({ message: "Invalid actor ID" });
    return;
  }

  try {
    res.status(200).json(
      await getAdminActivitiesService(
        {
          actorId,
          type: rawType as UserActivityType | undefined,
        },
        getPagination(req.query, 20, 100)
      )
    );
  } catch (error) {
    errorResponse(res, error, "Failed to fetch activities");
  }
};

export const getAdminReports = async (req: AuthRequest, res: Response) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const targetType = typeof req.query.targetType === "string" ? req.query.targetType : undefined;
  if (status && !REPORT_STATUSES.includes(status as ReportStatus)) {
    res.status(400).json({ message: "Invalid report status" });
    return;
  }
  if (targetType && !REPORT_TARGET_TYPES.includes(targetType as ReportTargetType)) {
    res.status(400).json({ message: "Invalid report target type" });
    return;
  }

  try {
    res.status(200).json(
      await getAdminReportsService({
        status: status as ReportStatus | undefined,
        targetType: targetType as ReportTargetType | undefined,
        pagination: getPagination(req.query, 20, 100),
      })
    );
  } catch (error) {
    errorResponse(res, error, "Failed to fetch reports");
  }
};

export const getAdminReportById = async (req: AuthRequest, res: Response) => {
  try {
    const report = await getAdminReportByIdService(req.params.id);
    if (!report) {
      res.status(404).json({ message: "Report not found" });
      return;
    }
    res.status(200).json(report);
  } catch (error) {
    errorResponse(res, error, "Failed to fetch report");
  }
};

export const reviewAdminReport = async (req: AuthRequest, res: Response) => {
  try {
    const report = await reviewReportService(
      req.params.id,
      req.userId!,
      req.body.status,
      req.body.note
    );
    if (!report) {
      res.status(404).json({ message: "Report not found" });
      return;
    }
    res.status(200).json(report);
  } catch (error) {
    errorResponse(res, error, "Failed to review report");
  }
};

export const moderateAdminReport = async (req: AuthRequest, res: Response) => {
  try {
    const report = await moderateReportService(
      req.params.id,
      req.userId!,
      req.body.action,
      req.body.note
    );
    if (!report) {
      res.status(404).json({ message: "Report not found" });
      return;
    }
    if (req.body.action === "user_suspended" && report.targetUser) {
      await recordActivity({
        actorId: req.userId!,
        type: "user_blocked",
        targetUserId: report.targetUser.toString(),
        reportId: report._id.toString(),
        metadata: { action: "user_suspended" },
        ...getActivityRequestContext(req),
      });
    }
    res.status(200).json(report);
  } catch (error) {
    errorResponse(res, error, "Failed to moderate report");
  }
};

export const getAdminUsers = async (req: AuthRequest, res: Response) => {
  try {
    const query = typeof req.query.query === "string" ? req.query.query.trim() : undefined;
    res.status(200).json(await getAdminUsersService(query, getPagination(req.query, 20, 100)));
  } catch (error) {
    errorResponse(res, error, "Failed to fetch users");
  }
};

export const getAdminUserById = async (req: AuthRequest, res: Response) => {
  try {
    const result = await getAdminUserByIdService(req.params.id);
    if (!result) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    errorResponse(res, error, "Failed to fetch user");
  }
};

export const createAdminUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await createAdminUserService(req.body);
    res.status(201).json(user);
  } catch (error) {
    errorResponse(res, error, "Failed to create user");
  }
};

export const bulkCreateAdminUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await bulkCreateAdminUsersService(req.body.users);
    res.status(201).json({ message: "Users created", created: users.length, users });
  } catch (error) {
    errorResponse(res, error, "Failed to create users");
  }
};

export const updateAdminUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await updateAdminUserService(req.params.id, req.userId!, req.body);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(user);
  } catch (error) {
    errorResponse(res, error, "Failed to update user");
  }
};

export const deleteAdminUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!(await deleteAdminUserService(req.params.id, req.userId!))) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    errorResponse(res, error, "Failed to delete user");
  }
};

export const bulkDeleteAdminUsers = async (req: AuthRequest, res: Response) => {
  try {
    const result = await bulkDeleteAdminUsersService(req.body.ids, req.userId!);
    res.status(200).json({ message: "Users deleted", ...result });
  } catch (error) {
    errorResponse(res, error, "Failed to delete users");
  }
};

export const blockAdminUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await setAdminUserBlockedService(req.params.id, req.userId!, true);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    await recordActivity({
      actorId: req.userId!,
      type: "user_blocked",
      targetUserId: req.params.id,
      ...getActivityRequestContext(req),
    });
    res.status(200).json(user);
  } catch (error) {
    errorResponse(res, error, "Failed to block user");
  }
};

export const unblockAdminUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await setAdminUserBlockedService(req.params.id, req.userId!, false);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    await recordActivity({
      actorId: req.userId!,
      type: "user_unblocked",
      targetUserId: req.params.id,
      ...getActivityRequestContext(req),
    });
    res.status(200).json(user);
  } catch (error) {
    errorResponse(res, error, "Failed to unblock user");
  }
};

export const getAdminPosts = async (req: AuthRequest, res: Response) => {
  const rawVisibility = typeof req.query.visibility === "string" ? req.query.visibility : undefined;
  const visibilityValues: Visibility[] = ["public", "private", "followersOnly"];
  if (rawVisibility && !visibilityValues.includes(rawVisibility as Visibility)) {
    res.status(400).json({ message: "Invalid visibility value" });
    return;
  }

  try {
    res.status(200).json(
      await getAdminPostsService({
        query: typeof req.query.query === "string" ? req.query.query.trim() : undefined,
        authorId: typeof req.query.authorId === "string" ? req.query.authorId : undefined,
        visibility: rawVisibility as Visibility | undefined,
        pagination: getPagination(req.query, 20, 100),
      })
    );
  } catch (error) {
    errorResponse(res, error, "Failed to fetch posts");
  }
};

export const getAdminPostById = async (req: AuthRequest, res: Response) => {
  try {
    const post = await getAdminPostByIdService(req.params.id);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }
    res.status(200).json(post);
  } catch (error) {
    errorResponse(res, error, "Failed to fetch post");
  }
};

export const bulkCreateAdminPosts = async (req: AuthRequest, res: Response) => {
  try {
    const posts = await bulkCreateAdminPostsService(req.body.posts);
    res.status(201).json({ message: "Posts created", created: posts.length, posts });
  } catch (error) {
    errorResponse(res, error, "Failed to create posts");
  }
};

export const deleteAdminPost = async (req: AuthRequest, res: Response) => {
  try {
    if (!(await deleteAdminPostService(req.params.id))) {
      res.status(404).json({ message: "Post not found" });
      return;
    }
    res.status(200).json({ message: "Post deleted" });
  } catch (error) {
    errorResponse(res, error, "Failed to delete post");
  }
};

export const bulkDeleteAdminPosts = async (req: AuthRequest, res: Response) => {
  try {
    const result = await bulkDeleteAdminPostsService(req.body.ids);
    res.status(200).json({ message: "Posts deleted", ...result });
  } catch (error) {
    errorResponse(res, error, "Failed to delete posts");
  }
};

export const deleteAdminComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!(await deleteAdminCommentService(req.params.commentId))) {
      res.status(404).json({ message: "Comment not found" });
      return;
    }
    res.status(200).json({ message: "Comment deleted" });
  } catch (error) {
    errorResponse(res, error, "Failed to delete comment");
  }
};

export const bulkDeleteAdminComments = async (req: AuthRequest, res: Response) => {
  try {
    const result = await bulkDeleteAdminCommentsService(req.body.ids);
    res.status(200).json({ message: "Comments deleted", ...result });
  } catch (error) {
    errorResponse(res, error, "Failed to delete comments");
  }
};

export const deleteAdminReply = async (req: AuthRequest, res: Response) => {
  const replyIndex = Number.parseInt(req.params.replyIndex, 10);
  if (!Number.isInteger(replyIndex) || replyIndex < 0) {
    res.status(400).json({ message: "Invalid reply index" });
    return;
  }

  try {
    if (!(await deleteAdminReplyService(req.params.commentId, replyIndex))) {
      res.status(404).json({ message: "Comment or reply not found" });
      return;
    }
    res.status(200).json({ message: "Reply deleted" });
  } catch (error) {
    errorResponse(res, error, "Failed to delete reply");
  }
};
