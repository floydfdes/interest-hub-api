const USERNAME_PATTERN = /@([a-zA-Z0-9_]{3,30})/g;
const HASHTAG_PATTERN = /#([a-zA-Z0-9_-]{1,30})/g;

const uniqueLowercaseMatches = (text: string, pattern: RegExp) => {
  const matches = [...text.matchAll(pattern)].map((match) => match[1].toLowerCase());
  return [...new Set(matches)];
};

export const extractMentionedUsernames = (text: string) =>
  uniqueLowercaseMatches(text, USERNAME_PATTERN);

export const extractHashtags = (text: string) => uniqueLowercaseMatches(text, HASHTAG_PATTERN);

export const mergeTagsWithContentHashtags = (tags: string[] = [], content = "") =>
  [
    ...new Set([
      ...tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
      ...extractHashtags(content),
    ]),
  ].slice(0, 10);
