import { Request, Response } from "express";

export const contactUs = (_req: Request, res: Response): void => {
    res.status(200).json({
        message: "Thanks for contacting us. We will get back to you soon.",
    });
};
