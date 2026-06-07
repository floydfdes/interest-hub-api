import CommentModel, { IComment } from "../models/Comment";
import Post from "../models/Post";
import User from "../models/User";

import mongoose from "mongoose";
import { analyzeContentModeration, createAutoModerationReport } from "./contentModerationService";
import { createNotification } from "./notificationService";
import { notifyMentionedUsers } from "./mentionService";
import { paginatedResponse, PaginationParams } from "../utils/pagination";

const DELETED_COMMENT_CONTENT = "This comment was deleted.";

const populateCommentUsers = async (comment: IComment | null): Promise<IComment | null> => {
  if (!comment) return null;

  await comment.populate([
    { path: "user", select: "name profilePic" },
    { path: "replies.user", select: "name profilePic" },
  ]);

  return comment;
};

const canViewPostComments = async (postId: string, viewerId?: string) => {
  const post = await Post.findOne({
    _id: postId,
    isArchived: { $ne: true },
    isModerationHidden: { $ne: true },
  }).select("author visibility");
  if (!post) return null;

  const authorId = post.author.toString();
  const isOwner = authorId === viewerId;
  if (post.visibility === "private" && !isOwner) return false;
  if (post.visibility === "followersOnly" && !isOwner) {
    if (!viewerId) return false;
    const followsAuthor = await User.findOne({
      _id: authorId,
      followers: viewerId,
      isDeleted: false,
    }).select("_id");
    if (!followsAuthor) return false;
  }

  return true;
};

export const getPostCommentsService = async (
  postId: string,
  pagination: PaginationParams,
  viewerId?: string
) => {
  const canView = await canViewPostComments(postId, viewerId);
  if (canView === null) return null;
  if (canView === false) return false;

  const filter = { post: postId, isModerationHidden: { $ne: true } };
  const [comments, total] = await Promise.all([
    CommentModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate([
        { path: "user", select: "name profilePic" },
        { path: "replies.user", select: "name profilePic" },
      ]),
    CommentModel.countDocuments(filter),
  ]);

  return paginatedResponse(comments, total, pagination);
};

export const createCommentService = async (
  userId: string,
  postId: string,
  content: string
): Promise<IComment> => {
  const post = await Post.findOne({
    _id: postId,
    isArchived: { $ne: true },
    isModerationHidden: { $ne: true },
  });
  if (!post) throw new Error("Post not found");

  const comment = new CommentModel({
    user: new mongoose.Types.ObjectId(userId),
    post: new mongoose.Types.ObjectId(postId),
    content,
    likes: [],
    replies: [],
  });
  const moderation = analyzeContentModeration([content]);
  comment.isModerationHidden = moderation.needsReview;
  comment.needsReview = moderation.needsReview;
  comment.moderationReasons = moderation.reasons;

  const savedComment = await comment.save();

  post.comments.push(savedComment._id);
  await post.save();

  if (moderation.needsReview) {
    await createAutoModerationReport({
      targetType: "comment",
      targetId: savedComment._id as mongoose.Types.ObjectId,
    });
  } else {
    await createNotification({
      recipientId: post.author,
      actorId: userId,
      type: "comment_created",
      postId: post._id as mongoose.Types.ObjectId,
      commentId: savedComment._id as mongoose.Types.ObjectId,
      message: "Someone commented on your post.",
    });
    await notifyMentionedUsers({
      actorId: userId,
      text: content,
      postId: post._id as mongoose.Types.ObjectId,
      commentId: savedComment._id as mongoose.Types.ObjectId,
    });
  }

  return (await populateCommentUsers(savedComment))!;
};

