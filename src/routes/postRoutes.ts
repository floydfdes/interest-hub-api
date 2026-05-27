import {
  advancedSearchPosts,
  archivePost,
  bookmarkPost,
  createPost,
  deletePost,
  getAllPosts,
  getArchivedPosts,
  getBookmarkedPosts,
  getFollowingFeed,
  getHiddenPosts,
  getPostById,
  getPostLikes,
  getRecommendedPosts,
  getTrendingPosts,
  hidePost,
  likePost,
  removeBookmark,
  searchPosts,
  unlikePost,
  unhidePost,
  unarchivePost,
  updatePost,
} from "../controllers/postController";
import { createPostValidation, updatePostValidation } from "../middleware/validatePost";

import express from "express";
import authMiddleware, { optionalAuthMiddleware } from "../middleware/authMiddleware";
import validate from "../middleware/validate";

const router = express.Router();

router.post("/", authMiddleware, createPostValidation, validate, createPost);
router.get("/", getAllPosts);
router.get("/search", searchPosts);
router.get("/advanced-search", advancedSearchPosts);
router.get("/following", authMiddleware, getFollowingFeed);
router.get("/trending", getTrendingPosts);
router.get("/recommended", authMiddleware, getRecommendedPosts);
router.get("/bookmarks", authMiddleware, getBookmarkedPosts);
router.get("/hidden", authMiddleware, getHiddenPosts);
router.get("/archived", authMiddleware, getArchivedPosts);
router.get("/:id/likes", getPostLikes);
router.get("/:id", optionalAuthMiddleware, getPostById);
router.put("/:id", authMiddleware, updatePostValidation, validate, updatePost);
router.delete("/:id", authMiddleware, deletePost);
router.post("/:id/like", authMiddleware, likePost);
router.post("/:id/unlike", authMiddleware, unlikePost);
router.post("/:id/bookmark", authMiddleware, bookmarkPost);
router.delete("/:id/bookmark", authMiddleware, removeBookmark);
router.post("/:id/hide", authMiddleware, hidePost);
router.delete("/:id/hide", authMiddleware, unhidePost);
router.patch("/:id/archive", authMiddleware, archivePost);
router.patch("/:id/unarchive", authMiddleware, unarchivePost);

export default router;
