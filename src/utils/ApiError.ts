export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: any[];

  constructor(statusCode: number, message: string, isOperational: boolean | any[] = true, errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    
    // Handle overloaded constructor
    if (Array.isArray(isOperational)) {
      this.isOperational = true;
      this.errors = isOperational;
    } else {
      this.isOperational = isOperational;
      this.errors = errors;
    }

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string): ApiError {
    return new ApiError(400, message);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Not found'): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message, false);
  }

  static unprocessable(message: string): ApiError {
    return new ApiError(422, message);
  }

  static tooManyRequests(message = 'Too many requests'): ApiError {
    return new ApiError(429, message);
  }
}
