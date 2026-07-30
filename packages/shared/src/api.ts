/**
 * The HTTP envelope every VeriPay endpoint uses.
 *
 * A single discriminated shape means the browser client can branch on `ok`
 * once and never guess at a response body.
 */

import { type ErrorCode } from './errors.js';

export interface ApiSuccess<T> {
  readonly ok: true;
  readonly data: T;
}

export interface ApiErrorBody {
  readonly code: ErrorCode;
  readonly message: string;
  /** Correlates the failure with the API's structured logs. */
  readonly requestId: string;
  readonly details?: unknown;
}

export interface ApiFailure {
  readonly ok: false;
  readonly error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function apiSuccess<T>(data: T): ApiSuccess<T> {
  return { ok: true, data };
}

export function apiFailure(error: ApiErrorBody): ApiFailure {
  return { ok: false, error };
}
