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
  body("isPrivate").optional().isBoolean().withMessage("isPrivate must be a boolean"),
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

export const bulkCreateAdminUsersValidation = [
  body("users").isArray({ min: 1, max: 100 }).withMessage("Provide between 1 and 100 users"),
  body("users.*.name").isString().trim().notEmpty().withMessage("Name is required"),
  body("users.*.email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("users.*.password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("users.*.bio").optional().isString().isLength({ max: 160 }).withMessage("Bio is too long"),
  body("users.*.profilePic")
    .optional({ nullable: true })
    .isString()
    .withMessage("Profile picture must be a string or null"),
  body("users.*.interests").optional().isArray().withMessage("Interests must be an array"),
  body("users.*.interests.*")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Invalid interest"),
  body("users.*.role").optional().isIn(["user", "admin"]).withMessage("Invalid role"),
  body("users.*.isBlocked").optional().isBoolean().withMessage("isBlocked must be a boolean"),
  body("users.*.isPrivate").optional().isBoolean().withMessage("isPrivate must be a boolean"),
];

export const bulkCreateAdminPostsValidation = [
  body("posts").isArray({ min: 1, max: 50 }).withMessage("Provide between 1 and 50 posts"),
  body("posts.*.author").isMongoId().withMessage("Valid author ID is required"),
  body("posts.*.title").isString().trim().notEmpty().withMessage("Title is required"),
  body("posts.*.content").isString().trim().notEmpty().withMessage("Content is required"),
  body("posts.*.image").isString().notEmpty().withMessage("Image is required"),
  body("posts.*.category").isString().trim().notEmpty().withMessage("Category is required"),
  body("posts.*.visibility")
    .optional()
    .isIn(["public", "private", "followersOnly"])
    .withMessage("Visibility must be one of: public, private, followersOnly"),
  body("posts.*.tags").optional().isArray().withMessage("Tags must be an array"),
  body("posts.*.tags.*")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Tags cannot be empty"),
];
