import mongoose from "mongoose";
import Comment from "../models/Comment";
import Post from "../models/Post";
import Report, {
  ReportAction,
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from "../models/Report";
import User from "../models/User";
import { paginatedResponse, PaginationParams } from "../utils/pagination";
import { deleteAdminCommentService, deleteAdminPostService } from "./adminService";

interface CreateReportInput {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}

const targetQuery = (targetType: ReportTargetType, targetId: mongoose.Types.ObjectId) =>
  targetType === "post"
    ? { post: targetId }
    : targetType === "comment"
      ? { comment: targetId }
      : { targetUser: targetId };

export const createReportService = async ({
  reporterId,
  targetType,
  targetId,
  reason,
  details,
}: CreateReportInput) => {
  const reporterObjectId = new mongoose.Types.ObjectId(reporterId);
  const targetObjectId = new mongoose.Types.ObjectId(targetId);
  let ownerId: mongoose.Types.ObjectId;

  if (targetType === "post") {
    const post = await Post.findById(targetObjectId).select("author");
    if (!post) throw new Error("Report target not found");
    ownerId = post.author;
  } else if (targetType === "comment") {
    const comment = await Comment.findById(targetObjectId).select("user");
    if (!comment) throw new Error("Report target not found");
    ownerId = comment.user;
  } else {
    const user = await User.findOne({ _id: targetObjectId, isDeleted: false }).select("_id");
    if (!user) throw new Error("Report target not found");
    ownerId = user._id;
  }

  if (ownerId.equals(reporterObjectId)) throw new Error("Cannot report your own content");

  const targets = targetQuery(targetType, targetObjectId);
  const existing = await Report.findOne({
    reporter: reporterObjectId,
    targetType,
    ...targets,
    status: { $in: ["pending", "reviewing"] },
  });
  if (existing) throw new Error("You have already reported this content");

  return Report.create({
    reporter: reporterObjectId,
    targetType,
    ...targets,
    reason,
    ...(details?.trim() && { details: details.trim() }),
  });
};

export const getMyReportsService = async (reporterId: string, pagination: PaginationParams) => {
  const filter = { reporter: reporterId };
  const [reports, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
    Report.countDocuments(filter),
  ]);
  return paginatedResponse(reports, total, pagination);
};

interface AdminReportFilters {
  status?: ReportStatus;
  targetType?: ReportTargetType;
  pagination: PaginationParams;
}

const populateReport = <T extends { populate: (...args: any[]) => T }>(query: T): T =>
  query
    .populate("reporter", "name email profilePic")
    .populate("targetUser", "name email profilePic isBlocked")
    .populate("post", "title content image author isModerationHidden")
    .populate("comment", "content user post isModerationHidden")
    .populate("reviewedBy", "name email profilePic");

export const getAdminReportsService = async ({
  status,
  targetType,
  pagination,
}: AdminReportFilters) => {
  const filter = {
    ...(status && { status }),
    ...(targetType && { targetType }),
  };
  const [reports, total] = await Promise.all([
    populateReport(Report.find(filter))
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Report.countDocuments(filter),
  ]);
  return paginatedResponse(reports, total, pagination);
};

export const getAdminReportByIdService = async (id: string) => populateReport(Report.findById(id));

export const reviewReportService = async (
  id: string,
  adminId: string,
  status: Exclude<ReportStatus, "pending">,
  note?: string
) => {
  return Report.findByIdAndUpdate(
    id,
    {
      status,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      ...(note !== undefined && { resolutionNote: note.trim() }),
    },
    { new: true }
  );
};

export const moderateReportService = async (
  id: string,
  adminId: string,
  action: Exclude<ReportAction, "none">,
  note?: string
) => {
  const report = await Report.findById(id);
  if (!report) return null;

  if (action === "content_hidden") {
    if (report.targetType === "post" && report.post) {
      const post = await Post.findByIdAndUpdate(
        report.post,
        { $set: { isModerationHidden: true } },
        { new: true }
      );
      if (!post) throw new Error("Reported content not found");
    } else if (report.targetType === "comment" && report.comment) {
      const comment = await Comment.findByIdAndUpdate(
        report.comment,
        { $set: { isModerationHidden: true } },
        { new: true }
      );
      if (!comment) throw new Error("Reported content not found");
    } else {
      throw new Error("Action is not available for this report");
    }
  }

  if (action === "content_removed") {
    const removed =
      report.targetType === "post" && report.post
        ? await deleteAdminPostService(report.post.toString())
        : report.targetType === "comment" && report.comment
          ? await deleteAdminCommentService(report.comment.toString())
          : false;
    if (!removed) {
      throw new Error(
        report.targetType === "user"
          ? "Action is not available for this report"
          : "Reported content not found"
      );
    }
  }

  if (action === "user_suspended") {
    let responsibleUserId = report.targetUser;
    if (report.targetType === "post" && report.post) {
      const post = await Post.findById(report.post).select("author");
      responsibleUserId = post?.author;
    }
    if (report.targetType === "comment" && report.comment) {
      const comment = await Comment.findById(report.comment).select("user");
      responsibleUserId = comment?.user;
    }
    if (!responsibleUserId) throw new Error("Reported user not found");
    if (responsibleUserId.toString() === adminId) {
      throw new Error("Cannot suspend your own admin account");
    }
    const user = await User.findById(responsibleUserId);
    if (!user) throw new Error("Reported user not found");
    user.isBlocked = true;
    await user.save();
  }

  report.action = action;
  report.status = "resolved";
  report.reviewedBy = new mongoose.Types.ObjectId(adminId);
  report.reviewedAt = new Date();
  if (note !== undefined) report.resolutionNote = note.trim();
  await report.save();
  return report;
};
