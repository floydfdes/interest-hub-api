import { Document, Schema, model } from "mongoose";

export interface ILog extends Document {
  level: string;
  message: string;
  userId?: string;
  request?: string;
  response?: string;
  statusCode?: number;
  durationMs?: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const LogSchema = new Schema<ILog>(
  {
    level: { type: String, required: true, index: true },
    message: { type: String, required: true },
    userId: { type: String, index: true },
    request: { type: String },
    response: { type: String },
    statusCode: { type: Number, index: true },
    durationMs: { type: Number },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    collection: "logs",
    timestamps: true,
  }
);

LogSchema.index({ createdAt: -1 });
LogSchema.index({ level: 1, createdAt: -1 });
LogSchema.index({ userId: 1, createdAt: -1 });

export default model<ILog>("Log", LogSchema);
