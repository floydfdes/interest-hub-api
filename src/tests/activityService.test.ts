const mockActivityCreate = jest.fn();
const mockActivityLimit = jest.fn().mockResolvedValue([]);
const mockActivitySkip = jest.fn(() => ({ limit: mockActivityLimit }));
const mockActivitySort = jest.fn(() => ({ skip: mockActivitySkip }));
const mockPopulatePost = jest.fn(() => ({ sort: mockActivitySort }));
const mockPopulateTarget = jest.fn(() => ({ populate: mockPopulatePost }));
const mockPopulateActor = jest.fn(() => ({ populate: mockPopulateTarget }));
const mockActivityFind = jest.fn(() => ({ populate: mockPopulateActor }));
const mockActivityCountDocuments = jest.fn().mockResolvedValue(22);
const mockLogError = jest.fn();

jest.mock("../models/UserActivity", () => ({
  __esModule: true,
  default: {
    create: mockActivityCreate,
    find: mockActivityFind,
    countDocuments: mockActivityCountDocuments,
  },
}));

jest.mock("../utils/logger", () => ({
  logError: mockLogError,
}));

import {
  getAdminActivitiesService,
  getUserActivitiesService,
  recordActivity,
} from "../services/activityService";

describe("activity service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActivityCreate.mockResolvedValue({});
  });

  it("records a typed activity with target context", async () => {
    await recordActivity({
      actorId: "507f1f77bcf86cd799439011",
      type: "post_liked",
      postId: "507f1f77bcf86cd799439012",
      ipAddress: "127.0.0.1",
    });

    expect(mockActivityCreate).toHaveBeenCalledWith({
      actor: "507f1f77bcf86cd799439011",
      type: "post_liked",
      post: "507f1f77bcf86cd799439012",
      ipAddress: "127.0.0.1",
      metadata: {},
    });
  });

  it("does not fail the primary action when activity storage fails", async () => {
    const error = new Error("activity database unavailable");
    mockActivityCreate.mockRejectedValueOnce(error);

    await expect(
      recordActivity({ actorId: "507f1f77bcf86cd799439011", type: "login" })
    ).resolves.toBeUndefined();
    expect(mockLogError).toHaveBeenCalledWith("Failed to record user activity", error, {
      actorId: "507f1f77bcf86cd799439011",
      type: "login",
    });
  });

  it("returns a paginated filtered admin activity list", async () => {
    const result = await getAdminActivitiesService(
      { actorId: "507f1f77bcf86cd799439011", type: "user_followed" },
      { page: 2, limit: 10, skip: 10 }
    );

    expect(mockActivityFind).toHaveBeenCalledWith({
      actor: "507f1f77bcf86cd799439011",
      type: "user_followed",
    });
    expect(mockActivitySkip).toHaveBeenCalledWith(10);
    expect(result.pagination.total).toBe(22);
  });

  it("scopes a user's activity history to their own actor ID", async () => {
    const userId = "507f1f77bcf86cd799439011";

    await getUserActivitiesService(userId, "post_created", { page: 1, limit: 20, skip: 0 });

    expect(mockActivityFind).toHaveBeenCalledWith({
      actor: userId,
      type: "post_created",
    });
    expect(mockPopulateActor).toHaveBeenCalledWith("actor", "name profilePic");
    expect(mockPopulateTarget).toHaveBeenCalledWith("targetUser", "name profilePic");
  });
});
