import { Request, Response } from "express";
import {
  advancedSearchPostsService,
  bookmarkPostService,
  createPostService,
  deletePostService,
  getBookmarkedPostsService,
  getAllPostsService,
  getFollowingFeedService,
  getHiddenPostsService,
  getPostByIdService,
  getRecommendedPostsService,
  getTrendingPostsService,
  hidePostService,
  likePostService,
  getPostLikesService,
  removeBookmarkService,
  searchPostsService,
  TrendingPeriod,
  unlikePostService,
  unhidePostService,
  updatePostService,
} from "../services/postService";

import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import { logError } from "../utils/logger";
import { getPagination } from "../utils/pagination";
import { getActivityRequestContext, recordActivity } from "../services/activityService";

const getLimit = (value: unknown, defaultLimit = 20) => {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 50) : defaultLimit;
};

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, image, category, tags, visibility } = req.body;

    if (!req.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const post = await createPostService({
      title,
      content,
      image,
      category,
      tags,
      visibility,
      author: new mongoose.Types.ObjectId(req.userId),
    });
    await recordActivity({
      actorId: req.userId,
      type: "post_created",
      postId: post._id.toString(),
      ...getActivityRequestContext(req),
    });

    res.status(201).json(post);
  } catch (error) {
    logError("Failed to create post", error, {
      userId: req.userId,
    });
    res.status(500).json({ message: "Failed to create post" });
  }
};

