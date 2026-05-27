import express from "express";
import {
  blockAdminUser,
  bulkCreateAdminPosts,
  bulkCreateAdminUsers,
  bulkDeleteAdminComments,
  bulkDeleteAdminPosts,
  bulkDeleteAdminUsers,
  checkAdminAccess,
  createAdminUser,
  deleteAdminComment,
  deleteAdminPost,
  deleteAdminReply,
  deleteAdminUser,
  getAdminDashboard,
  getAdminActivities,
  getAdminPostById,
  getAdminPosts,
  getAdminUserById,
  getAdminUsers,
  unblockAdminUser,
  updateAdminUser,
} from "../controllers/adminController";
import adminMiddleware from "../middleware/adminMiddleware";
import authMiddleware from "../middleware/authMiddleware";
import {
  bulkCreateAdminPostsValidation,
  bulkCreateAdminUsersValidation,
  bulkDeleteAdminValidation,
  createAdminUserValidation,
  updateAdminUserValidation,
} from "../middleware/validateAdmin";
import validate from "../middleware/validate";

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get("/access", checkAdminAccess);
router.get("/dashboard", getAdminDashboard);
router.get("/activities", getAdminActivities);

router.get("/users", getAdminUsers);
router.post("/users/bulk-create", bulkCreateAdminUsersValidation, validate, bulkCreateAdminUsers);
router.post("/users/bulk-delete", bulkDeleteAdminValidation, validate, bulkDeleteAdminUsers);
router.get("/users/:id", getAdminUserById);
router.post("/users", createAdminUserValidation, validate, createAdminUser);
router.patch("/users/:id", updateAdminUserValidation, validate, updateAdminUser);
router.patch("/users/:id/block", blockAdminUser);
router.patch("/users/:id/unblock", unblockAdminUser);
router.delete("/users/:id", deleteAdminUser);

router.get("/posts", getAdminPosts);
router.post("/posts/bulk-create", bulkCreateAdminPostsValidation, validate, bulkCreateAdminPosts);
router.post("/posts/bulk-delete", bulkDeleteAdminValidation, validate, bulkDeleteAdminPosts);
router.get("/posts/:id", getAdminPostById);
router.delete("/posts/:id", deleteAdminPost);
router.post("/comments/bulk-delete", bulkDeleteAdminValidation, validate, bulkDeleteAdminComments);
router.delete("/comments/:commentId", deleteAdminComment);
router.delete("/comments/:commentId/replies/:replyIndex", deleteAdminReply);

export default router;
