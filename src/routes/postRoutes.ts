import {
  advancedSearchPosts,
  createPost,
  deletePost,
  getAllPosts,
  getPostById,
  likePost,
  searchPosts,
  unlikePost,
  updatePost,
} from "../controllers/postController";
import { createPostValidation, updatePostValidation } from "../middleware/validatePost";

import express from "express";
import authMiddleware from "../middleware/authMiddleware";
import validate from "../middleware/validate";

const router = express.Router();

router.post("/", authMiddleware, createPostValidation, validate, createPost);
router.get("/", getAllPosts);
router.get("/search", searchPosts);
router.get("/advanced-search", advancedSearchPosts);
router.get("/:id", getPostById);
router.put("/:id", authMiddleware, updatePostValidation, validate, updatePost);
router.delete("/:id", authMiddleware, deletePost);
router.post("/:id/like", authMiddleware, likePost);
router.post("/:id/unlike", authMiddleware, unlikePost);

export default router;
