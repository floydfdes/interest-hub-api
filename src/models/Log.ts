import { Document, Schema, model } from "mongoose";

export interface ILog extends Document {
  level: string;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const LogSchema = new Schema<ILog>(
  {
    level: { type: String, required: true, index: true },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    collection: "logs",
    timestamps: true,
  }
);

LogSchema.index({ createdAt: -1 });
LogSchema.index({ level: 1, createdAt: -1 });

export default model<ILog>("Log", LogSchema);