export const getAllPosts = async (req: Request, res: Response) => {
  try {
    const posts = await getAllPostsService(getPagination(req.query));

    res.json(posts);
  } catch (error) {
    logError("Failed to fetch posts", error);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};

export const searchPosts = async (req: Request, res: Response) => {
  const query = typeof req.query.query === "string" ? req.query.query.trim() : "";

  if (!query) {
    res.status(400).json({ message: "Provide query to search posts" });
    return;
  }

  try {
    const posts = await searchPostsService(query);

    res.json(posts);
  } catch (error) {
    logError("Failed to search posts", error);
    res.status(500).json({ message: "Failed to search posts" });
  }
};

export const advancedSearchPosts = async (req: Request, res: Response) => {
  const category = typeof req.query.category === "string" ? req.query.category.trim() : undefined;
  const title = typeof req.query.title === "string" ? req.query.title.trim() : undefined;
  const content = typeof req.query.content === "string" ? req.query.content.trim() : undefined;
  const rawTags = typeof req.query.tags === "string" ? req.query.tags.split(",") : [];
  const tags = rawTags.map((tag) => tag.trim()).filter(Boolean);

  try {
    const posts = await advancedSearchPostsService({
      category,
      title,
      content,
      tags,
    });

    res.json(posts);
  } catch (error) {
    logError("Failed to run advanced post search", error);
    res.status(500).json({ message: "Failed to search posts" });
  }
};

export const getFollowingFeed = async (req: AuthRequest, res: Response) => {
  try {
    const posts = await getFollowingFeedService(req.userId!, getPagination(req.query));
    if (!posts) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(posts);
  } catch (error) {
    logError("Failed to fetch following feed", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to fetch following feed" });
  }
};

export const getTrendingPosts = async (req: Request, res: Response) => {
  const rawPeriod = typeof req.query.period === "string" ? req.query.period : "week";
  const validPeriods: TrendingPeriod[] = ["day", "week", "month", "all"];

  if (!validPeriods.includes(rawPeriod as TrendingPeriod)) {
    res.status(400).json({ message: "Period must be day, week, month, or all" });
    return;
  }

  try {
    const posts = await getTrendingPostsService(
      rawPeriod as TrendingPeriod,
      getLimit(req.query.limit)
    );
    res.json(posts);
  } catch (error) {
    logError("Failed to fetch trending posts", error, { period: rawPeriod });
    res.status(500).json({ message: "Failed to fetch trending posts" });
  }
};

export const getRecommendedPosts = async (req: AuthRequest, res: Response) => {
  try {
    const posts = await getRecommendedPostsService(req.userId!, getLimit(req.query.limit));
    if (!posts) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(posts);
  } catch (error) {
    logError("Failed to fetch recommended posts", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to fetch recommended posts" });
  }
};

export const bookmarkPost = async (req: AuthRequest, res: Response) => {
  try {
    const user = await bookmarkPostService(req.params.id, req.userId!);
    if (!user) {
      res.status(404).json({ message: "Post or user not found" });
      return;
    }

    res.status(200).json({ message: "Post bookmarked" });
  } catch (error) {
    logError("Failed to bookmark post", error, { postId: req.params.id, userId: req.userId });
    res.status(500).json({ message: "Failed to bookmark post" });
  }
};

export const removeBookmark = async (req: AuthRequest, res: Response) => {
  try {
    const user = await removeBookmarkService(req.params.id, req.userId!);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ message: "Bookmark removed" });
  } catch (error) {
    logError("Failed to remove bookmark", error, { postId: req.params.id, userId: req.userId });
    res.status(500).json({ message: "Failed to remove bookmark" });
  }
};

export const getBookmarkedPosts = async (req: AuthRequest, res: Response) => {
  try {
    const posts = await getBookmarkedPostsService(req.userId!);
    if (!posts) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(posts);
  } catch (error) {
    logError("Failed to fetch bookmarks", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to fetch bookmarks" });
  }
};

export const getHiddenPosts = async (req: AuthRequest, res: Response) => {
  try {
    const posts = await getHiddenPostsService(req.userId!, getPagination(req.query));
    if (!posts) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(posts);
  } catch (error) {
    logError("Failed to fetch hidden posts", error, { userId: req.userId });
    res.status(500).json({ message: "Failed to fetch hidden posts" });
  }
};

export const hidePost = async (req: AuthRequest, res: Response) => {
  try {
    const result = await hidePostService(req.params.id, req.userId!);
    if (!result) {
      res.status(404).json({ message: "Post or user not found" });
      return;
    }
    if (result.didHide) {
      await recordActivity({
        actorId: req.userId!,
        type: "post_hidden",
        postId: req.params.id,
        ...getActivityRequestContext(req),
      });
    }

    res.status(200).json({ message: "Post hidden" });
  } catch (error) {
    logError("Failed to hide post", error, { postId: req.params.id, userId: req.userId });
    res.status(500).json({ message: "Failed to hide post" });
  }
};

export const unhidePost = async (req: AuthRequest, res: Response) => {
  try {
    const result = await unhidePostService(req.params.id, req.userId!);
    if (!result) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (result.didUnhide) {
      await recordActivity({
        actorId: req.userId!,
        type: "post_unhidden",
        postId: req.params.id,
        ...getActivityRequestContext(req),
      });
    }

    res.status(200).json({ message: "Post unhidden" });
  } catch (error) {
    logError("Failed to unhide post", error, { postId: req.params.id, userId: req.userId });
    res.status(500).json({ message: "Failed to unhide post" });
  }
};

export const getPostById = async (req: Request, res: Response) => {
  try {
    const post = await getPostByIdService(req.params.id);

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    res.json(post);
  } catch (error) {
    logError("Failed to fetch post", error, { postId: req.params.id });
    res.status(500).json({ message: "Failed to fetch post" });
  }
};

export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const post = await updatePostService(req.params.id, req.userId, req.body);

    if (post === null) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    if (post === false) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    res.json(post);
  } catch (error) {
    logError("Failed to update post", error, { postId: req.params.id, userId: req.userId });
    res.status(500).json({ message: "Failed to update post" });
  }
};

export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const result = await deletePostService(req.params.id, req.userId);

    if (result === null) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    if (result === false) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    logError("Failed to delete post", error, { postId: req.params.id, userId: req.userId });
    res.status(500).json({ message: "Failed to delete post" });
  }
};

export const likePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const result = await likePostService(id, userId!);
    if (!result) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    if (result.didLike) {
      await recordActivity({
        actorId: userId!,
        type: "post_liked",
        postId: id,
        ...getActivityRequestContext(req),
      });
    }

    res.status(200).json(result.post);
  } catch (error) {
    logError("Failed to like post", error, { postId: req.params.id, userId: req.userId });
    res.status(500).json({ message: "Failed to like post" });
  }
};

export const getPostLikes = async (req: Request, res: Response) => {
  try {
    const likes = await getPostLikesService(req.params.id, getPagination(req.query));
    if (!likes) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    res.status(200).json(likes);
  } catch (error) {
    logError("Failed to fetch post likes", error, { postId: req.params.id });
    res.status(500).json({ message: "Failed to fetch post likes" });
  }
};

export const unlikePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const post = await unlikePostService(id, userId!);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    res.status(200).json(post);
  } catch (error) {
    logError("Failed to unlike post", error, { postId: req.params.id, userId: req.userId });
    res.status(500).json({ message: "Failed to unlike post" });
  }
};
