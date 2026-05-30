import { Types } from "mongoose";
import { englishDataset, englishRecommendedTransformers, RegExpMatcher } from "obscenity";
import Report from "../models/Report";

export const MODERATION_REASONS = ["bad_language"] as const;
export type ModerationReason = (typeof MODERATION_REASONS)[number];

interface ContentModerationResult {
  needsReview: boolean;
  reasons: ModerationReason[];
  matches: string[];
}

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

export const analyzeContentModeration = (
  values: Array<string | undefined>
): ContentModerationResult => {
  const combinedText = values.filter(Boolean).join(" ");
  const matches = matcher.getAllMatches(combinedText, true);

  return {
    needsReview: matches.length > 0,
    reasons: matches.length > 0 ? ["bad_language"] : [],
    matches: matches.map((_, index) => `match_${index + 1}`),
  };
};

export const createAutoModerationReport = async ({
  targetType,
  targetId,
}: {
  targetType: "post" | "comment";
  targetId: Types.ObjectId;
}) => {
  const target = targetType === "post" ? { post: targetId } : { comment: targetId };

  const existingReport = await Report.findOne({
    targetType,
    ...target,
    reason: "bad_language",
    source: "system",
    status: { $in: ["pending", "reviewing"] },
  });
  if (existingReport) return existingReport;

  return Report.create({
    targetType,
    ...target,
    reason: "bad_language",
    source: "system",
    details: "Automatically flagged for bad language review",
  });
};
