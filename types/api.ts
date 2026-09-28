export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_INPUT"
  | "INSUFFICIENT_CREDITS"
  | "CONFIGURATION_ERROR"
  | "PROVIDER_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiSuccess<TData> {
  ok: true;
  data: TData;
}

export interface ApiFailure {
  ok: false;
  error: ApiError;
}

export type ApiResponse<TData> = ApiSuccess<TData> | ApiFailure;

export function apiSuccess<TData>(data: TData): ApiSuccess<TData> {
  return { ok: true, data };
}

export function apiFailure(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, string[]>
): ApiFailure {
  return { ok: false, error: { code, message, details } };
}

export const HTTP_STATUS_BY_ERROR_CODE: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  INVALID_INPUT: 422,
  INSUFFICIENT_CREDITS: 402,
  CONFIGURATION_ERROR: 500,
  PROVIDER_ERROR: 502,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};
