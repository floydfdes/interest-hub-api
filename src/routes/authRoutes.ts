import {
  changePassword,
  forgotPassword,
  loginUser,
  logoutUser,
  reactivateUser,
  refreshAccessToken,
  registerUser,
  resetPassword,
} from "../controllers/authController";
import {
  changePasswordValidation,
  forgotPasswordValidation,
  loginValidation,
  registerValidation,
  resetPasswordValidation,
} from "../middleware/validateAuth";

import express from "express";
import authMiddleware from "../middleware/authMiddleware";
import { authRateLimiter, passwordResetRateLimiter } from "../middleware/rateLimiters";
import validate from "../middleware/validate";

const router = express.Router();

router.post("/register", authRateLimiter, registerValidation, validate, registerUser);
router.post("/login", authRateLimiter, loginValidation, validate, loginUser);
router.post("/reactivate", authRateLimiter, loginValidation, validate, reactivateUser);
router.post("/refresh", refreshAccessToken);
router.post("/logout", authMiddleware, logoutUser);
router.post("/forgot-password", passwordResetRateLimiter, forgotPasswordValidation, validate, forgotPassword);
router.post("/reset-password", passwordResetRateLimiter, resetPasswordValidation, validate, resetPassword);
router.patch(
  "/change-password",
  authMiddleware,
  changePasswordValidation,
  validate,
  changePassword
);

export default router;
