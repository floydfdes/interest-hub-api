import { Request, Response } from "express";
import {
  acceptFollowRequest,
  blockUser,
  deleteUserAccount,
  followUser,
  getBlockedUsers,
  getFollowRequests,
  getFollowers,
  getFollowing,
  getMutedUsers,
  getSuggestedUsers,
  getUserById,
  searchUsers,
  muteUser,
  rejectFollowRequest,
  unmuteUser,
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
    "name email role profilePic bio interests isPrivate followers following followRequests blockedUsers mutedUsers hiddenPosts createdAt updatedAt"
  );

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json({ user });
};

const userActionErrorStatus = (error: unknown): number => {
  const message = error instanceof Error ? error.message : "";
  if (message === "User not found") return 404;
  if (message === "Follow request not found") return 404;
  if (message.startsWith("Cannot ")) return 400;
  if (message === "You cannot follow this user") return 403;
  return 500;
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

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const profile = await getUserById(id, req.userId);
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
    const result = await followUser(req.userId!, targetUserId);
    if (result === "followed") {
      await recordActivity({
        actorId: req.userId!,
        type: "user_followed",
        targetUserId,
        ...getActivityRequestContext(req),
      });
    }
    res.status(200).json({
      message: result === "requested" ? "Follow request sent" : "Followed successfully",
      status: result,
    });
  } catch (error) {
    logError("Failed to follow user", error, {
      userId: req.userId,
      targetUserId: req.params.targetUserId,
    });
    res.status(userActionErrorStatus(error)).json({
      message: error instanceof Error ? error.message : "Failed to follow user",
    });
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

export const followers = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const list = await getFollowers(id, getPagination(req.query), req.userId);
    if (list === null) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (list === false) {
      res.status(403).json({ message: "This profile is private" });
      return;
    }
    res.status(200).json(list);
  } catch (error) {
    logError("Failed to fetch followers", error, { profileId: req.params.id });
    res.status(500).json({ message: "Failed to fetch followers" });
  }
};

export const following = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const list = await getFollowing(id, getPagination(req.query), req.userId);
    if (list === null) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (list === false) {
      res.status(403).json({ message: "This profile is private" });
      return;
    }
    res.status(200).json(list);
  } catch (error) {
    logError("Failed to fetch following", error, { profileId: req.params.id });
    res.status(500).json({ message: "Failed to fetch following" });
  }
};

export const blocked = async (req: AuthRequest, res: Response) => {
  try {
    const list = await getBlockedUsers(req.userId!, getPagination(req.query));
    if (!list) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(list);
  } catch (error) {
    logError("Failed to fetch blocked users", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to fetch blocked users" });
  }
};

export const muted = async (req: AuthRequest, res: Response) => {
  try {
    const list = await getMutedUsers(req.userId!, getPagination(req.query));
    if (!list) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(list);
  } catch (error) {
    logError("Failed to fetch muted users", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to fetch muted users" });
  }
};

export const followRequests = async (req: AuthRequest, res: Response) => {
  try {
    const list = await getFollowRequests(req.userId!, getPagination(req.query));
    if (!list) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(list);
  } catch (error) {
    logError("Failed to fetch follow requests", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to fetch follow requests" });
  }
};

export const acceptRequest = async (req: AuthRequest, res: Response) => {
  try {
    await acceptFollowRequest(req.userId!, req.params.requesterId);
    await recordActivity({
      actorId: req.params.requesterId,
      type: "user_followed",
      targetUserId: req.userId!,
      ...getActivityRequestContext(req),
    });
    res.status(200).json({ message: "Follow request accepted" });
  } catch (error) {
    res.status(userActionErrorStatus(error)).json({
      message: error instanceof Error ? error.message : "Failed to accept follow request",
    });
  }
};

export const rejectRequest = async (req: AuthRequest, res: Response) => {
  try {
    await rejectFollowRequest(req.userId!, req.params.requesterId);
    res.status(200).json({ message: "Follow request rejected" });
  } catch (error) {
    res.status(userActionErrorStatus(error)).json({
      message: error instanceof Error ? error.message : "Failed to reject follow request",
    });
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
    const didBlock = await blockUser(req.userId!, targetUserId);
    if (didBlock) {
      await recordActivity({
        actorId: req.userId!,
        type: "user_blocked",
        targetUserId,
        ...getActivityRequestContext(req),
      });
    }
    res.status(200).json({ message: "User blocked" });
  } catch (error) {
    res.status(userActionErrorStatus(error)).json({
      message: error instanceof Error ? error.message : "Failed to block user",
    });
  }
};

export const unblock = async (req: AuthRequest, res: Response) => {
  try {
    const { targetUserId } = req.params;
    const didUnblock = await unblockUser(req.userId!, targetUserId);
    if (didUnblock) {
      await recordActivity({
        actorId: req.userId!,
        type: "user_unblocked",
        targetUserId,
        ...getActivityRequestContext(req),
      });
    }
    res.status(200).json({ message: "User unblocked" });
  } catch (error) {
    res.status(userActionErrorStatus(error)).json({
      message: error instanceof Error ? error.message : "Failed to unblock user",
    });
  }
};

export const mute = async (req: AuthRequest, res: Response) => {
  try {
    const { targetUserId } = req.params;
    const didMute = await muteUser(req.userId!, targetUserId);
    if (didMute) {
      await recordActivity({
        actorId: req.userId!,
        type: "user_muted",
        targetUserId,
        ...getActivityRequestContext(req),
      });
    }
    res.status(200).json({ message: "User muted" });
  } catch (error) {
    res.status(userActionErrorStatus(error)).json({
      message: error instanceof Error ? error.message : "Failed to mute user",
    });
  }
};

export const unmute = async (req: AuthRequest, res: Response) => {
  try {
    const { targetUserId } = req.params;
    const didUnmute = await unmuteUser(req.userId!, targetUserId);
    if (didUnmute) {
      await recordActivity({
        actorId: req.userId!,
        type: "user_unmuted",
        targetUserId,
        ...getActivityRequestContext(req),
      });
    }
    res.status(200).json({ message: "User unmuted" });
  } catch (error) {
    res.status(userActionErrorStatus(error)).json({
      message: error instanceof Error ? error.message : "Failed to unmute user",
    });
  }
};

export const search = async (req: Request, res: Response) => {
  try {
    const query = typeof req.query.query === "string" ? req.query.query : req.query.q;
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
