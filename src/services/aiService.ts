export class AiProviderNotConfiguredError extends Error {
  constructor() {
    super("AI provider is not configured");
  }
}

export class AiProviderError extends Error {
  constructor(message = "AI provider request failed") {
    super(message);
  }
}

type AiJson = Record<string, unknown>;

interface AiRequest {
  systemPrompt: string;
  userPrompt: string;
}

const getAiConfig = () => ({
  apiKey: process.env.OPENAI_API_KEY || process.env.AI_API_KEY,
  model: process.env.OPENAI_MODEL || process.env.AI_MODEL || "gpt-4o-mini",
  url: process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions",
});

const parseAiJson = (content: string): AiJson => {
  try {
    return JSON.parse(content) as AiJson;
  } catch {
    throw new AiProviderError("AI provider returned invalid JSON");
  }
};

const callAiJson = async ({ systemPrompt, userPrompt }: AiRequest): Promise<AiJson> => {
  const { apiKey, model, url } = getAiConfig();
  if (!apiKey) throw new AiProviderNotConfiguredError();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new AiProviderError(`AI provider request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new AiProviderError("AI provider returned no content");

  return parseAiJson(content);
};

const jsonPrompt = (value: unknown) => JSON.stringify(value, null, 2);

export const moderateContentWithAiService = async (input: {
  content: string;
  context?: "post" | "comment" | "profile" | "message";
}) =>
  callAiJson({
    systemPrompt:
      "You are a content safety classifier for a social media app. Return only JSON with keys: needsReview boolean, riskLevel low|medium|high, reasons string[], explanation string, suggestedAction allow|needs_review|hide.",
    userPrompt: jsonPrompt(input),
  });

export const suggestPostWithAiService = async (input: {
  title?: string;
  content: string;
  imageDescription?: string;
}) =>
  callAiJson({
    systemPrompt:
      "You help categorize social posts. Return only JSON with keys: title string, category string, tags string[], caption string. Tags must be lowercase, no spaces, max 10.",
    userPrompt: jsonPrompt(input),
  });

export const improvePostWithAiService = async (input: {
  title?: string;
  content: string;
  tone?: "casual" | "friendly" | "professional" | "short";
}) =>
  callAiJson({
    systemPrompt:
      "You improve user-written social post drafts without changing the user's intent. Return only JSON with keys: title string, content string, tags string[], notes string[]. Keep it concise.",
    userPrompt: jsonPrompt(input),
  });

export const summarizeReportWithAiService = async (input: {
  targetType: "post" | "comment" | "user";
  content?: string;
  reason: string;
  details?: string;
}) =>
  callAiJson({
    systemPrompt:
      "You assist moderation review for a social app. Return only JSON with keys: summary string, riskLevel low|medium|high, policyConcerns string[], recommendedAction dismiss|review|hide_content|remove_content|warn_user|block_user, rationale string.",
    userPrompt: jsonPrompt(input),
  });

export const expandSearchQueryWithAiService = async (input: { query: string }) =>
  callAiJson({
    systemPrompt:
      "You expand a social app search query for semantic search. Return only JSON with keys: rewrittenQuery string, concepts string[], tags string[], categories string[]. Keep arrays short and useful.",
    userPrompt: jsonPrompt(input),
  });
