import type {
  ListBusinessProfileAccountsInput,
  BusinessProfileReviewProvider,
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
import { GOOGLE_BUSINESS_PROFILE_SCOPE } from "./google-business-profile.constants.js";

const googleAuthorizationEndpoint =
  "https://accounts.google.com/o/oauth2/v2/auth";
const googleTokenEndpoint = "https://oauth2.googleapis.com/token";
const googleRevokeEndpoint = "https://oauth2.googleapis.com/revoke";

type FetchFunction = typeof fetch;

export type GoogleBusinessProfileApiProviderOptions = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  fetchFn?: FetchFunction;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  revokeEndpoint?: string;
};

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
};

type GoogleAccountResource = {
  name: string;
  accountName?: string;
};

type GoogleAccountsListResponse = {
  accounts?: GoogleAccountResource[];
  nextPageToken?: string;
};

type GoogleLocationResource = {
  name?: string;
  title?: string;
  storeCode?: string;
  metadata?: {
    hasVoiceOfMerchant?: boolean;
  };
};

type GoogleLocationsListResponse = {
  locations?: GoogleLocationResource[];
  nextPageToken?: string;
};

import type { ListBusinessProfileLocationsInput } from "../../application/ports/business-profile-review-provider.js";

type GoogleReviewStarRating =
  | "ONE"
  | "TWO"
  | "THREE"
  | "FOUR"
  | "FIVE"
  | "STAR_RATING_UNSPECIFIED";

type GoogleReviewResource = {
  reviewId?: string;
  reviewer?: {
    displayName?: string;
  };
  starRating?: GoogleReviewStarRating;
  comment?: string;
  createTime?: string;
  updateTime?: string;
};

type GoogleReviewsListResponse = {
  reviews?: GoogleReviewResource[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
};

import type { ListBusinessReviewsInput } from "../../application/ports/business-profile-review-provider.js";

export class GoogleBusinessProfileApiProvider
  implements BusinessProfileReviewProvider
{
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly fetchFn: FetchFunction;
  private readonly authorizationEndpoint: string;
  private readonly tokenEndpoint: string;
  private readonly revokeEndpoint: string;

  constructor(options: GoogleBusinessProfileApiProviderOptions) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.redirectUri = options.redirectUri;
    this.fetchFn = options.fetchFn ?? fetch;
    this.authorizationEndpoint =
      options.authorizationEndpoint ?? googleAuthorizationEndpoint;
    this.tokenEndpoint = options.tokenEndpoint ?? googleTokenEndpoint;
    this.revokeEndpoint = options.revokeEndpoint ?? googleRevokeEndpoint;
  }

  buildAuthorizationUrl(input: ProviderAuthorizationUrlInput): string {
    const url = new URL(this.authorizationEndpoint);

    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", this.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", GOOGLE_BUSINESS_PROFILE_SCOPE);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("state", input.state);

    return url.toString();
  }

  async exchangeAuthorizationCode(
    input: ProviderAuthorizationCodeInput
  ): Promise<ProviderTokenSet> {
    if (input.code.length === 0) {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_INVALID_CALLBACK",
        "Google OAuth authorization code is required"
      );
    }

    return this.requestToken({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: this.redirectUri
    });
  }

  async refreshAccessToken(
    input: RefreshProviderAccessTokenInput
  ): Promise<ProviderTokenSet> {
    if (input.refreshToken.length === 0) {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_REFRESH_FAILED",
        "Google refresh token is required"
      );
    }

    return this.requestToken({
      grant_type: "refresh_token",
      refresh_token: input.refreshToken
    });
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
        token: input.refreshToken
      })
    });

    if (!response.ok) {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_REFRESH_FAILED",
        "Google authorization revocation failed"
      );
    }
  }

  async listAccounts(
    input: ListBusinessProfileAccountsInput
  ): Promise<ListBusinessProfileAccountsResult> {
    const url = new URL(
      "/v1/accounts",
      "https://mybusinessaccountmanagement.googleapis.com"
    );

    if (input.pageToken) {
      url.searchParams.set("pageToken", input.pageToken);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new GoogleBusinessProfileProviderError(
        mapGoogleApiErrorStatus(response.status),
        "Google Business Profile Account Management API request failed"
      );
    }

    const payload = (await response.json()) as GoogleAccountsListResponse;

    return {
      accounts: (payload.accounts ?? []).map((account) => ({
        id: account.name,
        name: account.name,
        ...(account.accountName ? { accountName: account.accountName } : {})
      })),
      ...(payload.nextPageToken ? { nextPageToken: payload.nextPageToken } : {})
    };
  }

  async listLocations(
    input: ListBusinessProfileLocationsInput
  ): Promise<ListBusinessProfileLocationsResult> {
    const parent = input.accountId;
    const url = new URL(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${parent}/locations`
    );
    url.searchParams.set("readMask", "name,title,storeCode,metadata");

    if (input.pageToken) {
      url.searchParams.set("pageToken", input.pageToken);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new GoogleBusinessProfileProviderError(
        mapGoogleApiErrorStatus(response.status),
        "Google Business Profile API request failed."
      );
    }

    const payload = (await response.json()) as GoogleLocationsListResponse;

    const result: ListBusinessProfileLocationsResult = {
      locations: (payload.locations ?? []).map((location) => ({
        id: location.name ?? "",
        accountId: parent,
        name: location.title ?? location.name ?? "Unnamed location",
        ...(location.storeCode ? { storeCode: location.storeCode } : {}),
        ...(location.metadata?.hasVoiceOfMerchant === undefined
          ? {}
          : { isVerified: location.metadata.hasVoiceOfMerchant })
      }))
    };

    if (payload.nextPageToken) {
      result.nextPageToken = payload.nextPageToken;
    }

    return result;
  }

  async listReviews(
    input: ListBusinessReviewsInput
  ): Promise<ListBusinessReviewsResult> {
    const parent = `${input.accountId.replace(/\/$/, "")}/${input.locationId.replace(/^\//, "")}`;
    const url = new URL(`https://mybusiness.googleapis.com/v4/${parent}/reviews`);
    url.searchParams.set("pageSize", "50");

    if (input.pageToken) {
      url.searchParams.set("pageToken", input.pageToken);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new GoogleBusinessProfileProviderError(
        mapGoogleApiErrorStatus(response.status),
        "Google Business Profile reviews request failed."
      );
    }

    const payload = (await response.json()) as GoogleReviewsListResponse;
    const result: ListBusinessReviewsResult = {
      reviews: (payload.reviews ?? []).map((review) => ({
        id: review.reviewId ?? "",
        starRating: mapGoogleReviewStarRating(review.starRating),
        ...(review.reviewer?.displayName
          ? { reviewerName: review.reviewer.displayName }
          : {}),
        ...(review.comment ? { comment: review.comment } : {}),
        createdAt: review.createTime ? new Date(review.createTime) : new Date(0),
        updatedAt: review.updateTime ? new Date(review.updateTime) : new Date(0)
      })),
      averageRating: payload.averageRating ?? 0,
      totalReviewCount: payload.totalReviewCount ?? 0
    };

    if (payload.nextPageToken) {
      result.nextPageToken = payload.nextPageToken;
    }

    return result;
  }

  private async requestToken(
    input: Record<string, string>
  ): Promise<ProviderTokenSet> {
    const response = await this.fetchFn(this.tokenEndpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        ...input
      })
    });

    const payload = await readJson(response);

    if (!response.ok) {
      throw mapTokenError(payload);
    }

    return normalizeTokenResponse(payload);
  }
}

