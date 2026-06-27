import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import User, { IUser } from "../models/User";
import { logError } from "../utils/logger";
import {
  accountDeactivatedEmailTemplate,
  accountDeletedEmailTemplate,
  accountReactivatedEmailTemplate,
  contactReceivedEmailTemplate,
  contactTeamEmailTemplate,
  moderationHiddenEmailTemplate,
  passwordChangedEmailTemplate,
  passwordResetEmailTemplate,
  reportReviewedEmailTemplate,
  welcomeEmailTemplate,
} from "./emailTemplates";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

type EmailUser = Pick<IUser, "email" | "name" | "emailPreferences">;

const isEmailEnabled = () => process.env.EMAIL_ENABLED === "true";
const getEmailFrom = () => process.env.EMAIL_FROM || "InterestHub <no-reply@example.com>";
const getAwsRegion = () => process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ap-south-1";

const client = new SESClient({ region: getAwsRegion() });

const canEmailUser = (user: EmailUser | null | undefined): user is EmailUser =>
  Boolean(user?.email && user.emailPreferences?.enabled !== false);

export const sendEmail = async ({ to, subject, html }: EmailPayload) => {
  if (!isEmailEnabled()) return { skipped: true };

  return client.send(
    new SendEmailCommand({
      Source: getEmailFrom(),
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: { Html: { Data: html, Charset: "UTF-8" } },
      },
    })
  );
};

const sendEmailSafely = async (payload: EmailPayload, context: Record<string, unknown>) => {
  try {
    await sendEmail(payload);
  } catch (error) {
    logError("Email delivery failed", error, context);
  }
};

const sendUserEmailSafely = async (
  user: EmailUser | null | undefined,
  template: { subject: string; html: string },
  context: Record<string, unknown>
) => {
  if (!canEmailUser(user)) return;
  await sendEmailSafely({ to: user.email, ...template }, { ...context, to: user.email });
};

export const sendWelcomeEmail = async (user: EmailUser) => {
  await sendUserEmailSafely(user, welcomeEmailTemplate(user.name), { emailType: "welcome" });
};

export const sendPasswordResetEmail = async (user: EmailUser, resetLink: string) => {
  await sendUserEmailSafely(user, passwordResetEmailTemplate(user.name, resetLink), {
    emailType: "password_reset",
  });
};

export const sendPasswordChangedEmail = async (user: EmailUser) => {
  await sendUserEmailSafely(user, passwordChangedEmailTemplate(user.name), {
    emailType: "password_changed",
  });
};

export const sendAccountReactivatedEmail = async (user: EmailUser) => {
  await sendUserEmailSafely(user, accountReactivatedEmailTemplate(user.name), {
    emailType: "account_reactivated",
  });
};

export const sendAccountDeactivatedEmail = async (user: EmailUser) => {
  await sendUserEmailSafely(user, accountDeactivatedEmailTemplate(user.name), {
    emailType: "account_deactivated",
  });
};

export const sendAccountDeletedEmail = async (user: EmailUser) => {
  await sendUserEmailSafely(user, accountDeletedEmailTemplate(user.name), {
    emailType: "account_deleted",
  });
};

export const sendContactReceivedEmail = async (to: string, name: string) => {
  await sendEmailSafely({ to, ...contactReceivedEmailTemplate(name) }, { emailType: "contact_received", to });
};

export const sendContactTeamEmail = async (input: { name: string; email: string; message: string }) => {
  const to = process.env.CONTACT_TO_EMAIL;
  if (!to) return;

  await sendEmailSafely({ to, ...contactTeamEmailTemplate(input) }, { emailType: "contact_team", from: input.email });
};

export const sendReportReviewedEmail = async (user: EmailUser, status: string) => {
  await sendUserEmailSafely(user, reportReviewedEmailTemplate(user.name, status), {
    emailType: "report_reviewed",
    status,
  });
};

export const sendModerationHiddenEmail = async (userId: string, targetType: "post" | "comment") => {
  const user = await User.findOne({ _id: userId, isDeleted: false }).select("name email emailPreferences");
  await sendUserEmailSafely(user, moderationHiddenEmailTemplate(user?.name || "there", targetType), {
    emailType: "moderation_hidden",
    targetType,
    userId,
  });
};
