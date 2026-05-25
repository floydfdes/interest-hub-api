const mockUserLimit = jest.fn().mockResolvedValue([]);
const mockUserSkip = jest.fn(() => ({ limit: mockUserLimit }));
const mockUserSort = jest.fn(() => ({ skip: mockUserSkip }));
const mockUserSelect = jest.fn(() => ({ sort: mockUserSort }));
const mockUserFind = jest.fn(() => ({ select: mockUserSelect }));
const mockUserCountDocuments = jest.fn().mockResolvedValue(45);

const mockPostLimit = jest.fn().mockResolvedValue([]);
const mockPostSkip = jest.fn(() => ({ limit: mockPostLimit }));
const mockPostSort = jest.fn(() => ({ skip: mockPostSkip }));
const mockPostPopulate = jest.fn(() => ({ sort: mockPostSort }));
const mockPostFind = jest.fn(() => ({ populate: mockPostPopulate }));
const mockPostCountDocuments = jest.fn().mockResolvedValue(12);

jest.mock("../models/User", () => ({
  __esModule: true,
  default: {
    find: mockUserFind,
    countDocuments: mockUserCountDocuments,
  },
}));

jest.mock("../models/Post", () => ({
  __esModule: true,
  default: {
    find: mockPostFind,
    countDocuments: mockPostCountDocuments,
  },
}));

jest.mock("../models/Comment", () => ({
  __esModule: true,
  default: {},
}));

import { getAdminPostsService, getAdminUsersService } from "../services/adminService";

describe("admin pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("paginates admin users with common metadata", async () => {
    const result = await getAdminUsersService(undefined, { page: 2, limit: 20, skip: 20 });

    expect(mockUserSkip).toHaveBeenCalledWith(20);
    expect(mockUserLimit).toHaveBeenCalledWith(20);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it("paginates admin posts with common metadata", async () => {
    const result = await getAdminPostsService({
      visibility: "public",
      pagination: { page: 1, limit: 5, skip: 0 },
    });

    expect(mockPostFind).toHaveBeenCalledWith({ visibility: "public" });
    expect(mockPostLimit).toHaveBeenCalledWith(5);
    expect(result.pagination.total).toBe(12);
  });
});
