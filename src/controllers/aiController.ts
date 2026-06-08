import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  AiProviderNotConfiguredError,
  expandSearchQueryWithAiService,
  improvePostWithAiService,
  moderateContentWithAiService,
  suggestPostWithAiService,
  summarizeReportWithAiService,
} from "../services/aiService";
import { logError } from "../utils/logger";

const handleAiError = (res: Response, error: unknown, logMessage: string) => {
  if (error instanceof AiProviderNotConfiguredError) {
    res.status(503).json({
      message: "AI provider is not configured",
      requiredEnv: "OPENAI_API_KEY",
    });
    return;
  }

  logError(logMessage, error);
  res.status(502).json({ message: "AI provider request failed" });
};

export const moderateContent = async (req: AuthRequest, res: Response) => {
  try {
    res.status(200).json(await moderateContentWithAiService(req.body));
  } catch (error) {
    handleAiError(res, error, "AI moderation failed");
  }
};

export const suggestPost = async (req: AuthRequest, res: Response) => {
  try {
    res.status(200).json(await suggestPostWithAiService(req.body));
  } catch (error) {
    handleAiError(res, error, "AI post suggestion failed");
  }
};

export const improvePost = async (req: AuthRequest, res: Response) => {
  try {
    res.status(200).json(await improvePostWithAiService(req.body));
  } catch (error) {
    handleAiError(res, error, "AI post improvement failed");
  }
};

export const summarizeReport = async (req: AuthRequest, res: Response) => {
  try {
    res.status(200).json(await summarizeReportWithAiService(req.body));
  } catch (error) {
    handleAiError(res, error, "AI report summary failed");
  }
};

export const expandSearchQuery = async (req: AuthRequest, res: Response) => {
  try {
    res.status(200).json(await expandSearchQueryWithAiService(req.body));
  } catch (error) {
    handleAiError(res, error, "AI search expansion failed");
  }
};
