import { Document, Schema, Types, model } from "mongoose";

export interface IUser extends Document {
  name: string;
  username?: string;
  email: string;
  password: string;
  role: "user" | "admin";
  profilePic: string | null;
  bio: string;
  interests: string[];
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
  followRequests: Types.ObjectId[];
  blockedUsers: Types.ObjectId[];
  mutedUsers: Types.ObjectId[];
  savedPosts: Types.ObjectId[];
  savedCollections: {
    _id: Types.ObjectId;
    name: string;
    posts: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
  }[];
  recentlyViewedPosts: {
    post: Types.ObjectId;
    viewedAt: Date;
  }[];
  hiddenPosts: Types.ObjectId[];
  otp: string | null;
  otpExpires: Date | null;
  is2FAEnabled: boolean;
  twoFASecret: string;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  isBlocked: boolean;
  isDeactivated: boolean;
  deactivatedAt: Date | null;
  isPrivate: boolean;
  notificationPreferences: {
    likes: boolean;
    comments: boolean;
    replies: boolean;
    follows: boolean;
    followRequests: boolean;
    mentions: boolean;
    shares: boolean;
    moderation: boolean;
  };
  emailPreferences: {
    enabled: boolean;
  };
  warnings: {
    reason: string;
    date: Date;
  }[];
  isDeleted: boolean;
  deletedAt: Date | null;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-zA-Z0-9_]+$/,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    profilePic: {
      type: String,
      default: null,
    },
    bio: { type: String, maxlength: 160, default: "" },
    interests: { type: [String], default: [] },
    followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: Schema.Types.ObjectId, ref: "User" }],
    followRequests: [{ type: Schema.Types.ObjectId, ref: "User" }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    mutedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    savedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    savedCollections: [
      {
        name: { type: String, required: true, trim: true, maxlength: 40 },
        posts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    recentlyViewedPosts: [
      {
        post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    hiddenPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    is2FAEnabled: { type: Boolean, default: false },
    twoFASecret: { type: String, default: "" },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
    isBlocked: { type: Boolean, default: false },
    isDeactivated: { type: Boolean, default: false },
    deactivatedAt: { type: Date, default: null },
    isPrivate: { type: Boolean, default: false },
    notificationPreferences: {
      likes: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      replies: { type: Boolean, default: true },
      follows: { type: Boolean, default: true },
      followRequests: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      shares: { type: Boolean, default: true },
      moderation: { type: Boolean, default: true },
    },
    emailPreferences: {
      enabled: { type: Boolean, default: true },
    },
    warnings: [
      {
        reason: String,
        date: { type: Date, default: Date.now },
      },
    ],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        if (ret.profilePic === "") {
          ret.profilePic = null;
        }
        return ret;
      },
    },
  }
);

const User = model<IUser>("User", UserSchema);
export default User;
