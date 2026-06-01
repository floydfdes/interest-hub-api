import {
  extractHashtags,
  extractMentionedUsernames,
  mergeTagsWithContentHashtags,
} from "../utils/socialText";

describe("social text parsing", () => {
  it("extracts unique lowercase mentioned usernames", () => {
    expect(extractMentionedUsernames("Hi @Floyd and @floyd, meet @jane_doe")).toEqual([
      "floyd",
      "jane_doe",
    ]);
  });

  it("extracts unique lowercase hashtags", () => {
    expect(extractHashtags("Love #Travel and #hidden_gems and #travel")).toEqual([
      "travel",
      "hidden_gems",
    ]);
  });

  it("merges manual tags with hashtags and limits to 10 tags", () => {
    expect(
      mergeTagsWithContentHashtags(
        ["Tech", "travel"],
        "#one #two #three #four #five #six #seven #eight #nine #ten"
      )
    ).toEqual(["tech", "travel", "one", "two", "three", "four", "five", "six", "seven", "eight"]);
  });
});
