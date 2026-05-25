import { Request, Response } from "express";
import {
  blockUser,
  deleteUserAccount,
  followUser,
  getFollowers,
  getFollowing,
  getSuggestedUsers,
  getUserById,
  searchUsers,
  unblockUser,
  unfollowUser,
  updateUserProfile,
} from "../services/userService";

import { AuthRequest } from "../middleware/authMiddleware";
import User from "../models/User";
import { logError } from "../utils/logger";
import { getPagination } from "../utils/pagination";
import {
  getActivityRequestContext,
  getUserActivitiesService,
  recordActivity,
} from "../services/activityService";
import { USER_ACTIVITY_TYPES, UserActivityType } from "../models/UserActivity";

const getLimit = (value: unknown, defaultLimit = 10) => {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 50) : defaultLimit;
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const user = await User.findOne({ _id: req.userId, isDeleted: false }).select(
    "name email role profilePic bio interests followers following createdAt updatedAt"
  );

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json({ user });
};

export const activities = async (req: AuthRequest, res: Response): Promise<void> => {
  const rawType = typeof req.query.type === "string" ? req.query.type : undefined;
  if (rawType && !USER_ACTIVITY_TYPES.includes(rawType as UserActivityType)) {
    res.status(400).json({ message: "Invalid activity type" });
    return;
  }

  try {
    const result = await getUserActivitiesService(
      req.userId!,
      rawType as UserActivityType | undefined,
      getPagination(req.query)
    );
    res.status(200).json(result);
  } catch (error) {
    logError("Failed to fetch user activities", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to fetch activities" });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profile = await getUserById(id);
    if (!profile) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(profile);
  } catch (error) {
    logError("Failed to fetch user profile", error, { profileId: req.params.id });
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const updated = await updateUserProfile(req.userId!, req.body);
    res.status(200).json(updated);
  } catch (error) {
    logError("Failed to update profile", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to update profile" });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    await deleteUserAccount(req.userId!);
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    logError("Failed to delete account", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to delete account" });
  }
};

export const follow = async (req: AuthRequest, res: Response) => {
  try {
    const { targetUserId } = req.params;
    const didFollow = await followUser(req.userId!, targetUserId);
    if (didFollow) {
      await recordActivity({
        actorId: req.userId!,
        type: "user_followed",
        targetUserId,
        ...getActivityRequestContext(req),
      });
    }
    res.status(200).json({ message: "Followed successfully" });
  } catch (error) {
    logError("Failed to follow user", error, {
      userId: req.userId,
      targetUserId: req.params.targetUserId,
    });
    res.status(500).json({ message: "Failed to follow user" });
  }
};

export const unfollow = async (req: AuthRequest, res: Response) => {
  try {
    const { targetUserId } = req.params;
    await unfollowUser(req.userId!, targetUserId);
    res.status(200).json({ message: "Unfollowed successfully" });
  } catch (error) {
    logError("Failed to unfollow user", error, {
      userId: req.userId,
      targetUserId: req.params.targetUserId,
    });
    res.status(500).json({ message: "Failed to unfollow user" });
  }
};

export const followers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const list = await getFollowers(id, getPagination(req.query));
    if (!list) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(list);
  } catch (error) {
    logError("Failed to fetch followers", error, { profileId: req.params.id });
    res.status(500).json({ message: "Failed to fetch followers" });
  }
};

export const following = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const list = await getFollowing(id, getPagination(req.query));
    if (!list) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(list);
  } catch (error) {
    logError("Failed to fetch following", error, { profileId: req.params.id });
    res.status(500).json({ message: "Failed to fetch following" });
  }
};

export const suggested = async (req: AuthRequest, res: Response) => {
  try {
    const users = await getSuggestedUsers(req.userId!, getLimit(req.query.limit));
    if (!users) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(users);
  } catch (error) {
    logError("Failed to fetch suggested users", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to fetch suggested users" });
  }
};

export const block = async (req: AuthRequest, res: Response) => {
  try {
    const { targetUserId } = req.params;
    await blockUser(req.userId!, targetUserId);
    await recordActivity({
      actorId: req.userId!,
      type: "user_blocked",
      targetUserId,
      ...getActivityRequestContext(req),
    });
    res.status(200).json({ message: "User blocked" });
  } catch (error) {
    res.status(error instanceof Error && error.message === "Unauthorized" ? 403 : 404).json({
      message: error instanceof Error ? error.message : "Failed to block user",
    });
  }
};

export const unblock = async (req: AuthRequest, res: Response) => {
  try {
    const { targetUserId } = req.params;
    await unblockUser(req.userId!, targetUserId);
    await recordActivity({
      actorId: req.userId!,
      type: "user_unblocked",
      targetUserId,
      ...getActivityRequestContext(req),
    });
    res.status(200).json({ message: "User unblocked" });
  } catch (error) {
    res.status(error instanceof Error && error.message === "Unauthorized" ? 403 : 404).json({
      message: error instanceof Error ? error.message : "Failed to unblock user",
    });
  }
};

export const search = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    if (typeof query !== "string" || query.trim().length < 2) {
      res.status(400).json({ message: "Search query must contain at least 2 characters" });
      return;
    }
    const users = await searchUsers(query.trim());
    res.status(200).json(users);
  } catch (error) {
    logError("User search failed", error);
    res.status(500).json({ message: "Search failed" });
  }
};
