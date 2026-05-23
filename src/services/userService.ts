import User from "../models/User";
import { uploadImageToCloudinary } from "../utils/uploadImage";

export const getUserById = async (id: string) => {
  const user = await User.findOne({ _id: id, isDeleted: false }).select(
    "name profilePic bio interests followers following"
  );
  if (!user) return null;

  return {
    _id: user._id,
    name: user.name,
    profilePic: user.profilePic,
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

  return true;
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

export const getFollowers = async (userId: string) => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).populate(
    "followers",
    "name profilePic"
  );
  return user?.followers || [];
};

export const getFollowing = async (userId: string) => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).populate(
    "following",
    "name profilePic"
  );
  return user?.following || [];
};

export const blockUser = async (adminId: string, targetUserId: string) => {
  const admin = await User.findOne({ _id: adminId, isDeleted: false });
  if (admin?.role !== "admin") throw new Error("Unauthorized");

  const user = await User.findOne({ _id: targetUserId, isDeleted: false });
  if (!user) throw new Error("User not found");

  user.isBlocked = true;
  await user.save();

  return true;
};

export const unblockUser = async (adminId: string, targetUserId: string) => {
  const admin = await User.findOne({ _id: adminId, isDeleted: false });
  if (admin?.role !== "admin") throw new Error("Unauthorized");

  const user = await User.findOne({ _id: targetUserId, isDeleted: false });
  if (!user) throw new Error("User not found");

  user.isBlocked = false;
  await user.save();

  return true;
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
