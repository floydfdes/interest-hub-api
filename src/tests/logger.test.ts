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

  it("stores request and response fields at the top level for HTTP logs", () => {
    const transport = new MongoLogTransport();

    transport.log(
      {
        level: "http",
        message: "HTTP request",
        userId: "507f1f77bcf86cd799439011",
        request: "GET /api/posts",
        response: "[]",
        statusCode: 200,
        durationMs: 12,
        method: "GET",
      },
      jest.fn()
    );

    expect(mockCreate).toHaveBeenCalledWith({
      level: "http",
      message: "HTTP request",
      userId: "507f1f77bcf86cd799439011",
      request: "GET /api/posts",
      response: "[]",
      statusCode: 200,
      durationMs: 12,
      metadata: { method: "GET" },
    });
  });
});
