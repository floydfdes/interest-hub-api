import { body } from "express-validator";
import {
  REPORT_ACTIONS,
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
} from "../models/Report";

export const createReportValidation = [
  body("targetType").isIn(REPORT_TARGET_TYPES).withMessage("Invalid report target type"),
  body("targetId").isMongoId().withMessage("Valid target ID is required"),
  body("reason").isIn(REPORT_REASONS).withMessage("Invalid report reason"),
  body("details")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Report details cannot exceed 500 characters"),
];

export const reviewReportValidation = [
  body("status")
    .isIn(REPORT_STATUSES.filter((status) => status !== "pending"))
    .withMessage("Status must be reviewing, resolved, or dismissed"),
  body("note")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Review note cannot exceed 500 characters"),
];

export const moderateReportValidation = [
  body("action")
    .isIn(REPORT_ACTIONS.filter((action) => action !== "none"))
    .withMessage("Invalid moderation action"),
  body("note")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Moderation note cannot exceed 500 characters"),
];
