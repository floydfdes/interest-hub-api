import { body } from "express-validator";

export const createShareValidation = [
  body("recipientId").isMongoId().withMessage("Valid recipientId is required"),
  body("targetType")
    .isIn(["post", "profile"])
    .withMessage("targetType must be one of: post, profile"),
  body("targetId").isMongoId().withMessage("Valid targetId is required"),
  body("message")
    .optional()
    .isString()
    .withMessage("Message must be a string")
    .trim()
    .isLength({ max: 500 })
    .withMessage("Message cannot be longer than 500 characters"),
];
