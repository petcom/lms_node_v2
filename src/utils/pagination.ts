export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResult extends PaginationParams {
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  skip: number;
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationResult {
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    skip
  };
}

/**
 * Extract and validate pagination parameters from query
 */
export function getPaginationParams(
  query: any,
  maxLimit = 100,
  defaultLimit = 25
): PaginationParams {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  // Validate and set defaults
  if (isNaN(page) || page < 1) {
    page = 1;
  }

  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  }

  // Enforce maximum limit
  if (limit > maxLimit) {
    limit = maxLimit;
  }

  return { page, limit };
}
