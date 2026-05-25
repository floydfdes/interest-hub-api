export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMetadata;
}

const parsePositiveInteger = (value: unknown, fallback: number, maximum?: number): number => {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return maximum ? Math.min(parsed, maximum) : parsed;
};

export const getPagination = (
  query: { page?: unknown; limit?: unknown },
  defaultLimit = 20,
  maximumLimit = 50
): PaginationParams => {
  const page = parsePositiveInteger(query.page, 1);
  const limit = parsePositiveInteger(query.limit, defaultLimit, maximumLimit);

  return { page, limit, skip: (page - 1) * limit };
};

export const paginatedResponse = <T>(
  items: T[],
  total: number,
  { page, limit }: PaginationParams
): PaginatedResponse<T> => {
  const totalPages = Math.ceil(total / limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};
