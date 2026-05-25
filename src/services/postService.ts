import mongoose from "mongoose";
import Comment from "../models/Comment";
import Post, { IPost, Visibility } from "../models/Post";
import User from "../models/User";

import { uploadImageToCloudinary } from "../utils/uploadImage";
import { paginatedResponse, PaginationParams } from "../utils/pagination";

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

export const createPostService = async (postData: CreatePostData) => {
  if (!postData.image) throw new Error("Image is required");

  const cloudinaryUrl = await uploadImageToCloudinary(postData.image, "post_images");

  return await Post.create({
    title: postData.title,
    content: postData.content,
    category: postData.category,
    tags: normalizeTags(postData.tags),
    visibility: postData.visibility,
    author: postData.author,
    image: cloudinaryUrl,
  });
};

export const getAllPostsService = async (pagination: PaginationParams) => {
  const filter = { visibility: "public" as Visibility };
  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("author", "name profilePic"),
    Post.countDocuments(filter),
  ]);

  return paginatedResponse(posts, total, pagination);
};

export const searchPostsService = async (query: string) => {
  const filters: Record<string, unknown> = { visibility: "public" };
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

  return Post.find(filters).populate("author", "name profilePic");
};

export const advancedSearchPostsService = async ({
  category,
  title,
  content,
  tags,
}: AdvancedPostSearchFilters) => {
  const filters: Record<string, unknown> = { visibility: "public" };
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

  return Post.find(filters).populate("author", "name profilePic");
};

export const getFollowingFeedService = async (userId: string, pagination: PaginationParams) => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).select("following");
  if (!user) return null;

  const filter = {
    author: { $in: user.following },
    visibility: "public" as Visibility,
  };
  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("author", "name profilePic"),
    Post.countDocuments(filter),
  ]);

  return paginatedResponse(posts, total, pagination);
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

export const getTrendingPostsService = async (period: TrendingPeriod, limit: number) => {
  const match: Record<string, unknown> = { visibility: "public" };

  if (period !== "all") {
    match.createdAt = { $gte: new Date(Date.now() - periodInMilliseconds[period]) };
  }

  return Post.aggregate([
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
  ]);
};

export const getRecommendedPostsService = async (userId: string, limit: number) => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).select("following interests");
  if (!user) return null;

  const interests = user.interests.map((interest) => interest.trim().toLowerCase()).filter(Boolean);

  return Post.aggregate([
    {
      $match: {
        visibility: "public",
        author: { $ne: user._id },
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
};

export const bookmarkPostService = async (postId: string, userId: string) => {
  const post = await Post.findOne({ _id: postId, visibility: "public" }).select("_id");
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
    match: { visibility: "public" },
    options: { sort: { createdAt: -1 } },
    populate: { path: "author", select: "name profilePic" },
  });

  return user?.savedPosts ?? null;
};

export const getPostByIdService = async (id: string) => {
  const post = await Post.findOne({ _id: id, visibility: "public" })
    .populate("author", "name profilePic")
    .populate({
      path: "comments",
      model: "Comment",
      populate: [
        {
          path: "user",
          select: "name profilePic",
        },
        {
          path: "replies.user",
          select: "name profilePic",
        },
      ],
    });

  if (post) {
    post.viewCount += 1;
    await post.save();
  }

  return post;
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

  Object.assign(post, allowedUpdates, { isEdited: true });
  await post.save();
  return post;
};

export const deletePostService = async (id: string, userId: string) => {
  const post = await Post.findById(id);
  if (!post) return null;
  if (post.author.toString() !== userId) return false;

  await post.deleteOne();
  await Comment.deleteMany({ post: id });
  return true;
};

export const likePostService = async (postId: string, userId: string) => {
  const post = await Post.findByIdAndUpdate(
    postId,
    { $addToSet: { likes: userId } },
    { new: true }
  );
  return post;
};

export const getPostLikesService = async (postId: string, pagination: PaginationParams) => {
  const post = await Post.findOne({ _id: postId, visibility: "public" }).select("likes");
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
  return post;
};
