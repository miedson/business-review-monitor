export const reviewProviderErrorCodes = [
  "GOOGLE_AUTH_REQUIRED",
  "GOOGLE_TOKEN_REVOKED",
  "GOOGLE_REFRESH_FAILED",
  "GOOGLE_ACCOUNT_NOT_FOUND",
  "GOOGLE_LOCATION_NOT_FOUND",
  "GOOGLE_LOCATION_NOT_VERIFIED",
  "GOOGLE_PERMISSION_DENIED",
  "GOOGLE_RATE_LIMITED",
  "GOOGLE_API_UNAVAILABLE",
  "GOOGLE_INVALID_CALLBACK",
  "GOOGLE_INVALID_STATE"
] as const;

export type ReviewProviderErrorCode = (typeof reviewProviderErrorCodes)[number];

export class ReviewProviderError extends Error {
  constructor(
    readonly code: ReviewProviderErrorCode,
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "ReviewProviderError";
  }
}

export const googleBusinessProfileErrorCodes = reviewProviderErrorCodes;
export type GoogleBusinessProfileErrorCode = ReviewProviderErrorCode;
export class GoogleBusinessProfileProviderError extends ReviewProviderError {
  constructor(
    code: GoogleBusinessProfileErrorCode,
    message: string,
    cause?: unknown
  ) {
    super(code, message, cause);
    this.name = "GoogleBusinessProfileProviderError";
  }
}
