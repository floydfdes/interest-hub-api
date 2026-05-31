import { Document, Schema, Types, model } from "mongoose";

export const SHARE_TARGET_TYPES = ["post", "profile", "comment"] as const;

export type ShareTargetType = (typeof SHARE_TARGET_TYPES)[number];

export interface IShare extends Document {
  sender: Types.ObjectId;
  recipient: Types.ObjectId;
  targetType: ShareTargetType;
  post?: Types.ObjectId;
  targetUser?: Types.ObjectId;
  comment?: Types.ObjectId;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShareSchema = new Schema<IShare>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetType: { type: String, enum: SHARE_TARGET_TYPES, required: true, index: true },
    post: { type: Schema.Types.ObjectId, ref: "Post" },
    targetUser: { type: Schema.Types.ObjectId, ref: "User" },
    comment: { type: Schema.Types.ObjectId, ref: "Comment" },
    message: { type: String, maxlength: 500, trim: true },
  },
  { timestamps: true }
);

ShareSchema.index({ recipient: 1, createdAt: -1 });
ShareSchema.index({ sender: 1, createdAt: -1 });

export default model<IShare>("Share", ShareSchema);
