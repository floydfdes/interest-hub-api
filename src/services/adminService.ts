import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Comment from "../models/Comment";
import Post, { Visibility } from "../models/Post";
import User from "../models/User";

const safeUserFields = "-password -otp -otpExpires -twoFASecret -resetToken -resetTokenExpiry";

export interface AdminUserInput {
  name: string;
  email: string;
  password: string;
  role?: "user" | "admin";
  profilePic?: string | null;
  bio?: string;
  interests?: string[];
  isBlocked?: boolean;
}

export type AdminUserUpdate = Partial<AdminUserInput>;

interface Pagination {
  page: number;
  limit: number;
}

interface AdminPostFilters extends Pagination {
  query?: string;
  authorId?: string;
  visibility?: Visibility;
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getAdminDashboardService = async () => {
  const [
    totalUsers,
    adminUsers,
    blockedUsers,
    totalPosts,
    totalComments,
    replyCounts,
    recentUsers,
    recentPosts,
  ] = await Promise.all([
    User.countDocuments({ isDeleted: false }),
    User.countDocuments({ role: "admin", isDeleted: false }),
    User.countDocuments({ isBlocked: true, isDeleted: false }),
    Post.countDocuments(),
    Comment.countDocuments(),
    Comment.aggregate<{ total: number }>([
      { $project: { replies: { $size: { $ifNull: ["$replies", []] } } } },
      { $group: { _id: null, total: { $sum: "$replies" } } },
    ]),
    User.find({ isDeleted: false }).select(safeUserFields).sort({ createdAt: -1 }).limit(5),
    Post.find().populate("author", "name email profilePic").sort({ createdAt: -1 }).limit(5),
  ]);

  return {
    counts: {
      totalUsers,
      adminUsers,
      blockedUsers,
      totalPosts,
      totalComments,
      totalReplies: replyCounts[0]?.total ?? 0,
    },
    recentUsers,
    recentPosts,
  };
};

export const getAdminUsersService = async (
  query: string | undefined,
  { page, limit }: Pagination
) => {
  const filter = query
    ? {
        $or: [
          { name: { $regex: escapeRegex(query), $options: "i" } },
          { email: { $regex: escapeRegex(query), $options: "i" } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(safeUserFields)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return { users, total, page, limit };
};

export const getAdminUserByIdService = async (id: string) => {
  const user = await User.findById(id).select(safeUserFields);
  if (!user) return null;

  const posts = await Post.find({ author: id }).sort({ createdAt: -1 });
  return { user, posts };
};

export const createAdminUserService = async (input: AdminUserInput) => {
  const existingUser = await User.findOne({ email: input.email });
  if (existingUser) throw new Error("Email already in use");

  const password = await bcrypt.hash(input.password, 10);
  const user = await User.create({
    name: input.name,
    email: input.email,
    password,
    role: input.role,
    profilePic: input.profilePic,
    bio: input.bio,
    interests: input.interests,
    isBlocked: input.isBlocked,
  });

  return User.findById(user._id).select(safeUserFields);
};

export const updateAdminUserService = async (
  id: string,
  actorId: string,
  input: AdminUserUpdate
) => {
  const user = await User.findById(id);
  if (!user) return null;

  const isActor = user._id.toString() === actorId;
  if (isActor && input.role && input.role !== "admin") {
    throw new Error("Cannot remove your own admin access");
  }
  if (isActor && input.isBlocked === true) {
    throw new Error("Cannot block your own admin account");
  }

  if (input.email && input.email !== user.email) {
    const emailOwner = await User.findOne({ email: input.email, _id: { $ne: user._id } });
    if (emailOwner) throw new Error("Email already in use");
  }

  if (input.name !== undefined) user.name = input.name;
  if (input.email !== undefined) user.email = input.email;
  if (input.role !== undefined) user.role = input.role;
  if (input.profilePic !== undefined) user.profilePic = input.profilePic;
  if (input.bio !== undefined) user.bio = input.bio;
  if (input.interests !== undefined) user.interests = input.interests;
  if (input.isBlocked !== undefined) user.isBlocked = input.isBlocked;
  if (input.password) {
    user.password = await bcrypt.hash(input.password, 10);
  }
  await user.save();

  return User.findById(id).select(safeUserFields);
};

export const deleteAdminUserService = async (id: string, actorId: string) => {
  const user = await User.findById(id);
  if (!user) return false;
  if (user._id.toString() === actorId) {
    throw new Error("Cannot delete your own admin account");
  }

  const posts = await Post.find({ author: user._id }).select("_id");
  const postIds = posts.map((post) => post._id);
  const comments = await Comment.find({
    $or: [{ user: user._id }, { post: { $in: postIds } }],
  }).select("_id");
  const commentIds = comments.map((comment) => comment._id);

  await Promise.all([
    Comment.deleteMany({ _id: { $in: commentIds } }),
    Comment.updateMany(
      {},
      {
        $pull: {
          replies: { user: user._id },
          likes: user._id,
        },
      }
    ),
    Post.deleteMany({ _id: { $in: postIds } }),
    Post.updateMany(
      {},
      {
        $pull: {
          comments: { $in: commentIds },
          likes: user._id,
        },
      }
    ),
    Post.updateMany({ sharedFrom: { $in: postIds } }, { $set: { sharedFrom: null } }),
    User.updateMany(
      {},
      {
        $pull: {
          followers: user._id,
          following: user._id,
          savedPosts: { $in: postIds },
        },
      }
    ),
  ]);

  await User.findByIdAndDelete(user._id);
  return true;
};

export const setAdminUserBlockedService = async (
  id: string,
  actorId: string,
  isBlocked: boolean
) => {
  return updateAdminUserService(id, actorId, { isBlocked });
};

export const getAdminPostsService = async ({
  query,
  authorId,
  visibility,
  page,
  limit,
}: AdminPostFilters) => {
  const filter: Record<string, unknown> = {};
  if (query) {
    const search = { $regex: escapeRegex(query), $options: "i" };
    filter.$or = [{ title: search }, { content: search }, { category: search }, { tags: search }];
  }
  if (authorId && mongoose.isValidObjectId(authorId)) filter.author = authorId;
  if (visibility) filter.visibility = visibility;

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .populate("author", "name email profilePic")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Post.countDocuments(filter),
  ]);

  return { posts, total, page, limit };
};

export const getAdminPostByIdService = async (id: string) =>
  Post.findById(id)
    .populate("author", "name email profilePic")
    .populate({
      path: "comments",
      populate: [
        { path: "user", select: "name email profilePic" },
        { path: "replies.user", select: "name email profilePic" },
      ],
    });

export const deleteAdminPostService = async (id: string) => {
  const post = await Post.findByIdAndDelete(id);
  if (!post) return false;

  await Promise.all([
    Comment.deleteMany({ post: post._id }),
    Post.updateMany({ sharedFrom: post._id }, { $set: { sharedFrom: null } }),
    User.updateMany({}, { $pull: { savedPosts: post._id } }),
  ]);
  return true;
};

export const deleteAdminCommentService = async (id: string) => {
  const comment = await Comment.findByIdAndDelete(id);
  if (!comment) return false;

  await Post.findByIdAndUpdate(comment.post, { $pull: { comments: comment._id } });
  return true;
};

export const deleteAdminReplyService = async (commentId: string, replyIndex: number) => {
  const comment = await Comment.findById(commentId);
  if (!comment || !comment.replies[replyIndex]) return false;

  comment.replies.splice(replyIndex, 1);
  await comment.save();
  return true;
};
