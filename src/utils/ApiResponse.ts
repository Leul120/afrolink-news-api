/**
 * Standardised response envelopes — every endpoint returns one of these shapes,
 * exactly as defined in the assessment specification.
 */

export interface ApiResponse<T = unknown> {
  Success: boolean;
  Message: string;
  Object: T | null;
  Errors: string[] | null;
}

export interface PaginatedResponse<T = unknown> {
  Success: boolean;
  Message: string;
  Object: T[];
  PageNumber: number;
  PageSize: number;
  TotalSize: number;
  Errors: null;
}

/** Successful response carrying an optional payload. */
export const ok = <T>(message: string, data: T | null = null): ApiResponse<T> => ({
  Success: true,
  Message: message,
  Object: data,
  Errors: null,
});

/** Failure response. Falls back to the message itself when no detail is given. */
export const fail = (message: string, errors: string[] = []): ApiResponse<null> => ({
  Success: false,
  Message: message,
  Object: null,
  Errors: errors.length > 0 ? errors : [message],
});

/** Successful, paginated list response. */
export const paginated = <T>(
  message: string,
  items: T[],
  pageNumber: number,
  pageSize: number,
  totalSize: number,
): PaginatedResponse<T> => ({
  Success: true,
  Message: message,
  Object: items,
  PageNumber: pageNumber,
  PageSize: pageSize,
  TotalSize: totalSize,
  Errors: null,
});
