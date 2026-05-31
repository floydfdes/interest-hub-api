import mongoose from "mongoose";
import Comment from "../models/Comment";
import Post, { IPost, Visibility } from "../models/Post";
import User from "../models/User";

import { uploadImageToCloudinary } from "../utils/uploadImage";
import { paginatedResponse, PaginationParams } from "../utils/pagination";
import {
  formatPaginatedPostResponse,
  formatPostListResponse,
  formatPostResponse,
} from "../utils/postResponse";
import {
  analyzeContentModeration,
  createAutoModerationReport,
  dismissAutoModerationReport,
} from "./contentModerationService";
import { createNotification } from "./notificationService";

type CreatePostData = Pick<IPost, "title" | "content" | "category" | "author"> & {
  image: string;
  tags?: string[];
  visibility?: Visibility;
};

type UpdatePostData = Partial<
  Pick<IPost, "title" | "content" | "category" | "tags" | "visibility">
> & {
  image?: string;
};

export interface AdvancedPostSearchFilters {
  category?: string;
  title?: string;
  content?: string;
  tags?: string[];
}

export type TrendingPeriod = "day" | "week" | "month" | "all";

const normalizeTags = (tags: string[] = []): string[] => [
  ...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
];

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const publiclyVisible = {
  isArchived: { $ne: true },
  isModerationHidden: { $ne: true },
};

const getSavedPostIds = async (viewerId?: string) => {
  if (!viewerId) return [];

  const user = await User.findOne({ _id: viewerId, isDeleted: false }).select("savedPosts");
  return user?.savedPosts ?? [];
};

export const createPostService = async (postData: CreatePostData) => {
  if (!postData.image) throw new Error("Image is required");

  const moderation = analyzeContentModeration([postData.title, postData.content]);
  const cloudinaryUrl = await uploadImageToCloudinary(postData.image, "post_images");

  const post = await Post.create({
    title: postData.title,
    content: postData.content,
    category: postData.category,
    tags: normalizeTags(postData.tags),
    visibility: postData.visibility,
    author: postData.author,
    image: cloudinaryUrl,
    isModerationHidden: moderation.needsReview,
    needsReview: moderation.needsReview,
    moderationReasons: moderation.reasons,
  });

  if (moderation.needsReview) {
    await createAutoModerationReport({
      targetType: "post",
      targetId: post._id as mongoose.Types.ObjectId,
    });
    await createNotification({
      recipientId: post.author as mongoose.Types.ObjectId,
      type: "post_under_review",
      postId: post._id as mongoose.Types.ObjectId,
      message: "Your post is under review and hidden until moderation is complete.",
    });
  }

  return formatPostResponse(post, post.author.toString());
};

export const getAllPostsService = async (pagination: PaginationParams, viewerId?: string) => {
  const filter = { visibility: "public" as Visibility, ...publiclyVisible };
  const [posts, total, savedPostIds] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("author", "name profilePic"),
    Post.countDocuments(filter),
    getSavedPostIds(viewerId),
  ]);

  return formatPaginatedPostResponse(posts, total, pagination, viewerId, savedPostIds);
};

export const searchPostsService = async (query: string, viewerId?: string) => {
  const filters: Record<string, unknown> = { visibility: "public", ...publiclyVisible };
  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    const searchTerm = new RegExp(escapeRegExp(trimmedQuery), "i");
    filters.$or = [
      { title: searchTerm },
      { content: searchTerm },
      { category: searchTerm },
      { tags: searchTerm },
    ];
  }

  const [posts, savedPostIds] = await Promise.all([
    Post.find(filters).populate("author", "name profilePic"),
    getSavedPostIds(viewerId),
  ]);

  return formatPostListResponse(posts, viewerId, savedPostIds);
};

export const advancedSearchPostsService = async (
  { category, title, content, tags }: AdvancedPostSearchFilters,
  viewerId?: string
) => {
  const filters: Record<string, unknown> = { visibility: "public", ...publiclyVisible };
  const trimmedCategory = category?.trim();
  const trimmedTitle = title?.trim();
  const trimmedContent = content?.trim();

  if (trimmedCategory) {
    filters.category = new RegExp(escapeRegExp(trimmedCategory), "i");
  }

  if (trimmedTitle) {
    filters.title = new RegExp(escapeRegExp(trimmedTitle), "i");
  }

  if (trimmedContent) {
    filters.content = new RegExp(escapeRegExp(trimmedContent), "i");
  }

  const normalizedTags = normalizeTags(tags);
  if (normalizedTags.length > 0) {
    filters.tags = {
      $all: normalizedTags.map((tag) => new RegExp(escapeRegExp(tag), "i")),
    };
  }

  const [posts, savedPostIds] = await Promise.all([
    Post.find(filters).populate("author", "name profilePic"),
    getSavedPostIds(viewerId),
  ]);

  return formatPostListResponse(posts, viewerId, savedPostIds);
};

