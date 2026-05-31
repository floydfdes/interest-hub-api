import mongoose from "mongoose";
import Post from "../models/Post";
import Share, { ShareTargetType } from "../models/Share";
import User from "../models/User";
import { PaginationParams, paginatedResponse } from "../utils/pagination";
import { createNotification } from "./notificationService";

interface CreateShareInput {
  senderId: string;
  recipientId: string;
  targetType: ShareTargetType;
  targetId: string;
  message?: string;
}

const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

const canViewPost = async (
  post: {
    author: mongoose.Types.ObjectId;
    visibility: string;
  },
  viewerId: string
) => {
  const authorId = post.author.toString();
  if (post.visibility === "public") return true;
  if (authorId === viewerId) return true;
  if (post.visibility === "private") return false;

  const followsAuthor = await User.findOne({
    _id: authorId,
    followers: viewerId,
    isDeleted: false,
  }).select("_id");

  return Boolean(followsAuthor);
};

interface PopulatableShareQuery {
  populate: (path: string, select?: string) => PopulatableShareQuery;
}

const populateShareQuery = (query: PopulatableShareQuery) =>
  query
    .populate("sender", "name profilePic")
    .populate("recipient", "name profilePic")
    .populate("post", "title image visibility")
    .populate("targetUser", "name profilePic isPrivate");

export const createShareService = async ({
  senderId,
  recipientId,
  targetType,
  targetId,
  message,
}: CreateShareInput) => {
  if (senderId === recipientId) throw new Error("Cannot share with yourself");
  if (targetType === "comment") {
    // TODO: enable comment sharing after enforcing parent post visibility for sender and recipient.
    throw new Error("Comment sharing is not implemented yet");
  }

  const [sender, recipient] = await Promise.all([
    User.findOne({ _id: senderId, isDeleted: false }).select("_id blockedUsers"),
    User.findOne({ _id: recipientId, isDeleted: false }).select("_id blockedUsers"),
  ]);
  if (!sender || !recipient) return null;
  if (sender.blockedUsers?.some((id) => id.equals(recipientId))) {
    throw new Error("Cannot share with a blocked user");
  }
  if (recipient.blockedUsers?.some((id) => id.equals(senderId))) {
    throw new Error("Cannot share with this user");
  }

  if (targetType === "post") {
    const post = await Post.findOne({
      _id: targetId,
      isArchived: { $ne: true },
      isModerationHidden: { $ne: true },
    }).select("author visibility");
    if (!post) return null;

    const [senderCanView, recipientCanView] = await Promise.all([
      canViewPost(post, senderId),
      canViewPost(post, recipientId),
    ]);
    if (!senderCanView) throw new Error("You cannot share this post");
    if (!recipientCanView) throw new Error("Recipient cannot view this post");

    const share = await Share.create({
      sender: toObjectId(senderId),
      recipient: toObjectId(recipientId),
      targetType,
      post: post._id,
      ...(message && { message }),
    });

    await createNotification({
      recipientId,
      actorId: senderId,
      type: "post_shared",
      postId: post._id as mongoose.Types.ObjectId,
      message: "Someone shared a post with you.",
    });

    return share.populate([
      { path: "sender", select: "name profilePic" },
      { path: "recipient", select: "name profilePic" },
      { path: "post", select: "title image visibility" },
    ]);
  }

  const targetUser = await User.findOne({ _id: targetId, isDeleted: false }).select("_id");
  if (!targetUser) return null;

  const share = await Share.create({
    sender: toObjectId(senderId),
    recipient: toObjectId(recipientId),
    targetType,
    targetUser: targetUser._id,
    ...(message && { message }),
  });

  await createNotification({
    recipientId,
    actorId: senderId,
    type: "profile_shared",
    targetUserId: targetUser._id as mongoose.Types.ObjectId,
    message: "Someone shared a profile with you.",
  });

  return share.populate([
    { path: "sender", select: "name profilePic" },
    { path: "recipient", select: "name profilePic" },
    { path: "targetUser", select: "name profilePic isPrivate" },
  ]);
};

export const getReceivedSharesService = async (userId: string, pagination: PaginationParams) => {
  const filter = { recipient: userId };
  const sharesQuery = populateShareQuery(
    Share.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit)
  ) as unknown as Promise<unknown[]>;
  const [shares, total] = await Promise.all([sharesQuery, Share.countDocuments(filter)]);

  return paginatedResponse(shares, total, pagination);
};

export const getSentSharesService = async (userId: string, pagination: PaginationParams) => {
  const filter = { sender: userId };
  const sharesQuery = populateShareQuery(
    Share.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit)
  ) as unknown as Promise<unknown[]>;
  const [shares, total] = await Promise.all([sharesQuery, Share.countDocuments(filter)]);

  return paginatedResponse(shares, total, pagination);
};
