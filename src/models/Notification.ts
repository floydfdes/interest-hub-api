import { Document, Schema, Types, model } from "mongoose";

export const NOTIFICATION_TYPES = [
  "post_liked",
  "user_followed",
  "follow_request_received",
  "follow_request_accepted",
  "comment_created",
  "reply_created",
  "post_under_review",
  "post_shared",
  "profile_shared",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification extends Document {
  recipient: Types.ObjectId;
  actor?: Types.ObjectId;
  type: NotificationType;
  post?: Types.ObjectId;
  comment?: Types.ObjectId;
  targetUser?: Types.ObjectId;
  message: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true, index: true },
    post: { type: Schema.Types.ObjectId, ref: "Post" },
    comment: { type: Schema.Types.ObjectId, ref: "Comment" },
    targetUser: { type: Schema.Types.ObjectId, ref: "User" },
    message: { type: String, required: true, maxlength: 240 },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });

export default model<INotification>("Notification", NotificationSchema);
