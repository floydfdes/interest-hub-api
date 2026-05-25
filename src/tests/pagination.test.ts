import { getPagination, paginatedResponse } from "../utils/pagination";

describe("pagination utilities", () => {
  it("parses page and caps the requested limit", () => {
    expect(getPagination({ page: "3", limit: "500" })).toEqual({
      page: 3,
      limit: 50,
      skip: 100,
    });
  });

  it("returns navigation metadata for collection responses", () => {
    expect(paginatedResponse(["post"], 21, { page: 2, limit: 10, skip: 10 })).toEqual({
      items: ["post"],
      pagination: {
        page: 2,
        limit: 10,
        total: 21,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      },
    });
  });
});
