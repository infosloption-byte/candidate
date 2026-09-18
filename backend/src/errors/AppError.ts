export interface AppErrorDetail {
  field?: string;
  code: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details: AppErrorDetail[];

  constructor(
    statusCode: number,
    errorCode: string,
    message: string,
    details: AppErrorDetail[] = [],
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }

  static invalidInput(message: string, details: AppErrorDetail[] = []): AppError {
    return new AppError(400, "INVALID_INPUT", message, details);
  }

  static unauthenticated(message = "Authentication is required."): AppError {
    return new AppError(401, "UNAUTHENTICATED", message);
  }

  static forbidden(message = "You are not allowed to perform this action."): AppError {
    return new AppError(403, "FORBIDDEN", message);
  }

  static notFound(message = "The requested resource was not found."): AppError {
    return new AppError(404, "NOT_FOUND", message);
  }

  static conflict(message: string, details: AppErrorDetail[] = []): AppError {
    return new AppError(409, "CONFLICT", message, details);
  }

  static duplicate(message: string, details: AppErrorDetail[] = []): AppError {
    return new AppError(409, "DUPLICATE_RESOURCE", message, details);
  }

  static invalidState(message: string): AppError {
    return new AppError(409, "INVALID_STATE_TRANSITION", message);
  }

  static csrf(message = "The request could not be verified."): AppError {
    return new AppError(403, "CSRF_FAILED", message);
  }

  static internal(): AppError {
    return new AppError(500, "INTERNAL_SERVER_ERROR", "An unexpected server error occurred.");
  }
}