export const getFollowingFeedService = async (userId: string, pagination: PaginationParams) => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).select(
    "following blockedUsers mutedUsers hiddenPosts savedPosts"
  );
  if (!user) return null;

  const filter = {
    _id: { $nin: user.hiddenPosts ?? [] },
    author: {
      $in: user.following,
      $nin: [...(user.blockedUsers ?? []), ...(user.mutedUsers ?? [])],
    },
    visibility: { $in: ["public", "followersOnly"] as Visibility[] },
    ...publiclyVisible,
  };
  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("author", "name profilePic"),
    Post.countDocuments(filter),
  ]);

  return formatPaginatedPostResponse(posts, total, pagination, userId, user.savedPosts);
};

const periodInMilliseconds: Record<Exclude<TrendingPeriod, "all">, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

const authorLookupStages: mongoose.PipelineStage[] = [
  {
    $lookup: {
      from: "users",
      localField: "author",
      foreignField: "_id",
      as: "author",
    },
  },
  { $unwind: "$author" },
  {
    $set: {
      author: {
        _id: "$author._id",
        name: "$author.name",
        profilePic: {
          $cond: [{ $eq: ["$author.profilePic", ""] }, null, "$author.profilePic"],
        },
      },
    },
  },
];

export const getTrendingPostsService = async (
  period: TrendingPeriod,
  limit: number,
  viewerId?: string
) => {
  const match: Record<string, unknown> = { visibility: "public", ...publiclyVisible };

  if (period !== "all") {
    match.createdAt = { $gte: new Date(Date.now() - periodInMilliseconds[period]) };
  }

  const [posts, savedPostIds] = await Promise.all([
    Post.aggregate([
      { $match: match },
      {
        $addFields: {
          trendingScore: {
            $add: [
              { $multiply: [{ $size: { $ifNull: ["$likes", []] } }, 3] },
              { $multiply: [{ $size: { $ifNull: ["$comments", []] } }, 4] },
              { $multiply: [{ $ifNull: ["$viewCount", 0] }, 0.2] },
            ],
          },
        },
      },
      { $sort: { trendingScore: -1, createdAt: -1 } },
      { $limit: limit },
      ...authorLookupStages,
    ]),
    getSavedPostIds(viewerId),
  ]);

  return formatPostListResponse(posts, viewerId, savedPostIds);
};

export const getRecommendedPostsService = async (userId: string, limit: number) => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).select(
    "following blockedUsers mutedUsers hiddenPosts interests savedPosts"
  );
  if (!user) return null;

  const interests = user.interests.map((interest) => interest.trim().toLowerCase()).filter(Boolean);
  const usersWhoBlockedViewer = await User.find({
    blockedUsers: user._id,
    isDeleted: false,
  }).select("_id");
  const excludedAuthors = [
    ...(user.blockedUsers ?? []),
    ...(user.mutedUsers ?? []),
    ...usersWhoBlockedViewer.map((blockedBy) => blockedBy._id),
  ];

  const posts = await Post.aggregate([
    {
      $match: {
        _id: { $nin: user.hiddenPosts ?? [] },
        visibility: "public",
        ...publiclyVisible,
        author: { $ne: user._id, $nin: excludedAuthors },
      },
    },
    {
      $addFields: {
        isFollowedAuthor: { $cond: [{ $in: ["$author", user.following] }, 1, 0] },
        matchesCategory: {
          $cond: [{ $in: [{ $toLower: "$category" }, interests] }, 1, 0],
        },
        matchingTags: {
          $size: {
            $setIntersection: [
              {
                $map: {
                  input: { $ifNull: ["$tags", []] },
                  as: "tag",
                  in: { $toLower: "$$tag" },
                },
              },
              interests,
            ],
          },
        },
        isRecent: {
          $cond: [{ $gte: ["$createdAt", new Date(Date.now() - periodInMilliseconds.week)] }, 1, 0],
        },
      },
    },
    {
      $addFields: {
        recommendationScore: {
          $add: [
            { $multiply: ["$isFollowedAuthor", 50] },
            { $multiply: ["$matchesCategory", 20] },
            { $multiply: ["$matchingTags", 12] },
            { $multiply: [{ $size: { $ifNull: ["$likes", []] } }, 2] },
            { $multiply: [{ $size: { $ifNull: ["$comments", []] } }, 3] },
            { $multiply: ["$isRecent", 10] },
          ],
        },
      },
    },
    { $sort: { recommendationScore: -1, createdAt: -1 } },
    { $limit: limit },
    ...authorLookupStages,
  ]);

  return formatPostListResponse(posts, userId, user.savedPosts);
};

