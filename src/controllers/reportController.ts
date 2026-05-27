import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { ReportReason, ReportTargetType } from "../models/Report";
import { getActivityRequestContext, recordActivity } from "../services/activityService";
import { createReportService, getMyReportsService } from "../services/reportService";
import { logError } from "../utils/logger";
import { getPagination } from "../utils/pagination";

export const createReport = async (req: AuthRequest, res: Response) => {
  try {
    const report = await createReportService({
      reporterId: req.userId!,
      targetType: req.body.targetType as ReportTargetType,
      targetId: req.body.targetId,
      reason: req.body.reason as ReportReason,
      details: req.body.details,
    });
    await recordActivity({
      actorId: req.userId!,
      type: "report_submitted",
      reportId: report._id.toString(),
      ...(report.targetType === "user" && { targetUserId: req.body.targetId }),
      ...(report.targetType === "post" && { postId: req.body.targetId }),
      metadata: { targetType: report.targetType, reason: report.reason },
      ...getActivityRequestContext(req),
    });
    res.status(201).json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit report";
    if (message === "Report target not found") {
      res.status(404).json({ message });
      return;
    }
    if (message.startsWith("Cannot ") || message.startsWith("You have already ")) {
      res.status(400).json({ message });
      return;
    }
    logError("Failed to submit report", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to submit report" });
  }
};

export const getMyReports = async (req: AuthRequest, res: Response) => {
  try {
    res.status(200).json(await getMyReportsService(req.userId!, getPagination(req.query)));
  } catch (error) {
    logError("Failed to fetch reports", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to fetch reports" });
  }
};
