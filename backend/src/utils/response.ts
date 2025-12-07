import { Response } from 'express';

// ─────────────────────────────────────────────────────────────────────────────
// Response Types
// ─────────────────────────────────────────────────────────────────────────────

interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
}

type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// ─────────────────────────────────────────────────────────────────────────────
// Response Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a standardized success response.
 *
 * @param res - Express Response object
 * @param data - The data payload to send
 * @param message - Optional success message
 * @param statusCode - HTTP status code (default: 200)
 * @returns The Response object for chaining
 *
 * @example
 * return sendSuccess(res, { user: userData }, 'User created successfully', 201);
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response<SuccessResponse<T>> => {
  const response: SuccessResponse<T> = { success: true, data };

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
};

/**
 * Sends a standardized error response.
 *
 * @param res - Express Response object
 * @param message - Error message for the client
 * @param statusCode - HTTP status code (default: 500)
 * @param code - Optional error code for programmatic handling
 * @returns The Response object for chaining
 *
 * @example
 * return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  code?: string
): Response<ErrorResponse> => {
  const response: ErrorResponse = { success: false, message };

  if (code) {
    response.code = code;
  }

  return res.status(statusCode).json(response);
};

/**
 * Sends a 201 Created response with the created resource.
 */
export const sendCreated = <T>(
  res: Response,
  data: T,
  message?: string
): Response<SuccessResponse<T>> => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Sends a 204 No Content response.
 */
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Sends a 400 Bad Request response.
 */
export const sendBadRequest = (
  res: Response,
  message: string = 'Bad request',
  code?: string
): Response<ErrorResponse> => {
  return sendError(res, message, 400, code);
};

/**
 * Sends a 401 Unauthorized response.
 */
export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized'
): Response<ErrorResponse> => {
  return sendError(res, message, 401, 'UNAUTHORIZED');
};

/**
 * Sends a 404 Not Found response.
 */
export const sendNotFound = (
  res: Response,
  message: string = 'Resource not found'
): Response<ErrorResponse> => {
  return sendError(res, message, 404, 'NOT_FOUND');
};

export type { ApiResponse, SuccessResponse, ErrorResponse };