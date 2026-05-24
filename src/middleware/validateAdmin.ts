import { body } from "express-validator";

const optionalUserFields = [
  body("bio").optional().isString().isLength({ max: 160 }).withMessage("Bio is too long"),
  body("profilePic")
    .optional({ nullable: true })
    .isString()
    .withMessage("Profile picture must be a string or null"),
  body("interests").optional().isArray().withMessage("Interests must be an array"),
  body("interests.*").optional().isString().trim().notEmpty().withMessage("Invalid interest"),
  body("role").optional().isIn(["user", "admin"]).withMessage("Invalid role"),
  body("isBlocked").optional().isBoolean().withMessage("isBlocked must be a boolean"),
];

export const createAdminUserValidation = [
  body("name").isString().trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ...optionalUserFields,
];

export const updateAdminUserValidation = [
  body("name").optional().isString().trim().notEmpty().withMessage("Name cannot be empty"),
  body("email").optional().isEmail().normalizeEmail().withMessage("Email must be valid"),
  body("password")
    .optional()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  ...optionalUserFields,
];

export const bulkDeleteAdminValidation = [
  body("ids").isArray({ min: 1, max: 100 }).withMessage("Provide between 1 and 100 selected ids"),
  body("ids.*").isMongoId().withMessage("Each selected id must be valid"),
];
