/**
 * Operational error with an associated HTTP status code.
 * Thrown anywhere in the app and translated into a standard response by the
 * central error-handling middleware.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors: string[];
  public readonly isOperational = true;

  constructor(statusCode: number, message: string, errors?: string[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors && errors.length > 0 ? errors : [message];
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message = 'Bad request', errors?: string[]): AppError {
    return new AppError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized', errors?: string[]): AppError {
    return new AppError(401, message, errors);
  }

  static forbidden(message = 'Forbidden', errors?: string[]): AppError {
    return new AppError(403, message, errors);
  }

  static notFound(message = 'Resource not found', errors?: string[]): AppError {
    return new AppError(404, message, errors);
  }

  static conflict(message = 'Conflict', errors?: string[]): AppError {
    return new AppError(409, message, errors);
  }
}