export const editCommentService = async (
  commentId: string,
  userId: string,
  content: string
): Promise<IComment | null> => {
  const comment = await CommentModel.findOne({ _id: commentId, user: userId, isDeleted: false });
  if (!comment) return null;
  const previousText = comment.content;

  const moderation = analyzeContentModeration([content]);
  comment.content = content;
  if (moderation.needsReview) {
    comment.isModerationHidden = true;
    comment.needsReview = true;
    comment.moderationReasons = [
      ...new Set([...(comment.moderationReasons ?? []), ...moderation.reasons]),
    ];
  } else {
    comment.moderationReasons = (comment.moderationReasons ?? []).filter(
      (reason) => reason !== "bad_language"
    );
    comment.needsReview = comment.moderationReasons.length > 0;
  }
  await comment.save();
  if (moderation.needsReview) {
    await createAutoModerationReport({
      targetType: "comment",
      targetId: comment._id as mongoose.Types.ObjectId,
    });
  } else {
    await notifyMentionedUsers({
      actorId: userId,
      text: comment.content,
      previousText,
      postId: comment.post,
      commentId: comment._id as mongoose.Types.ObjectId,
    });
  }

  return populateCommentUsers(comment);
};

export const deleteCommentService = async (
  commentId: string,
  userId: string
): Promise<IComment | null> => {
  const comment = await CommentModel.findOne({ _id: commentId, user: userId, isDeleted: false });
  if (!comment) return null;

  comment.content = DELETED_COMMENT_CONTENT;
  comment.likes = [];
  comment.isDeleted = true;
  comment.deletedAt = new Date();
  await comment.save();

  return populateCommentUsers(comment);
};

export const likeCommentService = async (
  commentId: string,
  userId: string
): Promise<IComment | null> => {
  const comment = await CommentModel.findOneAndUpdate(
    { _id: commentId, isDeleted: { $ne: true } },
    { $addToSet: { likes: userId } },
    { new: true }
  );
  return populateCommentUsers(comment);
};

export const unlikeCommentService = async (
  commentId: string,
  userId: string
): Promise<IComment | null> => {
  const comment = await CommentModel.findOneAndUpdate(
    { _id: commentId, isDeleted: { $ne: true } },
    { $pull: { likes: userId } },
    { new: true }
  );
  return populateCommentUsers(comment);
};

export const replyToCommentService = async (
  commentId: string,
  userId: string,
  content: string
): Promise<IComment | null> => {
  const moderation = analyzeContentModeration([content]);
  const reply = {
    user: new mongoose.Types.ObjectId(userId),
    content,
    likes: [],
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
  };
  const comment = await CommentModel.findOneAndUpdate(
    { _id: commentId, isDeleted: { $ne: true } },
    {
      $push: { replies: reply },
      ...(moderation.needsReview && {
        $set: { isModerationHidden: true, needsReview: true },
        $addToSet: { moderationReasons: { $each: moderation.reasons } },
      }),
    },
    { new: true }
  );
  if (comment && moderation.needsReview) {
    await createAutoModerationReport({
      targetType: "comment",
      targetId: comment._id as mongoose.Types.ObjectId,
    });
  } else if (comment) {
    await createNotification({
      recipientId: comment.user,
      actorId: userId,
      type: "reply_created",
      postId: comment.post,
      commentId: comment._id as mongoose.Types.ObjectId,
      message: "Someone replied to your comment.",
    });
    await notifyMentionedUsers({
      actorId: userId,
      text: content,
      postId: comment.post,
      commentId: comment._id as mongoose.Types.ObjectId,
    });
  }
  return populateCommentUsers(comment);
};

export const editReplyService = async (
  commentId: string,
  replyIndex: number,
  userId: string,
  content: string
): Promise<IComment | null> => {
  const comment = await CommentModel.findOne({
    _id: commentId,
    [`replies.${replyIndex}.user`]: userId,
    [`replies.${replyIndex}.isDeleted`]: { $ne: true },
  });

  if (!comment || !comment.replies[replyIndex]) return null;
  const previousText = comment.replies[replyIndex].content;
  const moderation = analyzeContentModeration([content]);
  comment.replies[replyIndex].content = content;
  if (moderation.needsReview) {
    comment.isModerationHidden = true;
    comment.needsReview = true;
    comment.moderationReasons = [
      ...new Set([...(comment.moderationReasons ?? []), ...moderation.reasons]),
    ];
  } else {
    comment.moderationReasons = (comment.moderationReasons ?? []).filter(
      (reason) => reason !== "bad_language"
    );
    comment.needsReview = comment.moderationReasons.length > 0;
  }
  await comment.save();
  if (moderation.needsReview) {
    await createAutoModerationReport({
      targetType: "comment",
      targetId: comment._id as mongoose.Types.ObjectId,
    });
  } else {
    await notifyMentionedUsers({
      actorId: userId,
      text: content,
      previousText,
      postId: comment.post,
      commentId: comment._id as mongoose.Types.ObjectId,
    });
  }
  return populateCommentUsers(comment);
};

