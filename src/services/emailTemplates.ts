const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const paragraph = (content: string) =>
  `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#4f4a70;">${content}</p>`;

const actionLink = (href: string, label: string) =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;background:#6d3df5;color:#ffffff;text-decoration:none;border-radius:999px;padding:13px 22px;font-weight:700;">${escapeHtml(label)}</a>`;

const baseTemplate = (title: string, body: string) => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#f8f7ff;color:#20135f;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #ece8ff;">
            <tr>
              <td>
                <p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6d3df5;">InterestHub</p>
                <h1 style="margin:0 0 18px;font-size:28px;line-height:1.2;color:#20135f;">${escapeHtml(title)}</h1>
                ${body}
                <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#777293;">This email was sent by InterestHub.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export const welcomeEmailTemplate = (name: string) => ({
  subject: "Welcome to InterestHub",
  html: baseTemplate(
    "Welcome to InterestHub",
    `${paragraph(`Hi ${escapeHtml(name)},`)}
     ${paragraph("Your InterestHub account is ready. Start exploring interests, sharing posts, saving ideas, and following people who match your world.")}`
  ),
});

export const passwordResetEmailTemplate = (name: string, resetLink: string) => ({
  subject: "Reset your InterestHub password",
  html: baseTemplate(
    "Reset your password",
    `${paragraph(`Hi ${escapeHtml(name)},`)}
     ${paragraph("Use the button below to reset your password. This link expires in 1 hour.")}
     ${actionLink(resetLink, "Reset password")}`
  ),
});

export const passwordChangedEmailTemplate = (name: string) => ({
  subject: "Your InterestHub password was changed",
  html: baseTemplate(
    "Password changed",
    `${paragraph(`Hi ${escapeHtml(name)},`)}
     ${paragraph("Your InterestHub password was changed. If this was not you, reset your password immediately.")}`
  ),
});

export const accountReactivatedEmailTemplate = (name: string) => ({
  subject: "Your InterestHub account was reactivated",
  html: baseTemplate(
    "Account reactivated",
    `${paragraph(`Hi ${escapeHtml(name)},`)}
     ${paragraph("Your InterestHub account is active again. Welcome back.")}`
  ),
});

export const accountDeactivatedEmailTemplate = (name: string) => ({
  subject: "Your InterestHub account was deactivated",
  html: baseTemplate(
    "Account deactivated",
    `${paragraph(`Hi ${escapeHtml(name)},`)}
     ${paragraph("Your InterestHub account has been deactivated. You can reactivate it by signing in again.")}`
  ),
});

export const accountDeletedEmailTemplate = (name: string) => ({
  subject: "Your InterestHub account was deleted",
  html: baseTemplate(
    "Account deleted",
    `${paragraph(`Hi ${escapeHtml(name)},`)}
     ${paragraph("Your InterestHub account has been marked as deleted. If this was not you, contact support.")}`
  ),
});

export const contactReceivedEmailTemplate = (name: string) => ({
  subject: "We received your message",
  html: baseTemplate(
    "We received your message",
    `${paragraph(`Hi ${escapeHtml(name)},`)}
     ${paragraph("Thanks for contacting InterestHub. We received your message and will get back to you soon.")}`
  ),
});

export const contactTeamEmailTemplate = (input: { name: string; email: string; message: string }) => ({
  subject: `New contact message from ${input.name}`,
  html: baseTemplate(
    "New contact message",
    `${paragraph(`<strong>Name:</strong> ${escapeHtml(input.name)}`)}
     ${paragraph(`<strong>Email:</strong> ${escapeHtml(input.email)}`)}
     <p style="margin:0;font-size:16px;line-height:1.7;color:#4f4a70;white-space:pre-line;">${escapeHtml(input.message)}</p>`
  ),
});

export const reportReviewedEmailTemplate = (name: string, status: string) => ({
  subject: "Your report was reviewed",
  html: baseTemplate(
    "Your report was reviewed",
    `${paragraph(`Hi ${escapeHtml(name)},`)}
     ${paragraph(`Your report has been marked as <strong>${escapeHtml(status)}</strong>. Thank you for helping keep InterestHub safe.`)}`
  ),
});

export const moderationHiddenEmailTemplate = (name: string, targetType: "post" | "comment") => ({
  subject: `Your ${targetType} is under review`,
  html: baseTemplate(
    `Your ${targetType} is under review`,
    `${paragraph(`Hi ${escapeHtml(name)},`)}
     ${paragraph(`Your ${targetType} was hidden because it needs moderation review. We will restore it if it passes review.`)}`
  ),
});
