import CommentModel, { IComment } from "../models/Comment";
import Post from "../models/Post";

import mongoose from "mongoose";
import { analyzeContentModeration, createAutoModerationReport } from "./contentModerationService";
import { createNotification } from "./notificationService";

const populateCommentUsers = async (comment: IComment | null): Promise<IComment | null> => {
  if (!comment) return null;

  await comment.populate([
    { path: "user", select: "name profilePic" },
    { path: "replies.user", select: "name profilePic" },
  ]);

  return comment;
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
  }

  return (await populateCommentUsers(savedComment))!;
};

export const editCommentService = async (
  commentId: string,
  userId: string,
  content: string
): Promise<IComment | null> => {
  const comment = await CommentModel.findOne({ _id: commentId, user: userId });
  if (!comment) return null;

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
  }

  return populateCommentUsers(comment);
};

export const deleteCommentService = async (
  commentId: string,
  userId: string
): Promise<IComment | null> => {
  const comment = await CommentModel.findOneAndDelete({ _id: commentId, user: userId });
  if (comment) {
    await Post.findByIdAndUpdate(comment.post, { $pull: { comments: comment._id } });
  }
  return populateCommentUsers(comment);
};

export const likeCommentService = async (
  commentId: string,
  userId: string
): Promise<IComment | null> => {
  const comment = await CommentModel.findByIdAndUpdate(
    commentId,
    { $addToSet: { likes: userId } },
    { new: true }
  );
  return populateCommentUsers(comment);
};

export const unlikeCommentService = async (
  commentId: string,
  userId: string
): Promise<IComment | null> => {
  const comment = await CommentModel.findByIdAndUpdate(
    commentId,
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
    createdAt: new Date(),
  };
  const comment = await CommentModel.findByIdAndUpdate(
    commentId,
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
  });

  if (!comment || !comment.replies[replyIndex]) return null;
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
  });

  if (!comment || !comment.replies[replyIndex]) return null;
  comment.replies.splice(replyIndex, 1);
  await comment.save();
  return populateCommentUsers(comment);
};

export const likeReplyService = async (
  commentId: string,
  replyIndex: number,
  userId: string
): Promise<IComment | null> => {
  const comment = await CommentModel.findById(commentId);

  if (!comment || !comment.replies[replyIndex]) return null;
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

  if (!comment || !comment.replies[replyIndex]) return null;
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
  if (!comment || !comment.replies[parentReplyIndex]) return null;

  const moderation = analyzeContentModeration([content]);
  const reply = {
    user: new mongoose.Types.ObjectId(userId),
    content,
    likes: [],
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
  }
  return populateCommentUsers(comment);
};
