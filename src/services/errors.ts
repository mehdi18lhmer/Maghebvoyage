/**
 * Typed service errors.
 *
 * Services throw these instead of returning ad-hoc shapes so every route can
 * map a failure to the right HTTP status in one place, and so a business rule
 * violation (422) is never confused with a missing row (404) or an
 * authorisation failure (403) — which is how data-isolation bugs get masked.
 */

export type ServiceErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UPSTREAM";

const STATUS: Record<ServiceErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  UPSTREAM: 502,
};

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly status: number;
  /** Field-level messages, for forms. */
  readonly details?: Record<string, string>;

  constructor(
    code: ServiceErrorCode,
    message: string,
    details?: Record<string, string>
  ) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }
}

export const forbidden = (m = "Accès refusé.") => new ServiceError("FORBIDDEN", m);
export const notFound = (m = "Ressource introuvable.") => new ServiceError("NOT_FOUND", m);
export const invalid = (m: string, details?: Record<string, string>) =>
  new ServiceError("VALIDATION", m, details);
export const conflict = (m: string) => new ServiceError("CONFLICT", m);