export const deleteReplyService = async (
  commentId: string,
  replyIndex: number,
  userId: string
): Promise<IComment | null> => {
  const comment = await CommentModel.findOne({
    _id: commentId,
    [`replies.${replyIndex}.user`]: userId,
    [`replies.${replyIndex}.isDeleted`]: { $ne: true },
  });

  if (!comment || !comment.replies[replyIndex]) return null;
  comment.replies[replyIndex].content = DELETED_COMMENT_CONTENT;
  comment.replies[replyIndex].likes = [];
  comment.replies[replyIndex].isDeleted = true;
  comment.replies[replyIndex].deletedAt = new Date();
  await comment.save();
  return populateCommentUsers(comment);
};

export const likeReplyService = async (
  commentId: string,
  replyIndex: number,
  userId: string
): Promise<IComment | null> => {
  const comment = await CommentModel.findById(commentId);

  if (!comment || !comment.replies[replyIndex] || comment.replies[replyIndex].isDeleted) {
    return null;
  }
  const reply = comment.replies[replyIndex];
  if (!reply.likes.some((likeId) => likeId.equals(userId))) {
    reply.likes.push(new mongoose.Types.ObjectId(userId));
    await comment.save();
  }
  return populateCommentUsers(comment);
};

export const unlikeReplyService = async (
  commentId: string,
  replyIndex: number,
  userId: string
): Promise<IComment | null> => {
  const comment = await CommentModel.findById(commentId);

  if (!comment || !comment.replies[replyIndex] || comment.replies[replyIndex].isDeleted) {
    return null;
  }
  const reply = comment.replies[replyIndex];
  reply.likes = reply.likes.filter((likeId) => likeId.toString() !== userId);
  await comment.save();
  return populateCommentUsers(comment);
};

export const replyToReplyService = async (
  commentId: string,
  parentReplyIndex: number,
  userId: string,
  content: string
): Promise<IComment | null> => {
  const comment = await CommentModel.findById(commentId);
  if (
    !comment ||
    comment.isDeleted ||
    !comment.replies[parentReplyIndex] ||
    comment.replies[parentReplyIndex].isDeleted
  ) {
    return null;
  }

  const moderation = analyzeContentModeration([content]);
  const reply = {
    user: new mongoose.Types.ObjectId(userId),
    content,
    likes: [],
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
  };

  comment.replies.splice(parentReplyIndex + 1, 0, reply);
  if (moderation.needsReview) {
    comment.isModerationHidden = true;
    comment.needsReview = true;
    comment.moderationReasons = [
      ...new Set([...(comment.moderationReasons ?? []), ...moderation.reasons]),
    ];
  }
  await comment.save();
  if (moderation.needsReview) {
    await createAutoModerationReport({
      targetType: "comment",
      targetId: comment._id as mongoose.Types.ObjectId,
    });
  } else {
    await createNotification({
      recipientId: comment.replies[parentReplyIndex].user,
      actorId: userId,
      type: "reply_created",
      postId: comment.post,
      commentId: comment._id as mongoose.Types.ObjectId,
      message: "Someone replied to your reply.",
    });
    await notifyMentionedUsers({
      actorId: userId,
      text: content,
      postId: comment.post,
      commentId: comment._id as mongoose.Types.ObjectId,
    });
  }
  return populateCommentUsers(comment);
};
