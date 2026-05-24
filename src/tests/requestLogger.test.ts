import express, { Request } from "express";
import request from "supertest";

const mockHttp = jest.fn();

jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: {
    http: mockHttp,
  },
}));

import requestLogger from "../middleware/requestLogger";

describe("requestLogger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("records user, request, and response strings without sensitive values", async () => {
    const app = express();
    app.use(express.json());
    app.use(requestLogger);
    app.post("/api/auth/login", (req: Request & { userId?: string }, res) => {
      req.userId = "507f1f77bcf86cd799439011";
      res.status(200).json({ token: "access-token", user: { name: "Floyd" } });
    });

    await request(app).post("/api/auth/login").send({
      email: "floyd@example.com",
      password: "not-for-logs",
    });

    expect(mockHttp).toHaveBeenCalledWith(
      "HTTP request",
      expect.objectContaining({
        userId: "507f1f77bcf86cd799439011",
        request: 'POST /api/auth/login body={"email":"floyd@example.com","password":"[REDACTED]"}',
        response: '{"token":"[REDACTED]","user":{"name":"Floyd"}}',
        statusCode: 200,
        method: "POST",
        path: "/api/auth/login",
      })
    );
  });

  it("logs the JSON representation of a response object that has internal cycles", async () => {
    const app = express();
    app.use(requestLogger);
    app.get("/api/circular", (_req, res) => {
      const payload: { name: string; self?: unknown; toJSON?: () => unknown } = { name: "cycle" };
      payload.self = payload;
      payload.toJSON = () => ({ name: payload.name });
      res.json(payload);
    });

    const response = await request(app).get("/api/circular");

    expect(response.statusCode).toBe(200);
    expect(mockHttp).toHaveBeenCalledWith(
      "HTTP request",
      expect.objectContaining({
        request: "GET /api/circular",
        response: '{"name":"cycle"}',
        statusCode: 200,
      })
    );
  });
});
