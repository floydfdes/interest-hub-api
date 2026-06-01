import { Types } from "mongoose";
import User from "../models/User";
import { extractMentionedUsernames } from "../utils/socialText";
import { createNotification } from "./notificationService";

interface NotifyMentionedUsersInput {
  actorId: string;
  text: string;
  previousText?: string;
  postId?: string | Types.ObjectId;
  commentId?: string | Types.ObjectId;
}

export const notifyMentionedUsers = async ({
  actorId,
  text,
  previousText = "",
  postId,
  commentId,
}: NotifyMentionedUsersInput) => {
  const previousUsernames = new Set(extractMentionedUsernames(previousText));
  const usernames = extractMentionedUsernames(text).filter(
    (username) => !previousUsernames.has(username)
  );
  if (usernames.length === 0) return;

  const mentionedUsers = await User.find({
    username: { $in: usernames },
    isDeleted: false,
    isBlocked: false,
  }).select("_id");

  await Promise.all(
    mentionedUsers.map((user) =>
      createNotification({
        recipientId: user._id as Types.ObjectId,
        actorId,
        type: "user_mentioned",
        ...(postId && { postId }),
        ...(commentId && { commentId }),
        message: "Someone mentioned you.",
      })
    )
  );
};
