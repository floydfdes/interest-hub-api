import { body } from "express-validator";

export const contactValidation = [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("A valid email is required"),
    body("message")
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage("Message must be between 10 and 2000 characters"),
];
