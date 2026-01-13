export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: any[];
  public readonly code?: string;

  constructor(statusCode: number, message: string, isOperational: boolean | any[] = true, errors?: any[], code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;

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

  static badRequest(message: string, errors?: any[]): ApiError {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden', code?: string): ApiError {
    return new ApiError(403, message, true, undefined, code);
  }

  static notFound(message = 'Not found', code?: string): ApiError {
    return new ApiError(404, message, true, undefined, code);
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