export const bookmarkPostService = async (postId: string, userId: string) => {
  const post = await Post.findOne({
    _id: postId,
    visibility: "public",
    ...publiclyVisible,
  }).select("_id");
  if (!post) return null;

  return User.findOneAndUpdate(
    { _id: userId, isDeleted: false },
    { $addToSet: { savedPosts: post._id } },
    { new: true }
  );
};

export const removeBookmarkService = async (postId: string, userId: string) => {
  return User.findOneAndUpdate(
    { _id: userId, isDeleted: false },
    { $pull: { savedPosts: postId } },
    { new: true }
  );
};

export const getBookmarkedPostsService = async (userId: string) => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).populate({
    path: "savedPosts",
    match: { visibility: "public", ...publiclyVisible },
    options: { sort: { createdAt: -1 } },
    populate: { path: "author", select: "name profilePic" },
  });

  if (!user) return null;

  return formatPostListResponse(user.savedPosts ?? [], userId, user.savedPosts ?? []);
};

export const hidePostService = async (postId: string, userId: string) => {
  const post = await Post.findOne({
    _id: postId,
    visibility: "public",
    ...publiclyVisible,
  }).select("_id");
  if (!post) return null;

  const user = await User.findOne({ _id: userId, isDeleted: false }).select(
    "hiddenPosts savedPosts"
  );
  if (!user) return null;

  const didHide = !(user.hiddenPosts ?? []).some((id) => id.equals(post._id));
  if (didHide) {
    user.hiddenPosts ??= [];
    user.hiddenPosts.push(post._id);
    await user.save();
  }

  return { didHide };
};

export const unhidePostService = async (postId: string, userId: string) => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).select("hiddenPosts");
  if (!user) return null;

  const didUnhide = (user.hiddenPosts ?? []).some((id) => id.equals(postId));
  if (didUnhide) {
    user.hiddenPosts = user.hiddenPosts.filter((id) => !id.equals(postId));
    await user.save();
  }

  return { didUnhide };
};

export const getHiddenPostsService = async (userId: string, pagination: PaginationParams) => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).select(
    "hiddenPosts savedPosts"
  );
  if (!user) return null;

  const filter = {
    _id: { $in: user.hiddenPosts ?? [] },
    visibility: "public" as Visibility,
    ...publiclyVisible,
  };
  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("author", "name profilePic"),
    Post.countDocuments(filter),
  ]);

  return formatPaginatedPostResponse(posts, total, pagination, userId, user.savedPosts);
};

export const getPostByIdService = async (id: string, viewerId?: string) => {
  const post = await Post.findOne({
    _id: id,
    isArchived: { $ne: true },
  }).populate("author", "name profilePic");

  if (!post) return null;

  const populatedAuthor = post.author as unknown as { _id?: mongoose.Types.ObjectId };
  const authorId = (populatedAuthor._id ?? post.author).toString();
  const isOwner = authorId === viewerId;
  if (post.isModerationHidden && !isOwner) return null;
  if (post.visibility === "private" && !isOwner) return null;
  if (post.visibility === "followersOnly" && !isOwner) {
    if (!viewerId) return null;
    const followsAuthor = await User.findOne({
      _id: authorId,
      followers: viewerId,
      isDeleted: false,
    }).select("_id");
    if (!followsAuthor) return null;
  }

  post.viewCount += 1;
  await post.save();

  return formatPostResponse(post, viewerId, await getSavedPostIds(viewerId));
};

export const getArchivedPostsService = async (userId: string, pagination: PaginationParams) => {
  const filter = {
    author: userId,
    isArchived: true,
    isModerationHidden: { $ne: true },
  };
  const [posts, total] = await Promise.all([
    Post.find(filter).sort({ archivedAt: -1 }).skip(pagination.skip).limit(pagination.limit),
    Post.countDocuments(filter),
  ]);
  return formatPaginatedPostResponse(posts, total, pagination, userId);
};

