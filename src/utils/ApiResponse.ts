export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiSuccessResponse<T = any> {
  status: 'success';
  success: true;  // For frontend compatibility
  message?: string;
  data: T;
  pagination?: PaginationInfo;
}

export interface ApiErrorResponse {
  status: 'error';
  success: false;  // For frontend compatibility
  message: string;
  errors?: any[];
}

export class ApiResponse {
  static success<T>(data: T, message?: string): ApiSuccessResponse<T> {
    const response: ApiSuccessResponse<T> = {
      status: 'success',
      success: true,
      data
    };

    if (message) {
      response.message = message;
    }

    return response;
  }

  static created<T>(data: T, message?: string): ApiSuccessResponse<T> {
    return this.success(data, message);
  }

  static paginated<T>(
    data: T[],
    pagination: Omit<PaginationInfo, 'hasNext' | 'hasPrev'>
  ): ApiSuccessResponse<T[]> {
    const { page, totalPages } = pagination;

    return {
      status: 'success',
      success: true,
      data,
      pagination: {
        ...pagination,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  static error(message: string, errors?: any[]): ApiErrorResponse {
    const response: ApiErrorResponse = {
      status: 'error',
      success: false,
      message
    };

    if (errors !== undefined) {
      response.errors = errors;
    }

    return response;
  }
}
