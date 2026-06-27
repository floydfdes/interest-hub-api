import { Request, Response } from "express";
import { sendContactReceivedEmail, sendContactTeamEmail } from "../services/emailService";

export const contactUs = async (req: Request, res: Response): Promise<void> => {
  const { name, email, message } = req.body;
  await sendContactReceivedEmail(email, name);
  await sendContactTeamEmail({ name, email, message });

  res.status(200).json({
    message: "Thanks for contacting us. We will get back to you soon.",
  });
};
