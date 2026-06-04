import mongoose, { Document, Schema } from "mongoose";

export type Visibility = "public" | "private" | "followersOnly";
export type PostStatus = "draft" | "published";

export interface IPost extends Document {
  title: string;
  content: string;
  image: string;
  category: string;
  tags: string[];
  author: mongoose.Types.ObjectId;
  likes: mongoose.Types.ObjectId[];
  comments: mongoose.Types.ObjectId[];
  visibility: Visibility;
  status: PostStatus;
  viewCount: number;
  sharedFrom?: mongoose.Types.ObjectId;
  isEdited: boolean;
  isPinned: boolean;
  pinnedAt: Date | null;
  isArchived: boolean;
  archivedAt: Date | null;
  isModerationHidden: boolean;
  needsReview: boolean;
  moderationReasons: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    title: { type: String, default: "" },
    content: { type: String, default: "" },
    image: {
      type: String,
      default: "",
    },
    category: { type: String, default: "" },
    tags: [{ type: String }],
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    visibility: {
      type: String,
      enum: ["public", "private", "followersOnly"],
      default: "public",
    },
    status: { type: String, enum: ["draft", "published"], default: "published", index: true },
    viewCount: { type: Number, default: 0 },
    sharedFrom: { type: Schema.Types.ObjectId, ref: "Post", default: null },
    isEdited: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false, index: true },
    pinnedAt: { type: Date, default: null },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    isModerationHidden: { type: Boolean, default: false },
    needsReview: { type: Boolean, default: false },
    moderationReasons: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model<IPost>("Post", PostSchema);
