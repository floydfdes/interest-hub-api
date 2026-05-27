import { Document, Schema, Types, model } from "mongoose";

export interface IUser extends Document {
  name: string;
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
  hiddenPosts: Types.ObjectId[];
  otp: string | null;
  otpExpires: Date | null;
  is2FAEnabled: boolean;
  twoFASecret: string;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  isBlocked: boolean;
  isPrivate: boolean;
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
    hiddenPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    is2FAEnabled: { type: Boolean, default: false },
    twoFASecret: { type: String, default: "" },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
    isBlocked: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
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
