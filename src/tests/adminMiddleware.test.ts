import { NextFunction, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";

const mockSelect = jest.fn();
const mockFindOne = jest.fn(() => ({ select: mockSelect }));
const mockLogError = jest.fn();

jest.mock("../models/User", () => ({
  __esModule: true,
  default: {
    findOne: mockFindOne,
  },
}));

jest.mock("../utils/logger", () => ({
  logError: mockLogError,
}));

import adminMiddleware from "../middleware/adminMiddleware";

const createResponse = () =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }) as unknown as Response;

describe("adminMiddleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows an active administrator", async () => {
    mockSelect.mockResolvedValue({ role: "admin" });
    const req = { userId: "507f1f77bcf86cd799439011" } as AuthRequest;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await adminMiddleware(req, res, next);

    expect(mockFindOne).toHaveBeenCalledWith({
      _id: req.userId,
      isDeleted: false,
      isBlocked: false,
    });
    expect(next).toHaveBeenCalled();
  });

  it("forbids a regular user", async () => {
    mockSelect.mockResolvedValue({ role: "user" });
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    await adminMiddleware({ userId: "regular-user" } as AuthRequest, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Admin access required" });
    expect(next).not.toHaveBeenCalled();
  });
});
