import type {
  InstagramReviewProvider,
  InstagramUserProfile,
  ListBusinessProfileAccountsInput,
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

export type InstagramApiMockScenario =
  | "connected"
  | "token-expired"
  | "refresh-token-invalid"
  | "api-unavailable"
  | "rate-limited"
  | "permission-denied"
  | "no-professional-account";

export type InstagramApiMockProviderOptions = {
  authorizationBaseUrl?: string;
  redirectUri?: string;
  scenario?: InstagramApiMockScenario;
};

const mockLongLivedToken = "mock-long-lived-token";
const mockUserId = "mock-user-id";
const mockUsername = "mock_username";
const mockAccountType = "BUSINESS";

export class InstagramApiMockProvider implements InstagramReviewProvider {
  private readonly authorizationBaseUrl: string;
  private readonly redirectUri: string;
  private readonly scenario: InstagramApiMockScenario;

  constructor(options: InstagramApiMockProviderOptions = {}) {
    this.authorizationBaseUrl =
      options.authorizationBaseUrl ?? "https://mock.instagram.local/oauth";
    this.redirectUri =
      options.redirectUri ?? "http://localhost:3333/integrations/instagram/callback";
    this.scenario = options.scenario ?? "connected";
  }

  async replyToComment(): Promise<{ id: string }> {
    this.throwScenarioError();
    return { id: `mock-reply-${Date.now()}` };
  }
  async getExternalUserProfile(_accessToken: string, userId: string): Promise<InstagramUserProfile> { return { id: userId, username: `user_${userId}`, account_type: "" }; }
  async getMediaMetadata(_accessToken: string, mediaId: string): Promise<import("../../application/ports/business-profile-review-provider.js").InstagramMediaMetadata> { return { id: mediaId, media_type: "IMAGE", media_product_type: "FEED" }; }

  buildAuthorizationUrl(input: ProviderAuthorizationUrlInput): string {
    const url = new URL(this.authorizationBaseUrl);

    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", "mock-instagram-app-id");
    url.searchParams.set("redirect_uri", this.redirectUri);
    url.searchParams.set("scope", INSTAGRAM_SCOPE_STRING);
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

    this.throwScenarioError();

    return {
      accessToken: mockLongLivedToken,
      expiresInSeconds: 5184000,
      refreshToken: undefined,
      scope: INSTAGRAM_SCOPE_STRING
    };
  }

  async refreshAccessToken(
    input: RefreshProviderAccessTokenInput
  ): Promise<ProviderTokenSet> {
    if (input.refreshToken.length === 0) {
      throw new GoogleBusinessProfileProviderError(
        "INSTAGRAM_REFRESH_FAILED",
        "Instagram refresh token is required"
      );
    }

    if (this.scenario === "refresh-token-invalid") {
      throw new GoogleBusinessProfileProviderError(
        "INSTAGRAM_TOKEN_REVOKED",
        "Instagram authorization was revoked"
      );
    }

    this.throwScenarioError();

    return {
      accessToken: mockLongLivedToken,
      expiresInSeconds: 5184000,
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
  }

  async listAccounts(
    input: ListBusinessProfileAccountsInput
  ): Promise<ListBusinessProfileAccountsResult> {
    this.assertUsableAccessToken(input.accessToken);

    return {
      accounts: [
        {
          id: mockUserId,
          name: mockUsername,
          username: mockUsername,
          accountName: mockUsername
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
    this.assertUsableAccessToken(accessToken);

    return {
      id: mockUserId,
      username: mockUsername,
      account_type: mockAccountType
    };
  }

  async resolveWebhookAccountId(
    input: { webhookAccountId: string; accessToken: string }
  ): Promise<{ id: string; username?: string; accountType?: string }> {
    this.assertUsableAccessToken(input.accessToken);

    return {
      id: mockUserId,
      username: mockUsername,
      accountType: mockAccountType
    };
  }

  private assertUsableAccessToken(accessToken: string): void {
    if (accessToken.length === 0) {
      throw new GoogleBusinessProfileProviderError(
        "INSTAGRAM_AUTH_REQUIRED",
        "Instagram access token is required"
      );
    }

    if (this.scenario === "token-expired") {
      throw new GoogleBusinessProfileProviderError(
        "INSTAGRAM_AUTH_REQUIRED",
        "Instagram access token expired"
      );
    }

    this.throwScenarioError();
  }

  private throwScenarioError(): void {
    if (this.scenario === "api-unavailable") {
      throw new GoogleBusinessProfileProviderError(
        "INSTAGRAM_API_UNAVAILABLE",
        "Instagram Graph API is unavailable"
      );
    }

    if (this.scenario === "rate-limited") {
      throw new GoogleBusinessProfileProviderError(
        "INSTAGRAM_RATE_LIMITED",
        "Instagram Graph API rate limit reached"
      );
    }

    if (this.scenario === "permission-denied") {
      throw new GoogleBusinessProfileProviderError(
        "INSTAGRAM_PERMISSION_DENIED",
        "Instagram permission denied"
      );
    }
  }
}
