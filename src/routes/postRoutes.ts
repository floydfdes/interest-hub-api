import {
  advancedSearchPosts,
  addPostToSavedCollection,
  archivePost,
  bookmarkPost,
  createSavedCollection,
  createDraftPost,
  createPost,
  deleteSavedCollection,
  deletePost,
  getAllPosts,
  getArchivedPosts,
  getBookmarkedPosts,
  getDraftPosts,
  getFollowingFeed,
  getHiddenPosts,
  getPostById,
  getPostLikes,
  getPostsUnderReview,
  getRecentlyViewedPosts,
  getRecommendedPosts,
  getSavedCollectionPosts,
  getSavedCollections,
  getTrendingPosts,
  hidePost,
  likePost,
  removeBookmark,
  removePostFromSavedCollection,
  publishDraftPost,
  searchPosts,
  unlikePost,
  unhidePost,
  unarchivePost,
  updateSavedCollection,
  updateDraftPost,
  updatePost,
} from "../controllers/postController";
import { createPostValidation, updatePostValidation } from "../middleware/validatePost";

import express from "express";
import authMiddleware, { optionalAuthMiddleware } from "../middleware/authMiddleware";
import { getPostComments } from "../controllers/commentController";
import validate from "../middleware/validate";

const router = express.Router();

router.post("/", authMiddleware, createPostValidation, validate, createPost);
router.post("/drafts", authMiddleware, updatePostValidation, validate, createDraftPost);
router.get("/", optionalAuthMiddleware, getAllPosts);
router.get("/search", optionalAuthMiddleware, searchPosts);
router.get("/advanced-search", optionalAuthMiddleware, advancedSearchPosts);
router.get("/following", authMiddleware, getFollowingFeed);
router.get("/trending", optionalAuthMiddleware, getTrendingPosts);
router.get("/recommended", authMiddleware, getRecommendedPosts);
router.get("/bookmarks", authMiddleware, getBookmarkedPosts);
router.get("/saved-collections", authMiddleware, getSavedCollections);
router.post("/saved-collections", authMiddleware, createSavedCollection);
router.put("/saved-collections/:collectionId", authMiddleware, updateSavedCollection);
router.delete("/saved-collections/:collectionId", authMiddleware, deleteSavedCollection);
router.get("/saved-collections/:collectionId/posts", authMiddleware, getSavedCollectionPosts);
router.post(
  "/saved-collections/:collectionId/posts/:postId",
  authMiddleware,
  addPostToSavedCollection
);
router.delete(
  "/saved-collections/:collectionId/posts/:postId",
  authMiddleware,
  removePostFromSavedCollection
);
router.get("/recently-viewed", authMiddleware, getRecentlyViewedPosts);
router.get("/hidden", authMiddleware, getHiddenPosts);
router.get("/archived", authMiddleware, getArchivedPosts);
router.get("/review", authMiddleware, getPostsUnderReview);
router.get("/drafts", authMiddleware, getDraftPosts);
router.put("/drafts/:id", authMiddleware, updatePostValidation, validate, updateDraftPost);
router.post("/drafts/:id/publish", authMiddleware, publishDraftPost);
router.get("/:id/comments", optionalAuthMiddleware, getPostComments);
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
