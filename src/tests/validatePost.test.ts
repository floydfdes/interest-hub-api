import { validationResult } from "express-validator";
import { updatePostValidation } from "../middleware/validatePost";

const validateUpdatePost = async (body: Record<string, unknown>) => {
  const req = { body };

  for (const validation of updatePostValidation) {
    await validation.run(req);
  }

  return validationResult(req).array();
};

describe("updatePostValidation", () => {
  it("does not require tags when updating a post", async () => {
    await expect(validateUpdatePost({ title: "Updated title" })).resolves.toEqual([]);
  });

  it("allows an empty tags array on update", async () => {
    await expect(validateUpdatePost({ title: "Updated title", tags: [] })).resolves.toEqual([]);
  });

  it("still rejects a non-empty non-array tags value", async () => {
    await expect(validateUpdatePost({ tags: "technology" })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: "Tags must be an array",
          path: "tags",
        }),
      ])
    );
  });

  it("rejects an empty string tags value", async () => {
    await expect(validateUpdatePost({ title: "Updated title", tags: "" })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: "Tags must be an array",
          path: "tags",
        }),
      ])
    );
  });

  it("rejects null tags", async () => {
    await expect(validateUpdatePost({ title: "Updated title", tags: null })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: "Tags must be an array",
          path: "tags",
        }),
      ])
    );
  });

  it("rejects the literal null tag", async () => {
    await expect(validateUpdatePost({ title: "Updated title", tags: ["null"] })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: "Tags cannot be null",
          path: "tags[0]",
        }),
      ])
    );
  });
});
