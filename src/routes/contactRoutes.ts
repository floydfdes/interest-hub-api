import express from "express";
import { contactUs } from "../controllers/contactController";
import validate from "../middleware/validate";
import { contactValidation } from "../middleware/validateContact";

const router = express.Router();

router.post("/", contactValidation, validate, contactUs);

export default router;
