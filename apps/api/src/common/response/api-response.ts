/**
 * ApiResponse — equivalent to BaseResult in the prior .NET codebase.
 * All controllers return HTTP 200. Business outcome lives in the body.
 *
 * Codes:
 *   A001 — success
 *   A002 — failure (business rule, validation error)
 *   A401 — invalid credentials
 *   A404 — not found
 *   A409 — conflict (duplicate)
 */

export class ApiResultCode {
  static readonly Success = { code: 'A001', status: 'success' };
  static readonly Failure = { code: 'A002', status: 'failure' };
  static readonly InvalidCredentials = { code: 'A401', status: 'invalid_credentials' };
  static readonly NotFound = { code: 'A404', status: 'not_found' };
  static readonly Conflict = { code: 'A409', status: 'conflict' };
}

export class ApiResponse<T = undefined> {
  code: string;
  status: string;
  message?: string;
  data?: T;

  constructor(result: { code: string; status: string }, message?: string, data?: T) {
    this.code = result.code;
    this.status = result.status;
    this.message = message;
    this.data = data;
  }

  static success<T>(data?: T, message?: string): ApiResponse<T> {
    return new ApiResponse(ApiResultCode.Success, message, data);
  }

  static failure<T = never>(message: string): ApiResponse<T> {
    return new ApiResponse<T>(ApiResultCode.Failure, message);
  }

  static invalidCredentials<T = never>(message = 'Invalid email or password'): ApiResponse<T> {
    return new ApiResponse<T>(ApiResultCode.InvalidCredentials, message);
  }

  static notFound<T = never>(message = 'Not found'): ApiResponse<T> {
    return new ApiResponse<T>(ApiResultCode.NotFound, message);
  }

  static conflict<T = never>(message: string): ApiResponse<T> {
    return new ApiResponse<T>(ApiResultCode.Conflict, message);
  }
}
