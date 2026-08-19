import type {
  ListBusinessProfileAccountsInput,
  InstagramReviewProvider,
  ListBusinessProfileAccountsResult,
  ListBusinessProfileLocationsResult,
  ListBusinessReviewsResult,
  ProviderAuthorizationCodeInput,
  ProviderAuthorizationUrlInput,
  ProviderTokenSet,
  RefreshProviderAccessTokenInput,
  RevokeProviderAuthorizationInput
} from "../../application/ports/business-profile-review-provider.js";
import { GoogleBusinessProfileProviderError } from "../../application/ports/review-provider-error.js";
import { INSTAGRAM_SCOPE_STRING } from "./instagram.constants.js";

const instagramAuthorizationEndpoint = "https://api.instagram.com/oauth/authorize";
const instagramTokenEndpoint = "https://api.instagram.com/oauth/access_token";
const instagramGraphApiBase = "https://graph.instagram.com";
const instagramRevokeEndpoint = "https://api.instagram.com/oauth/revoke";

type FetchFunction = typeof fetch;

type Logger = {
  info: (meta: Record<string, unknown>, msg?: string) => void;
  warn: (meta: Record<string, unknown>, msg?: string) => void;
  error: (meta: Record<string, unknown>, msg?: string) => void;
};

export type InstagramApiProviderOptions = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  graphApiVersion: string;
  fetchFn?: FetchFunction;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  graphApiBase?: string;
  revokeEndpoint?: string;
  logger?: Logger;
};

type InstagramTokenResponse = {
  access_token: string;
  user_id?: string | number | undefined;
  permissions?: string[] | undefined;
};

type LongLivedTokenResponse = {
  access_token: string;
  token_type?: string | undefined;
  expires_in: number;
};

type InstagramUserProfile = {
  id: string;
  username: string;
  account_type: string;
  media_count?: number;
};

export class InstagramApiProvider implements InstagramReviewProvider {
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly redirectUri: string;
  private readonly graphApiVersion: string;
  private readonly fetchFn: FetchFunction;
  private readonly authorizationEndpoint: string;
  private readonly tokenEndpoint: string;
  private readonly graphApiBase: string;
  private readonly revokeEndpoint: string;
  private readonly logger: Logger;

  constructor(options: InstagramApiProviderOptions) {
    this.appId = options.appId;
    this.appSecret = options.appSecret;
    this.redirectUri = options.redirectUri;
    this.graphApiVersion = options.graphApiVersion;
    this.fetchFn = options.fetchFn ?? fetch;
    this.authorizationEndpoint =
      options.authorizationEndpoint ?? instagramAuthorizationEndpoint;
    this.tokenEndpoint = options.tokenEndpoint ?? instagramTokenEndpoint;
    const base = options.graphApiBase ?? instagramGraphApiBase;
    this.graphApiBase = `${base}/${options.graphApiVersion}`;
    this.revokeEndpoint = options.revokeEndpoint ?? instagramRevokeEndpoint;
    this.logger = options.logger ?? console;
  }

  buildAuthorizationUrl(input: ProviderAuthorizationUrlInput): string {
    const url = new URL(this.authorizationEndpoint);

    url.searchParams.set("client_id", this.appId);
    url.searchParams.set("redirect_uri", this.redirectUri);
    url.searchParams.set("scope", INSTAGRAM_SCOPE_STRING);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", input.state);

    return url.toString();
  }

  async exchangeAuthorizationCode(
    input: ProviderAuthorizationCodeInput
  ): Promise<ProviderTokenSet> {
    if (input.code.length === 0) {
      throw new GoogleBusinessProfileProviderError(
        "INSTAGRAM_INVALID_CALLBACK",
        "Instagram OAuth authorization code is required"
      );
    }

    this.logger.info({
      provider: "instagram",
      operation: "authorization_code_exchange_started"
    });

    const shortLivedToken = await this.requestShortLivedToken(input.code);

    this.logger.info({
      provider: "instagram",
      operation: "short_lived_token_received"
    });

    const longLivedToken = await this.exchangeForLongLivedToken(shortLivedToken.access_token);

    this.logger.info({
      provider: "instagram",
      operation: "long_lived_token_exchange_completed"
    });

    return {
      accessToken: longLivedToken.access_token,
      expiresInSeconds: longLivedToken.expires_in,
      refreshToken: undefined,
      scope: INSTAGRAM_SCOPE_STRING
    } as ProviderTokenSet;
  }

  async refreshAccessToken(
    input: RefreshProviderAccessTokenInput
  ): Promise<ProviderTokenSet> {
    const longLivedToken = await this.exchangeForLongLivedToken(input.refreshToken);

    return {
      accessToken: longLivedToken.access_token,
      expiresInSeconds: longLivedToken.expires_in,
      refreshToken: input.refreshToken,
      scope: INSTAGRAM_SCOPE_STRING
    };
  }

