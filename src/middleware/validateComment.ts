import { body } from "express-validator";

export const commentContentValidation = [
  body("content")
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Content must contain between 1 and 1000 characters"),
];

export const createCommentValidation = [
  body("postId").isMongoId().withMessage("Valid post ID is required"),
  ...commentContentValidation,
];
