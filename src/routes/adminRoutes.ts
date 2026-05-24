import express from "express";
import {
  blockAdminUser,
  checkAdminAccess,
  createAdminUser,
  deleteAdminComment,
  deleteAdminPost,
  deleteAdminReply,
  deleteAdminUser,
  getAdminDashboard,
  getAdminPostById,
  getAdminPosts,
  getAdminUserById,
  getAdminUsers,
  unblockAdminUser,
  updateAdminUser,
} from "../controllers/adminController";
import adminMiddleware from "../middleware/adminMiddleware";
import authMiddleware from "../middleware/authMiddleware";
import { createAdminUserValidation, updateAdminUserValidation } from "../middleware/validateAdmin";
import validate from "../middleware/validate";

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get("/access", checkAdminAccess);
router.get("/dashboard", getAdminDashboard);

router.get("/users", getAdminUsers);
router.get("/users/:id", getAdminUserById);
router.post("/users", createAdminUserValidation, validate, createAdminUser);
router.patch("/users/:id", updateAdminUserValidation, validate, updateAdminUser);
router.patch("/users/:id/block", blockAdminUser);
router.patch("/users/:id/unblock", unblockAdminUser);
router.delete("/users/:id", deleteAdminUser);

router.get("/posts", getAdminPosts);
router.get("/posts/:id", getAdminPostById);
router.delete("/posts/:id", deleteAdminPost);
router.delete("/comments/:commentId", deleteAdminComment);
router.delete("/comments/:commentId/replies/:replyIndex", deleteAdminReply);

export default router;
