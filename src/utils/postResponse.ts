import { PaginationParams, paginatedResponse } from "./pagination";

type IdLike = {
  toString: () => string;
  equals?: (id: string) => boolean;
};

type RawPostResponse = {
  _id?: IdLike;
  likes?: IdLike[];
  comments?: IdLike[];
  toObject?: () => Record<string, unknown>;
};

export type FormattedPostResponse = Record<string, unknown> & {
  _id: IdLike;
  author?: unknown;
  needsReview?: boolean;
  moderationReasons?: string[];
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  isSavedByMe: boolean;
};

const idsEqual = (id: unknown, targetId: string): boolean => {
  if (!id) return false;

  const maybeId = id as IdLike;
  if (typeof maybeId.equals === "function") return maybeId.equals(targetId);

  return maybeId.toString() === targetId;
};

const getIdString = (id: unknown): string => {
  if (!id) return "";
  if (typeof id === "object" && "_id" in id) {
    const nestedId = (id as { _id?: unknown })._id;
    if (nestedId && nestedId !== id) return getIdString(nestedId);
  }
  return (id as IdLike).toString();
};

export const formatPostResponse = (
  post: unknown,
  viewerId?: string,
  savedPostIds: unknown[] = []
) => {
  const rawPost = post as RawPostResponse;
  const response =
    typeof rawPost.toObject === "function"
      ? rawPost.toObject()
      : ({ ...(post as Record<string, unknown>) } as Record<string, unknown>);

  const likes = Array.isArray(response.likes) ? response.likes : [];
  const comments = Array.isArray(response.comments) ? response.comments : [];
  const postId = response._id;

  delete response.likes;
  delete response.comments;

  return {
    ...response,
    likesCount: likes.length,
    commentsCount: comments.length,
    isLikedByMe: Boolean(viewerId && likes.some((likeId) => idsEqual(likeId, viewerId))),
    isSavedByMe: Boolean(
      viewerId &&
      savedPostIds.some((savedPostId) => getIdString(savedPostId) === getIdString(postId))
    ),
  } as FormattedPostResponse;
};

export const formatPostListResponse = (
  posts: unknown[],
  viewerId?: string,
  savedPostIds: unknown[] = []
) => posts.map((post) => formatPostResponse(post, viewerId, savedPostIds));

export const formatPaginatedPostResponse = (
  posts: unknown[],
  total: number,
  pagination: PaginationParams,
  viewerId?: string,
  savedPostIds: unknown[] = []
) => paginatedResponse(formatPostListResponse(posts, viewerId, savedPostIds), total, pagination);