  async revokeAuthorization(
    input: RevokeProviderAuthorizationInput
  ): Promise<void> {
    if (input.refreshToken.length === 0) {
      return;
    }

    const response = await this.fetchFn(this.revokeEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: this.appId,
        client_secret: this.appSecret,
        token: input.refreshToken
      })
    });

    if (!response.ok) {
      throw new GoogleBusinessProfileProviderError(
        "INSTAGRAM_REFRESH_FAILED",
        "Instagram authorization revocation failed"
      );
    }
  }

  async listAccounts(
    input: ListBusinessProfileAccountsInput
  ): Promise<ListBusinessProfileAccountsResult> {
    const profile = await this.getUserProfile(input.accessToken);

    return {
      accounts: [
        {
          id: profile.id,
          name: profile.username,
          username: profile.username,
          accountName: profile.username
        }
      ]
    };
  }

  async listLocations(): Promise<ListBusinessProfileLocationsResult> {
    return {
      locations: []
    };
  }

  async listReviews(): Promise<ListBusinessReviewsResult> {
    return {
      reviews: [],
      averageRating: 0,
      totalReviewCount: 0
    };
  }

  async getUserProfile(accessToken: string): Promise<InstagramUserProfile> {
    this.logger.info({
      provider: "instagram",
      operation: "user_profile_fetch_started"
    });

    const url = new URL(`${this.graphApiBase}/me`);
    url.searchParams.set("fields", "id,username,account_type,media_count");
    url.searchParams.set("access_token", accessToken);

    const response = await this.fetchFn(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const payload = await readJson(response);
      this.logger.error({
        provider: "instagram",
        operation: "user_profile_fetch_failed",
        httpStatus: response.status,
        metaErrorType: payload && typeof payload === "object" && "error_type" in payload ? (payload as Record<string, unknown>).error_type : undefined,
        metaErrorCode: payload && typeof payload === "object" && "error_code" in payload ? (payload as Record<string, unknown>).error_code : undefined,
        metaErrorMessage: payload && typeof payload === "object" && "error_message" in payload ? (payload as Record<string, unknown>).error_message : undefined
      });
      throw new GoogleBusinessProfileProviderError(
        mapInstagramApiErrorStatus(response.status),
        "Instagram Graph API request failed"
      );
    }

    const payload = (await response.json()) as InstagramUserProfile;

    this.logger.info({
      provider: "instagram",
      operation: "user_profile_fetch_completed",
      instagramUserId: payload.id,
      username: payload.username,
      accountType: payload.account_type
    });

    return payload;
  }

  private async requestShortLivedToken(code: string): Promise<InstagramTokenResponse> {
    this.logger.info({
      provider: "instagram",
      operation: "short_lived_token_request_started"
    });

    const response = await this.fetchFn(this.tokenEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: this.appId,
        client_secret: this.appSecret,
        grant_type: "authorization_code",
        redirect_uri: this.redirectUri,
        code
      })
    });

    const payload = await readJson(response);

    this.logger.info({
      provider: "instagram",
      operation: "short_lived_token_response_shape",
      status: response.status,
      contentType: response.headers.get("content-type") ?? undefined,
      keys: isObject(payload) ? Object.keys(payload) : [],
      hasAccessToken: isObject(payload) && "access_token" in payload,
      hasUserId: isObject(payload) && "user_id" in payload,
      hasTokenType: isObject(payload) && "token_type" in payload,
      hasExpiresIn: isObject(payload) && "expires_in" in payload,
      hasPermissions: isObject(payload) && "permissions" in payload,
      userIdType: isObject(payload) ? typeof payload.user_id : undefined,
      ...(isObject(payload) && "error" in payload ? { metaError: sanitizeMetaError(payload.error) } : {})
    });

    if (!response.ok) {
      this.logger.error({
        provider: "instagram",
        operation: "short_lived_token_request_failed",
        httpStatus: response.status,
        metaError: isObject(payload) && "error" in payload ? sanitizeMetaError(payload.error) : undefined,
        metaErrorType: payload && typeof payload === "object" && "error_type" in payload ? (payload as Record<string, unknown>).error_type : undefined,
        metaErrorCode: payload && typeof payload === "object" && "error_code" in payload ? (payload as Record<string, unknown>).error_code : undefined,
        metaErrorMessage: payload && typeof payload === "object" && "error_message" in payload ? (payload as Record<string, unknown>).error_message : undefined
      });
      throw mapTokenError(payload);
    }

    this.logger.info({
      provider: "instagram",
      operation: "short_lived_token_request_completed"
    });

    return normalizeShortLivedTokenResponse(payload);
  }

  private async exchangeForLongLivedToken(
    shortLivedToken: string
  ): Promise<LongLivedTokenResponse> {
    this.logger.info({
      provider: "instagram",
      operation: "long_lived_token_exchange_started"
    });

    const url = new URL(`${this.graphApiBase}/access_token`);
    url.searchParams.set("grant_type", "ig_exchange_token");
    url.searchParams.set("client_secret", this.appSecret);
    url.searchParams.set("access_token", shortLivedToken);

    const response = await this.fetchFn(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    const payload = await readJson(response);

    this.logger.info({
      provider: "instagram",
      operation: "long_lived_token_response_shape",
      status: response.status,
      contentType: response.headers.get("content-type") ?? undefined,
      keys: isObject(payload) ? Object.keys(payload) : [],
      hasAccessToken: isObject(payload) && "access_token" in payload,
      hasTokenType: isObject(payload) && "token_type" in payload,
      hasExpiresIn: isObject(payload) && "expires_in" in payload,
      expiresInType: isObject(payload) ? typeof payload.expires_in : undefined,
      ...(isObject(payload) && "error" in payload ? { metaError: sanitizeMetaError(payload.error) } : {})
    });

    if (!response.ok) {
      this.logger.error({
        provider: "instagram",
        operation: "long_lived_token_exchange_failed",
        httpStatus: response.status,
        metaError: isObject(payload) && "error" in payload ? sanitizeMetaError(payload.error) : undefined,
        metaErrorType: payload && typeof payload === "object" && "error_type" in payload ? (payload as Record<string, unknown>).error_type : undefined,
        metaErrorCode: payload && typeof payload === "object" && "error_code" in payload ? (payload as Record<string, unknown>).error_code : undefined,
        metaErrorMessage: payload && typeof payload === "object" && "error_message" in payload ? (payload as Record<string, unknown>).error_message : undefined
      });
      throw mapTokenError(payload);
    }

    this.logger.info({
      provider: "instagram",
      operation: "long_lived_token_exchange_completed"
    });

    return normalizeLongLivedTokenResponse(payload);
  }
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

function sanitizeMetaError(error: unknown): Record<string, unknown> | undefined {
  if (!isObject(error)) return undefined;
  return {
    type: error.type,
    code: error.code,
    error_subcode: error.error_subcode,
    message: error.message
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function normalizeShortLivedTokenResponse(payload: unknown): InstagramTokenResponse {
  if (!isInstagramTokenResponse(payload)) {
    throw new GoogleBusinessProfileProviderError(
      "INSTAGRAM_TOKEN_EXCHANGE_FAILED",
      "Instagram OAuth token response is invalid"
    );
  }

  return {
    access_token: payload.access_token,
    user_id: payload.user_id,
    permissions: payload.permissions
  };
}

function normalizeLongLivedTokenResponse(payload: unknown): LongLivedTokenResponse {
  if (!isLongLivedTokenResponse(payload)) {
    throw new GoogleBusinessProfileProviderError(
      "INSTAGRAM_TOKEN_EXCHANGE_FAILED",
      "Instagram long-lived token response is invalid"
    );
  }

  return {
    access_token: payload.access_token,
    token_type: payload.token_type,
    expires_in: payload.expires_in
  };
}

function isInstagramTokenResponse(payload: unknown): payload is InstagramTokenResponse {
  if (!isObject(payload)) {
    return false;
  }

  return (
    typeof payload.access_token === "string" &&
    payload.access_token.length > 0 &&
    (payload.user_id === undefined ||
      typeof payload.user_id === "string" ||
      typeof payload.user_id === "number") &&
    (payload.permissions === undefined || Array.isArray(payload.permissions))
  );
}

function isLongLivedTokenResponse(payload: unknown): payload is LongLivedTokenResponse {
  if (!isObject(payload)) {
    return false;
  }

  return (
    typeof payload.access_token === "string" &&
    payload.access_token.length > 0 &&
    (payload.token_type === undefined || typeof payload.token_type === "string") &&
    typeof payload.expires_in === "number" &&
    Number.isFinite(payload.expires_in)
  );
}

function mapTokenError(payload: unknown): GoogleBusinessProfileProviderError {
  const errorCode = readErrorCode(payload);

  if (errorCode === "invalid_grant" || errorCode === "OAuthException") {
    return new GoogleBusinessProfileProviderError(
      "INSTAGRAM_TOKEN_REVOKED",
      "Instagram authorization expired or was revoked"
    );
  }

  if (errorCode === "access_denied") {
    return new GoogleBusinessProfileProviderError(
      "INSTAGRAM_PERMISSION_DENIED",
      "Instagram authorization was denied"
    );
  }

  return new GoogleBusinessProfileProviderError(
    "INSTAGRAM_TOKEN_EXCHANGE_FAILED",
    "Instagram OAuth token request failed"
  );
}

function readErrorCode(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const candidate = payload as Record<string, unknown>;

  if (typeof candidate.error_code === "number") {
    return String(candidate.error_code);
  }

  if (typeof candidate.error_type === "string") {
    return candidate.error_type;
  }

  if (typeof candidate.error === "string") {
    return candidate.error;
  }

  return undefined;
}

function mapInstagramApiErrorStatus(
  status: number
): "INSTAGRAM_PERMISSION_DENIED" | "INSTAGRAM_RATE_LIMITED" | "INSTAGRAM_API_UNAVAILABLE" {
  if (status === 401 || status === 403) {
    return "INSTAGRAM_PERMISSION_DENIED";
  }

  if (status === 429) {
    return "INSTAGRAM_RATE_LIMITED";
  }

  return "INSTAGRAM_API_UNAVAILABLE";
}