import CommentModel, { IComment } from "../models/Comment";
import Post from "../models/Post";

import mongoose from "mongoose";

export const createCommentService = async (
  userId: string,
  postId: string,
  content: string
): Promise<IComment> => {
  const post = await Post.findById(postId);
  if (!post) throw new Error("Post not found");

  const comment = new CommentModel({
    user: new mongoose.Types.ObjectId(userId),
    post: new mongoose.Types.ObjectId(postId),
    content,
    likes: [],
    replies: [],
  });

  const savedComment = await comment.save();

  post.comments.push(savedComment._id);
  await post.save();

  return savedComment;
};

export const editCommentService = async (
  commentId: string,
  userId: string,
  content: string
): Promise<IComment | null> => {
  const comment = await CommentModel.findOneAndUpdate(
    { _id: commentId, user: userId },
    { content },
    { new: true }
  );
  return comment;
};

export const deleteCommentService = async (
  commentId: string,
  userId: string
): Promise<IComment | null> => {
  const comment = await CommentModel.findOneAndDelete({ _id: commentId, user: userId });
  if (comment) {
    await Post.findByIdAndUpdate(comment.post, { $pull: { comments: comment._id } });
  }
  return comment;
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
  return comment;
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
  return comment;
};

export const replyToCommentService = async (
  commentId: string,
  userId: string,
  content: string
): Promise<IComment | null> => {
  const reply = {
    user: new mongoose.Types.ObjectId(userId),
    content,
    likes: [],
    createdAt: new Date(),
  };
  const comment = await CommentModel.findByIdAndUpdate(
    commentId,
    { $push: { replies: reply } },
    { new: true }
  );
  return comment;
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
  comment.replies[replyIndex].content = content;
  await comment.save();
  return comment;
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
  return comment;
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
  return comment;
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
  return comment;
};

export const replyToReplyService = async (
  commentId: string,
  parentReplyIndex: number,
  userId: string,
  content: string
): Promise<IComment | null> => {
  const comment = await CommentModel.findById(commentId);
  if (!comment || !comment.replies[parentReplyIndex]) return null;

  const reply = {
    user: new mongoose.Types.ObjectId(userId),
    content,
    likes: [],
    createdAt: new Date(),
  };

  comment.replies.splice(parentReplyIndex + 1, 0, reply);
  await comment.save();
  return comment;
};
