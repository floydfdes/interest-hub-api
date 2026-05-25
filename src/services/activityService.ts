import mongoose from "mongoose";
import { Request } from "express";
import UserActivity, { UserActivityType } from "../models/UserActivity";
import { paginatedResponse, PaginationParams } from "../utils/pagination";
import { logError } from "../utils/logger";

export interface RecordActivityInput {
  actorId: string;
  type: UserActivityType;
  targetUserId?: string;
  postId?: string;
  reportId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityFilters {
  actorId?: string;
  type?: UserActivityType;
}

export const getActivityRequestContext = (req: Request) => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent"),
});

export const recordActivity = async (input: RecordActivityInput): Promise<void> => {
  try {
    await UserActivity.create({
      actor: input.actorId,
      type: input.type,
      ...(input.targetUserId && { targetUser: input.targetUserId }),
      ...(input.postId && { post: input.postId }),
      ...(input.reportId && { report: input.reportId }),
      ...(input.ipAddress && { ipAddress: input.ipAddress }),
      ...(input.userAgent && { userAgent: input.userAgent }),
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    logError("Failed to record user activity", error, {
      actorId: input.actorId,
      type: input.type,
    });
  }
};

export const getAdminActivitiesService = async (
  filters: ActivityFilters,
  pagination: PaginationParams
) => {
  const query: Record<string, unknown> = {};
  if (filters.actorId && mongoose.isValidObjectId(filters.actorId)) {
    query.actor = filters.actorId;
  }
  if (filters.type) {
    query.type = filters.type;
  }

  const [activities, total] = await Promise.all([
    UserActivity.find(query)
      .populate("actor", "name email profilePic role")
      .populate("targetUser", "name email profilePic role")
      .populate("post", "title image")
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    UserActivity.countDocuments(query),
  ]);

  return paginatedResponse(activities, total, pagination);
};
