const mockCreate = jest.fn().mockResolvedValue(undefined);

jest.mock("../models/Log", () => ({
  __esModule: true,
  default: {
    create: mockCreate,
  },
}));

jest.mock("mongoose", () => ({
  __esModule: true,
  default: {
    connection: { readyState: 1 },
  },
}));

import { MongoLogTransport } from "../utils/logger";

describe("MongoLogTransport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores logs in one MongoDB collection with searchable metadata", () => {
    const transport = new MongoLogTransport();
    const callback = jest.fn();

    transport.log(
      {
        level: "error",
        message: "Failed to fetch post",
        postId: "507f1f77bcf86cd799439011",
        error: { message: "Database failed" },
      },
      callback
    );

    expect(mockCreate).toHaveBeenCalledWith({
      level: "error",
      message: "Failed to fetch post",
      metadata: {
        postId: "507f1f77bcf86cd799439011",
        error: { message: "Database failed" },
      },
    });
    expect(callback).toHaveBeenCalled();
  });
});
