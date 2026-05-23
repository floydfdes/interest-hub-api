import { body } from "express-validator";

export const createPostValidation = [
  body("title").notEmpty().withMessage("Title is required"),
  body("content").notEmpty().withMessage("Content is required"),
  body("image").isString().notEmpty().withMessage("Image is required"),
  body("category").notEmpty().isString().withMessage("Category is required"),
  body("visibility")
    .isIn(["public", "private", "followersOnly"])
    .withMessage("Visibility must be one of: public, private, followersOnly"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("category").isString().withMessage("Category must be a string"),
];

export const updatePostValidation = [
  body("title").optional().isString(),
  body("content").optional().isString(),
  body("image").optional().isString().withMessage("Image must be a base64 string or data URI"),
  body("visibility")
    .optional()
    .isIn(["public", "private", "followersOnly"])
    .withMessage("Invalid visibility value"),
  body("tags").optional().isArray(),
  body("category").optional().isString(),
];
