const mockCompare = jest.fn();
jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: {
    compare: mockCompare,
    hash: jest.fn(),
  },
}));

const mockGenerateToken = jest.fn((userId: string) => `access-${userId}`);
const mockGenerateRefreshToken = jest.fn((userId: string) => `refresh-${userId}`);
jest.mock("../utils/token", () => ({
  generateRefreshToken: mockGenerateRefreshToken,
  generateResetToken: jest.fn(),
  generateToken: mockGenerateToken,
  verifyToken: jest.fn(),
}));

const mockUserFindOne = jest.fn();
const mockUserFindOneAndUpdate = jest.fn();
jest.mock("../models/User", () => ({
  __esModule: true,
  default: {
    findOne: mockUserFindOne,
    findOneAndUpdate: mockUserFindOneAndUpdate,
  },
}));

import mongoose from "mongoose";
import { loginUserService, reactivateUserService } from "../services/authService";
import { deactivateUserAccount } from "../services/userService";

describe("account lifecycle", () => {
  const userId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");

  beforeEach(() => {
    jest.clearAllMocks();
    mockCompare.mockResolvedValue(true);
  });

  it("blocks normal login for a deactivated account", async () => {
    mockUserFindOne.mockResolvedValueOnce({
      _id: userId,
      isDeactivated: true,
      password: "hashed",
    });

    await expect(loginUserService("user@example.com", "password")).rejects.toThrow(
      "Account is deactivated"
    );
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it("reactivates a deactivated account with valid credentials and returns tokens", async () => {
    const user = {
      _id: userId,
      name: "Floyd",
      username: "floyd",
      email: "user@example.com",
      password: "hashed",
      profilePic: null,
      isDeactivated: true,
      deactivatedAt: new Date(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockUserFindOne.mockResolvedValueOnce(user);

    await expect(reactivateUserService("user@example.com", "password")).resolves.toEqual({
      token: `access-${userId.toString()}`,
      refreshToken: `refresh-${userId.toString()}`,
      user: {
        id: userId,
        name: "Floyd",
        username: "floyd",
        email: "user@example.com",
        profilePic: null,
      },
    });
    expect(user.isDeactivated).toBe(false);
    expect(user.deactivatedAt).toBeNull();
    expect(user.save).toHaveBeenCalled();
  });

  it("marks an account deactivated without deleting it", async () => {
    mockUserFindOneAndUpdate.mockResolvedValueOnce({ _id: userId, isDeactivated: true });

    await deactivateUserAccount(userId.toString());

    expect(mockUserFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: userId.toString(), isDeleted: false },
      { $set: { isDeactivated: true, deactivatedAt: expect.any(Date) } },
      { new: true }
    );
  });
});