export const getPostsUnderReviewService = async (userId: string, pagination: PaginationParams) => {
  const filter = {
    author: userId,
    needsReview: true,
    isModerationHidden: true,
  };
  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ updatedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("author", "name profilePic"),
    Post.countDocuments(filter),
  ]);

  return formatPaginatedPostResponse(posts, total, pagination, userId);
};

export const archivePostService = async (id: string, userId: string, archive: boolean) => {
  const post = await Post.findById(id);
  if (!post) return null;
  if (post.author.toString() !== userId) return false;

  post.isArchived = archive;
  post.archivedAt = archive ? new Date() : null;
  await post.save();
  return formatPostResponse(post, userId);
};

export const updatePostService = async (id: string, userId: string, updates: UpdatePostData) => {
  const post = await Post.findById(id);
  if (!post) return null;
  if (post.author.toString() !== userId) return false;

  if (updates.image) {
    const cloudinaryUrl = await uploadImageToCloudinary(updates.image, "post_images");
    updates.image = cloudinaryUrl;
  }

  const allowedUpdates: UpdatePostData = {
    ...(typeof updates.title === "string" && { title: updates.title }),
    ...(typeof updates.content === "string" && { content: updates.content }),
    ...(typeof updates.category === "string" && { category: updates.category }),
    ...(Array.isArray(updates.tags) && { tags: normalizeTags(updates.tags) }),
    ...(updates.visibility && { visibility: updates.visibility }),
    ...(updates.image && { image: updates.image }),
  };

  const moderation = analyzeContentModeration([
    typeof updates.title === "string" ? updates.title : post.title,
    typeof updates.content === "string" ? updates.content : post.content,
  ]);

  Object.assign(post, allowedUpdates, { isEdited: true });
  if (moderation.needsReview) {
    post.isModerationHidden = true;
    post.needsReview = true;
    post.moderationReasons = [
      ...new Set([...(post.moderationReasons ?? []), ...moderation.reasons]),
    ];
  } else {
    post.moderationReasons = (post.moderationReasons ?? []).filter(
      (reason) => reason !== "bad_language"
    );
    post.needsReview = post.moderationReasons.length > 0;
    if (!post.needsReview) {
      post.isModerationHidden = false;
    }
  }
  await post.save();
  if (moderation.needsReview) {
    await createAutoModerationReport({
      targetType: "post",
      targetId: post._id as mongoose.Types.ObjectId,
    });
    await createNotification({
      recipientId: post.author as mongoose.Types.ObjectId,
      type: "post_under_review",
      postId: post._id as mongoose.Types.ObjectId,
      message: "Your post edit is under review and hidden until moderation is complete.",
    });
  } else {
    await dismissAutoModerationReport({
      targetType: "post",
      targetId: post._id as mongoose.Types.ObjectId,
    });
  }

  return formatPostResponse(post, userId);
};

export const deletePostService = async (id: string, userId: string) => {
  const post = await Post.findById(id);
  if (!post) return null;
  if (post.author.toString() !== userId) return false;

  await post.deleteOne();
  await Comment.deleteMany({ post: id });
  await User.updateMany({}, { $pull: { hiddenPosts: post._id, savedPosts: post._id } });
  return true;
};

export const likePostService = async (postId: string, userId: string) => {
  const savedPostIds = await getSavedPostIds(userId);
  const post = await Post.findOneAndUpdate(
    { _id: postId, likes: { $ne: userId }, ...publiclyVisible },
    { $addToSet: { likes: userId } },
    { new: true }
  );
  if (post) return { post: formatPostResponse(post, userId, savedPostIds), didLike: true };

  const existingPost = await Post.findById(postId);
  return existingPost
    ? { post: formatPostResponse(existingPost, userId, savedPostIds), didLike: false }
    : null;
};

export const getPostLikesService = async (postId: string, pagination: PaginationParams) => {
  const post = await Post.findOne({
    _id: postId,
    visibility: "public",
    ...publiclyVisible,
  }).select("likes");
  if (!post) return null;

  const total = post.likes.length;
  await post.populate({
    path: "likes",
    select: "name profilePic",
    options: { skip: pagination.skip, limit: pagination.limit },
  });

  return paginatedResponse(post.likes, total, pagination);
};

export const unlikePostService = async (postId: string, userId: string) => {
  const post = await Post.findByIdAndUpdate(postId, { $pull: { likes: userId } }, { new: true });
  return post ? formatPostResponse(post, userId, await getSavedPostIds(userId)) : null;
};
