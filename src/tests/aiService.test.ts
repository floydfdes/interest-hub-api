import {
  AiProviderNotConfiguredError,
  moderateContentWithAiService,
  suggestPostWithAiService,
} from "../services/aiService";

describe("aiService", () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_API_KEY;
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it("fails clearly when no AI API key is configured", async () => {
    await expect(
      moderateContentWithAiService({ content: "Check this content", context: "post" })
    ).rejects.toBeInstanceOf(AiProviderNotConfiguredError);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls the provider and parses JSON responses", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_MODEL = "test-model";
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Travel Gems",
                category: "Travel",
                tags: ["travel", "hidden-gems"],
                caption: "A polished caption",
              }),
            },
          },
        ],
      }),
    });

    await expect(
      suggestPostWithAiService({
        content: "I love exploring hidden places",
      })
    ).resolves.toEqual({
      title: "Travel Gems",
      category: "Travel",
      tags: ["travel", "hidden-gems"],
      caption: "A polished caption",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        },
        body: expect.stringContaining("\"model\":\"test-model\""),
      })
    );
  });
});
