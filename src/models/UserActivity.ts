import { Document, Schema, Types, model } from "mongoose";

export const USER_ACTIVITY_TYPES = [
  "login",
  "post_created",
  "user_followed",
  "post_liked",
  "report_submitted",
  "user_blocked",
  "user_unblocked",
  "user_muted",
  "user_unmuted",
  "post_hidden",
  "post_unhidden",
] as const;

export type UserActivityType = (typeof USER_ACTIVITY_TYPES)[number];

export interface IUserActivity extends Document {
  actor: Types.ObjectId;
  type: UserActivityType;
  targetUser?: Types.ObjectId;
  post?: Types.ObjectId;
  report?: Types.ObjectId;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const UserActivitySchema = new Schema<IUserActivity>(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: USER_ACTIVITY_TYPES,
      required: true,
      index: true,
    },
    targetUser: { type: Schema.Types.ObjectId, ref: "User", index: true },
    post: { type: Schema.Types.ObjectId, ref: "Post", index: true },
    report: { type: Schema.Types.ObjectId, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    collection: "user_activities",
    timestamps: true,
  }
);

UserActivitySchema.index({ createdAt: -1 });
UserActivitySchema.index({ actor: 1, createdAt: -1 });
UserActivitySchema.index({ type: 1, createdAt: -1 });

export default model<IUserActivity>("UserActivity", UserActivitySchema);