function mapGoogleReviewStarRating(
  starRating: GoogleReviewStarRating | undefined
): "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE" {
  if (
    starRating === "ONE" ||
    starRating === "TWO" ||
    starRating === "THREE" ||
    starRating === "FOUR" ||
    starRating === "FIVE"
  ) {
    return starRating;
  }

  return "ONE";
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function normalizeTokenResponse(payload: unknown): ProviderTokenSet {
  if (!isGoogleTokenResponse(payload)) {
    throw new GoogleBusinessProfileProviderError(
      "GOOGLE_REFRESH_FAILED",
      "Google OAuth token response is invalid"
    );
  }

  const tokenSet: ProviderTokenSet = {
    accessToken: payload.access_token,
    expiresInSeconds: payload.expires_in,
    scope: payload.scope ?? GOOGLE_BUSINESS_PROFILE_SCOPE
  };

  if (payload.refresh_token !== undefined) {
    tokenSet.refreshToken = payload.refresh_token;
  }

  return tokenSet;
}

function isGoogleTokenResponse(payload: unknown): payload is GoogleTokenResponse {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as Record<string, unknown>;

  return (
    typeof candidate.access_token === "string" &&
    candidate.access_token.length > 0 &&
    typeof candidate.expires_in === "number" &&
    Number.isFinite(candidate.expires_in) &&
    (candidate.refresh_token === undefined ||
      typeof candidate.refresh_token === "string") &&
    (candidate.scope === undefined || typeof candidate.scope === "string")
  );
}

function mapTokenError(payload: unknown): GoogleBusinessProfileProviderError {
  const errorCode = readGoogleErrorCode(payload);

  if (errorCode === "invalid_grant") {
    return new GoogleBusinessProfileProviderError(
      "GOOGLE_TOKEN_REVOKED",
      "Google authorization expired or was revoked"
    );
  }

  if (errorCode === "access_denied") {
    return new GoogleBusinessProfileProviderError(
      "GOOGLE_PERMISSION_DENIED",
      "Google authorization was denied"
    );
  }

  return new GoogleBusinessProfileProviderError(
    "GOOGLE_REFRESH_FAILED",
    "Google OAuth token request failed"
  );
}

function readGoogleErrorCode(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const candidate = payload as Record<string, unknown>;

  return typeof candidate.error === "string" ? candidate.error : undefined;
}

function mapGoogleApiErrorStatus(
  status: number
): "GOOGLE_PERMISSION_DENIED" | "GOOGLE_RATE_LIMITED" | "GOOGLE_API_UNAVAILABLE" {
  if (status === 401 || status === 403) {
    return "GOOGLE_PERMISSION_DENIED";
  }

  if (status === 429) {
    return "GOOGLE_RATE_LIMITED";
  }

  return "GOOGLE_API_UNAVAILABLE";
}
