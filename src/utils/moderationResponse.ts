export const moderationReviewMessage =
  "Your content was flagged for language review and is hidden until an admin checks it. It may be edited, hidden, or deleted later.";

interface ModeratedContent {
  needsReview?: boolean;
  moderationReasons?: string[];
  toObject?: () => Record<string, unknown>;
}

export const withModerationNotice = <T extends ModeratedContent>(content: T) => {
  const responseBody =
    typeof content.toObject === "function"
      ? content.toObject()
      : (content as Record<string, unknown>);

  if (!responseBody.needsReview) return responseBody;

  return {
    ...responseBody,
    moderationNotice: {
      needsReview: true,
      reasons: responseBody.moderationReasons ?? [],
      message: moderationReviewMessage,
    },
  };
};
