import { Request, Response } from "express";
import {
  advancedSearchPostsService,
  bookmarkPostService,
  createPostService,
  deletePostService,
  getBookmarkedPostsService,
  getAllPostsService,
  getFollowingFeedService,
  getPostByIdService,
  getRecommendedPostsService,
  getTrendingPostsService,
  likePostService,
  removeBookmarkService,
  searchPostsService,
  TrendingPeriod,
  unlikePostService,
  updatePostService,
} from "../services/postService";

import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import logger from "../utils/logger";

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

    res.status(201).json(post);
  } catch (error) {
    logger.error(
      `Failed to create post: ${error instanceof Error ? error.message : "Unknown upload error"}`
    );
    res.status(500).json({ message: "Failed to create post" });
  }
};

export const getAllPosts = async (_req: Request, res: Response) => {
  try {
    const posts = await getAllPostsService();

    res.json(posts);
  } catch (error) {
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
    res.status(500).json({ message: "Failed to search posts" });
  }
};

export const getFollowingFeed = async (req: AuthRequest, res: Response) => {
  try {
    const posts = await getFollowingFeedService(req.userId!, getLimit(req.query.limit));
    if (!posts) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(posts);
  } catch (error) {
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
    res.status(500).json({ message: "Failed to fetch bookmarks" });
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
    res.status(500).json({ message: "Failed to delete post" });
  }
};

export const likePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const post = await likePostService(id, userId!);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: "Failed to like post" });
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
    res.status(500).json({ message: "Failed to unlike post" });
  }
};
