import { generateRefreshToken, generateResetToken, generateToken, verifyToken } from "../utils/token";

import bcrypt from "bcryptjs";
import User from "../models/User";
import {
  sendAccountReactivatedEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "./emailService";

const normalizeUsername = (username: string) => username.trim().toLowerCase();

const usernameBaseFrom = (name: string, email: string) => {
  const base = name.toLowerCase().replace(/[^a-z0-9_]/g, "") || email.split("@")[0].toLowerCase();
  return base.replace(/[^a-z0-9_]/g, "").slice(0, 24) || "user";
};

const getAvailableUsername = async (name: string, email: string, requestedUsername?: string) => {
  if (requestedUsername) {
    const username = normalizeUsername(requestedUsername);
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      throw new Error("Username can only contain letters, numbers, and underscores");
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) throw new Error("Username already in use");
    return username;
  }

  const base = usernameBaseFrom(name, email);
  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const username = suffix === 0 ? base : `${base}${suffix}`;
    const existingUser = await User.findOne({ username });
    if (!existingUser) return username;
  }

  return `${base}${Date.now().toString().slice(-6)}`.slice(0, 30);
};

export const registerUserService = async (name: string, email: string, password: string, username?: string) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error("Email already in use");

  const hashedPassword = await bcrypt.hash(password, 10);
  const availableUsername = await getAvailableUsername(name, email, username);

  const user = new User({
    name,
    username: availableUsername,
    email,
    password: hashedPassword,
  });

  await user.save();
  await sendWelcomeEmail(user);

  const token = generateToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  return {
    token,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic || null,
    },
  };
};

export const loginUserService = async (email: string, password: string) => {
  const user = await User.findOne({ email, isDeleted: false, isBlocked: false });
  if (!user) throw new Error("Invalid credentials");
  if (user.isDeactivated) throw new Error("Account is deactivated");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid credentials");

  const token = generateToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  return {
    token,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic || null,
    },
  };
};

export const reactivateUserService = async (email: string, password: string) => {
  const user = await User.findOne({ email, isDeleted: false, isBlocked: false });
  if (!user) throw new Error("Invalid credentials");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid credentials");

  user.isDeactivated = false;
  user.deactivatedAt = null;
  await user.save();
  await sendAccountReactivatedEmail(user);

  const token = generateToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  return {
    token,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      profilePic: user.profilePic || null,
    },
  };
};

export const refreshAccessTokenService = (refreshToken: string) => {
  try {
    const decoded = verifyToken(refreshToken, "refresh");
    return generateToken(decoded.userId);
  } catch {
    throw new Error("Invalid or expired refresh token");
  }
};

export const forgotPasswordService = async (email: string): Promise<string | null> => {
  const user = await User.findOne({ email, isDeleted: false });
  if (!user) return null;

  const token = generateResetToken();
  const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now

  user.resetToken = token;
  user.resetTokenExpiry = expiry;
  await user.save();

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user, resetLink);
  return resetLink;
};

export const resetPasswordService = async (token: string, newPassword: string): Promise<void> => {
  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: new Date() },
  });

  if (!user) throw new Error("Invalid or expired token");

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  user.resetToken = null;
  user.resetTokenExpiry = null;

  await user.save();
  await sendPasswordChangedEmail(user);
};

export const changePasswordService = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new Error("Current password is incorrect");

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedNewPassword;

  await user.save();
  await sendPasswordChangedEmail(user);
};
