const mockSend = jest.fn();
const mockSendEmailCommand = jest.fn((input) => input);

jest.mock("@aws-sdk/client-ses", () => ({
  SESClient: jest.fn(() => ({ send: mockSend })),
  SendEmailCommand: mockSendEmailCommand,
}));

import { sendEmail, sendWelcomeEmail } from "../services/emailService";

describe("emailService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.EMAIL_ENABLED;
    delete process.env.EMAIL_FROM;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("skips delivery when the global email switch is disabled", async () => {
    await expect(
      sendEmail({
        to: "user@example.com",
        subject: "Hello",
        html: "<p>Hello</p>",
      })
    ).resolves.toEqual({ skipped: true });

    expect(mockSendEmailCommand).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends through SES when the global email switch is enabled", async () => {
    process.env.EMAIL_ENABLED = "true";
    process.env.EMAIL_FROM = "InterestHub <hello@example.com>";
    mockSend.mockResolvedValueOnce({ MessageId: "email-id" });

    await sendEmail({
      to: "user@example.com",
      subject: "Hello",
      html: "<p>Hello</p>",
    });

    expect(mockSendEmailCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Source: "InterestHub <hello@example.com>",
        Destination: { ToAddresses: ["user@example.com"] },
      })
    );
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("does not send user emails when the user disables email", async () => {
    process.env.EMAIL_ENABLED = "true";

    await sendWelcomeEmail({
      name: "User",
      email: "user@example.com",
      emailPreferences: { enabled: false },
    } as any);

    expect(mockSendEmailCommand).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });
});
