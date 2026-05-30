import { Document, Schema, Types, model } from "mongoose";

export const REPORT_TARGET_TYPES = ["post", "comment", "user"] as const;
export const REPORT_REASONS = [
  "spam",
  "harassment",
  "hate_speech",
  "violence",
  "sexual_content",
  "misinformation",
  "impersonation",
  "bad_language",
  "other",
] as const;
export const REPORT_SOURCES = ["user", "system"] as const;
export const REPORT_STATUSES = ["pending", "reviewing", "resolved", "dismissed"] as const;
export const REPORT_ACTIONS = [
  "none",
  "content_hidden",
  "content_removed",
  "user_suspended",
] as const;

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportSource = (typeof REPORT_SOURCES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ReportAction = (typeof REPORT_ACTIONS)[number];

export interface IReport extends Document {
  reporter?: Types.ObjectId;
  source: ReportSource;
  targetType: ReportTargetType;
  targetUser?: Types.ObjectId;
  post?: Types.ObjectId;
  comment?: Types.ObjectId;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  action: ReportAction;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  resolutionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: "User", index: true },
    source: { type: String, enum: REPORT_SOURCES, default: "user", index: true },
    targetType: { type: String, enum: REPORT_TARGET_TYPES, required: true, index: true },
    targetUser: { type: Schema.Types.ObjectId, ref: "User", index: true },
    post: { type: Schema.Types.ObjectId, ref: "Post", index: true },
    comment: { type: Schema.Types.ObjectId, ref: "Comment", index: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, maxlength: 500 },
    status: { type: String, enum: REPORT_STATUSES, default: "pending", index: true },
    action: { type: String, enum: REPORT_ACTIONS, default: "none" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    resolutionNote: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ reporter: 1, createdAt: -1 });

export default model<IReport>("Report", ReportSchema);
