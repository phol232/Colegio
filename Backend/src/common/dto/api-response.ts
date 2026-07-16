export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiFailResponse {
  success: false;
  message: string;
  errors?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiFailResponse;

export function ok<T>(data: T, message?: string): ApiSuccessResponse<T> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  return response;
}

export function fail(message: string, errors?: unknown): ApiFailResponse {
  const response: ApiFailResponse = {
    success: false,
    message,
  };

  if (errors != null) {
    response.errors = errors;
  }

  return response;
}
