import { body } from "express-validator";

export const aiModerationValidation = [
  body("content")
    .isString()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage("Content must contain between 1 and 5000 characters"),
  body("context")
    .optional()
    .isIn(["post", "comment", "profile", "message"])
    .withMessage("Context must be post, comment, profile, or message"),
];

export const aiSuggestPostValidation = [
  body("title")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 150 })
    .withMessage("Title cannot exceed 150 characters"),
  body("content")
    .isString()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage("Content must contain between 1 and 5000 characters"),
  body("imageDescription")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Image description cannot exceed 1000 characters"),
];

export const aiImprovePostValidation = [
  body("title")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 150 })
    .withMessage("Title cannot exceed 150 characters"),
  body("content")
    .isString()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage("Content must contain between 1 and 5000 characters"),
  body("tone")
    .optional()
    .isIn(["casual", "friendly", "professional", "short"])
    .withMessage("Tone must be casual, friendly, professional, or short"),
];

export const aiReportSummaryValidation = [
  body("targetType").isIn(["post", "comment", "user"]).withMessage("Invalid target type"),
  body("content")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Content cannot exceed 5000 characters"),
  body("reason").isString().trim().isLength({ min: 1, max: 100 }).withMessage("Reason is required"),
  body("details")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Details cannot exceed 1000 characters"),
];

export const aiSearchQueryValidation = [
  body("query")
    .isString()
    .trim()
    .isLength({ min: 2, max: 500 })
    .withMessage("Query must contain between 2 and 500 characters"),
];
