import mongoose from "mongoose";
import Post, { Visibility } from "../models/Post";
import User from "../models/User";
import { PaginationParams } from "../utils/pagination";
import { formatPaginatedPostResponse } from "../utils/postResponse";

const publiclyVisible = {
  visibility: "public" as Visibility,
  isArchived: { $ne: true },
  isModerationHidden: { $ne: true },
};

const normalizeTag = (tag: string) => tag.trim().toLowerCase();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getSavedPostIds = async (viewerId?: string) => {
  if (!viewerId) return [];

  const user = await User.findOne({ _id: viewerId, isDeleted: false }).select("savedPosts");
  return user?.savedPosts ?? [];
};

const tagAggregationBase = (match: Record<string, unknown> = {}): mongoose.PipelineStage[] => [
  { $match: { ...publiclyVisible, ...match } },
  { $unwind: "$tags" },
  { $match: { tags: { $type: "string", $ne: "" } } },
  {
    $group: {
      _id: "$tags",
      postsCount: { $sum: 1 },
      lastUsedAt: { $max: "$createdAt" },
    },
  },
  { $sort: { postsCount: -1, lastUsedAt: -1, _id: 1 } },
];

export const getTagSuggestionsService = async (query: string, limit: number) => {
  const normalizedQuery = normalizeTag(query);
  const tagMatch = normalizedQuery
    ? { tags: new RegExp(`^${escapeRegExp(normalizedQuery)}`, "i") }
    : {};

  return Post.aggregate([
    ...tagAggregationBase(tagMatch),
    { $limit: limit },
    { $project: { _id: 0, tag: "$_id", postsCount: 1 } },
  ]);
};

export const getTrendingTagsService = async (limit: number) => {
  return Post.aggregate([
    ...tagAggregationBase(),
    { $limit: limit },
    { $project: { _id: 0, tag: "$_id", postsCount: 1, lastUsedAt: 1 } },
  ]);
};

export const getPostsByTagService = async (
  tag: string,
  pagination: PaginationParams,
  viewerId?: string
) => {
  const normalizedTag = normalizeTag(tag);
  const filter = { ...publiclyVisible, tags: normalizedTag };

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
