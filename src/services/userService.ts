import User from "../models/User";
import { uploadImageToCloudinary } from "../utils/uploadImage";
import { paginatedResponse, PaginationParams } from "../utils/pagination";

export const getUserById = async (id: string) => {
  const user = await User.findOne({ _id: id, isDeleted: false }).select(
    "name profilePic bio interests followers following"
  );
  if (!user) return null;

  return {
    _id: user._id,
    name: user.name,
    profilePic: user.profilePic || null,
    bio: user.bio,
    interests: user.interests,
    followersCount: user.followers.length,
    followingCount: user.following.length,
  };
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<{
    name: string;
    bio: string;
    interests: string[];
    profilePic: string;
  }>
) => {
  const user = await User.findOne({ _id: userId, isDeleted: false });
  if (!user) return null;

  const allowedUpdates = {
    ...(typeof updates.name === "string" && { name: updates.name }),
    ...(typeof updates.bio === "string" && { bio: updates.bio }),
    ...(Array.isArray(updates.interests) && { interests: updates.interests }),
  };

  if (updates.profilePic) {
    const cloudinaryUrl = await uploadImageToCloudinary(updates.profilePic, "profile_pictures");
    Object.assign(allowedUpdates, { profilePic: cloudinaryUrl });
  }

  Object.assign(user, allowedUpdates);
  await user.save();

  return getUserById(userId);
};

export const deleteUserAccount = async (userId: string) => {
  return User.findByIdAndUpdate(userId, { isDeleted: true, deletedAt: new Date() });
};

export const followUser = async (userId: string, targetUserId: string) => {
  if (userId === targetUserId) throw new Error("Cannot follow yourself");

  const user = await User.findOne({ _id: userId, isDeleted: false });
  const target = await User.findOne({ _id: targetUserId, isDeleted: false });

  if (!user || !target) throw new Error("User not found");
  if (user._id.equals(target._id)) throw new Error("Cannot follow yourself");
  if (
    (user.blockedUsers ?? []).some((id) => id.equals(target._id)) ||
    (target.blockedUsers ?? []).some((id) => id.equals(user._id))
  ) {
    throw new Error("You cannot follow this user");
  }

  const isAlreadyFollowing = target.followers.some((id) => id.equals(user._id));

  if (!isAlreadyFollowing) {
    target.followers.push(user._id);
    await target.save();
  }

  const isAlreadyInFollowing = user.following.some((id) => id.equals(target._id));

  if (!isAlreadyInFollowing) {
    user.following.push(target._id);
    await user.save();
  }

  return !isAlreadyFollowing;
};

export const unfollowUser = async (userId: string, targetUserId: string) => {
  const user = await User.findOne({ _id: userId, isDeleted: false });
  const target = await User.findOne({ _id: targetUserId, isDeleted: false });

  if (!user || !target) throw new Error("User not found");

  user.following = user.following.filter((id) => !id.equals(target._id));

  target.followers = target.followers.filter((id) => !id.equals(user._id));

  await user.save();
  await target.save();

  return true;
};

export const getFollowers = async (userId: string, pagination: PaginationParams) => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).select("followers");
  if (!user) return null;

  const total = user.followers.length;
  await user.populate({
    path: "followers",
    select: "name profilePic",
    options: { skip: pagination.skip, limit: pagination.limit },
  });

  return paginatedResponse(user.followers, total, pagination);
};

export const getFollowing = async (userId: string, pagination: PaginationParams) => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).select("following");
  if (!user) return null;

  const total = user.following.length;
  await user.populate({
    path: "following",
    select: "name profilePic",
    options: { skip: pagination.skip, limit: pagination.limit },
  });

  return paginatedResponse(user.following, total, pagination);
};

export const getBlockedUsers = async (userId: string, pagination: PaginationParams) => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).select("blockedUsers");
  if (!user) return null;

  const total = user.blockedUsers.length;
  await user.populate({
    path: "blockedUsers",
    select: "name profilePic",
    options: { skip: pagination.skip, limit: pagination.limit },
  });

  return paginatedResponse(user.blockedUsers, total, pagination);
};

export const blockUser = async (userId: string, targetUserId: string) => {
  if (userId === targetUserId) throw new Error("Cannot block yourself");

  const user = await User.findOne({ _id: userId, isDeleted: false });
  const target = await User.findOne({ _id: targetUserId, isDeleted: false });
  if (!user || !target) throw new Error("User not found");
  if (user._id.equals(target._id)) throw new Error("Cannot block yourself");

  const isAlreadyBlocked = (user.blockedUsers ?? []).some((id) => id.equals(target._id));
  if (!isAlreadyBlocked) {
    user.blockedUsers ??= [];
    user.blockedUsers.push(target._id);
  }

  user.following = user.following.filter((id) => !id.equals(target._id));
  user.followers = user.followers.filter((id) => !id.equals(target._id));
  target.following = target.following.filter((id) => !id.equals(user._id));
  target.followers = target.followers.filter((id) => !id.equals(user._id));

  await user.save();
  await target.save();

  return !isAlreadyBlocked;
};

export const unblockUser = async (userId: string, targetUserId: string) => {
  if (userId === targetUserId) throw new Error("Cannot unblock yourself");

  const user = await User.findOne({ _id: userId, isDeleted: false });
  const target = await User.findOne({ _id: targetUserId, isDeleted: false });
  if (!user || !target) throw new Error("User not found");
  if (user._id.equals(target._id)) throw new Error("Cannot unblock yourself");

  const wasBlocked = (user.blockedUsers ?? []).some((id) => id.equals(target._id));
  user.blockedUsers = (user.blockedUsers ?? []).filter((id) => !id.equals(target._id));
  await user.save();

  return wasBlocked;
};

export const searchUsers = async (query: string) => {
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escapedQuery, "i");
  const users = await User.find({
    isDeleted: false,
    $or: [{ name: regex }, { interests: regex }],
  }).select("name profilePic bio interests following followers createdAt");

  return users;
};

export const getSuggestedUsers = async (userId: string, limit: number) => {
  const currentUser = await User.findOne({ _id: userId, isDeleted: false }).select(
    "following blockedUsers interests"
  );
  if (!currentUser) return null;

  const interests = currentUser.interests
    .map((interest) => interest.trim().toLowerCase())
    .filter(Boolean);

  return User.aggregate([
    {
      $match: {
        _id: {
          $nin: [currentUser._id, ...currentUser.following, ...(currentUser.blockedUsers ?? [])],
        },
        isDeleted: false,
        isBlocked: false,
        blockedUsers: { $nin: [currentUser._id] },
      },
    },
    {
      $addFields: {
        matchingInterests: {
          $size: {
            $setIntersection: [
              {
                $map: {
                  input: { $ifNull: ["$interests", []] },
                  as: "interest",
                  in: { $toLower: "$$interest" },
                },
              },
              interests,
            ],
          },
        },
        followersCount: { $size: { $ifNull: ["$followers", []] } },
        profilePic: { $cond: [{ $eq: ["$profilePic", ""] }, null, "$profilePic"] },
      },
    },
    { $group: { _id: "$_id", candidate: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$candidate" } },
    { $sort: { matchingInterests: -1, followersCount: -1, createdAt: -1, _id: -1 } },
    { $limit: limit },
    {
      $project: {
        name: 1,
        profilePic: 1,
        bio: 1,
        interests: 1,
        followersCount: 1,
        matchingInterests: 1,
      },
    },
  ]);
};
