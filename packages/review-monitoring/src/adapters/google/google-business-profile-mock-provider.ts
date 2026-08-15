import type {
  BusinessProfileReviewProvider,
  ListBusinessProfileAccountsInput,
  ListBusinessProfileAccountsResult,
  ListBusinessProfileLocationsInput,
  ListBusinessProfileLocationsResult,
  ListBusinessReviewsInput,
  ListBusinessReviewsResult,
  ProviderAuthorizationCodeInput,
  ProviderAuthorizationUrlInput,
  ProviderTokenSet,
  RefreshProviderAccessTokenInput,
  RevokeProviderAuthorizationInput
} from "../../application/ports/business-profile-review-provider.js";
import { GoogleBusinessProfileProviderError } from "../../application/ports/review-provider-error.js";
import type {
  BusinessProfileAccount,
  BusinessProfileLocation
} from "../../domain/business-profile.js";
import type { BusinessReview } from "../../domain/review.js";
import { GOOGLE_BUSINESS_PROFILE_SCOPE } from "./google-business-profile.constants.js";

export type GoogleBusinessProfileMockScenario =
  | "connected"
  | "token-expired"
  | "refresh-token-invalid"
  | "api-unavailable"
  | "rate-limited"
  | "no-businesses"
  | "location-not-verified";

export type GoogleBusinessProfileMockProviderOptions = {
  authorizationBaseUrl?: string;
  redirectUri?: string;
  scenario?: GoogleBusinessProfileMockScenario;
  pageSize?: number;
  accounts?: BusinessProfileAccount[];
  locations?: BusinessProfileLocation[];
  reviews?: BusinessReview[];
};

const mockAccessToken = "mock-access-token";
const mockRefreshToken = "mock-refresh-token";
const defaultPageSize = 2;

const defaultAccounts: BusinessProfileAccount[] = [
  {
    id: "accounts/1001",
    name: "accounts/1001",
    accountName: "Matriz BRM"
  },
  {
    id: "accounts/1002",
    name: "accounts/1002",
    accountName: "Filial BRM"
  }
];

const defaultLocations: BusinessProfileLocation[] = [
  {
    id: "locations/2001",
    accountId: "accounts/1001",
    name: "Business Review Monitor Centro",
    storeCode: "CENTRO",
    isVerified: true
  },
  {
    id: "locations/2002",
    accountId: "accounts/1001",
    name: "Business Review Monitor Norte",
    storeCode: "NORTE",
    isVerified: true
  },
  {
    id: "locations/2003",
    accountId: "accounts/1002",
    name: "Business Review Monitor Sul",
    storeCode: "SUL",
    isVerified: false
  }
];

const defaultReviews: BusinessReview[] = [
  {
    id: "reviews/3001",
    reviewerName: "Joao",
    starRating: "FIVE",
    comment: "Excelente atendimento.",
    createdAt: new Date("2026-08-01T12:00:00.000Z"),
    updatedAt: new Date("2026-08-01T12:00:00.000Z")
  },
  {
    id: "reviews/3002",
    reviewerName: "Maria",
    starRating: "TWO",
    comment: "Demorou muito.",
    createdAt: new Date("2026-08-02T12:00:00.000Z"),
    updatedAt: new Date("2026-08-02T12:00:00.000Z")
  },
  {
    id: "reviews/3003",
    reviewerName: "Carlos",
    starRating: "FOUR",
    comment: "Boa experiencia.",
    createdAt: new Date("2026-08-03T12:00:00.000Z"),
    updatedAt: new Date("2026-08-03T12:00:00.000Z")
  }
];

export class GoogleBusinessProfileMockProvider
  implements BusinessProfileReviewProvider
{
  private readonly authorizationBaseUrl: string;
  private readonly redirectUri: string;
  private readonly scenario: GoogleBusinessProfileMockScenario;
  private readonly pageSize: number;
  private readonly accounts: BusinessProfileAccount[];
  private readonly locations: BusinessProfileLocation[];
  private readonly reviews: BusinessReview[];

  constructor(options: GoogleBusinessProfileMockProviderOptions = {}) {
    this.authorizationBaseUrl =
      options.authorizationBaseUrl ?? "https://mock.google.local/oauth";
    this.redirectUri =
      options.redirectUri ?? "http://localhost:3333/integrations/google/callback";
    this.scenario = options.scenario ?? "connected";
    this.pageSize = options.pageSize ?? defaultPageSize;
    this.accounts =
      options.scenario === "no-businesses" ? [] : options.accounts ?? defaultAccounts;
    this.locations = options.locations ?? defaultLocations;
    this.reviews = options.reviews ?? defaultReviews;
  }

  buildAuthorizationUrl(input: ProviderAuthorizationUrlInput): string {
    const url = new URL(this.authorizationBaseUrl);

    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", "mock-google-client-id");
    url.searchParams.set("redirect_uri", this.redirectUri);
    url.searchParams.set("scope", GOOGLE_BUSINESS_PROFILE_SCOPE);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", input.state);

    return url.toString();
  }

  async exchangeAuthorizationCode(
    input: ProviderAuthorizationCodeInput
  ): Promise<ProviderTokenSet> {
    if (input.code.length === 0) {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_INVALID_CALLBACK",
        "Invalid Google OAuth callback"
      );
    }

    this.throwScenarioError();

    return this.buildTokenSet({ includeRefreshToken: true });
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

    if (this.scenario === "refresh-token-invalid") {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_TOKEN_REVOKED",
        "Google refresh token was revoked"
      );
    }

    this.throwScenarioError();

    return this.buildTokenSet({ includeRefreshToken: false });
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

    const page = paginate(this.accounts, input.pageToken, this.pageSize);
    const result: ListBusinessProfileAccountsResult = {
      accounts: page.items
    };

    if (page.nextPageToken !== undefined) {
      result.nextPageToken = page.nextPageToken;
    }

    return result;
  }

  async listLocations(
    input: ListBusinessProfileLocationsInput
  ): Promise<ListBusinessProfileLocationsResult> {
    this.assertUsableAccessToken(input.accessToken);

    const accountLocations = this.locations
      .filter((location) => location.accountId === input.accountId)
      .map((location) =>
        this.scenario === "location-not-verified"
          ? { ...location, isVerified: false }
          : location
      );

    const page = paginate(accountLocations, input.pageToken, this.pageSize);
    const result: ListBusinessProfileLocationsResult = {
      locations: page.items
    };

    if (page.nextPageToken !== undefined) {
      result.nextPageToken = page.nextPageToken;
    }

    return result;
  }

  async listReviews(
    input: ListBusinessReviewsInput
  ): Promise<ListBusinessReviewsResult> {
    this.assertUsableAccessToken(input.accessToken);

    const location = this.locations.find(
      (candidate) =>
        candidate.accountId === input.accountId && candidate.id === input.locationId
    );

    if (!location) {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_LOCATION_NOT_FOUND",
        "Google Business Profile location was not found"
      );
    }

    if (this.scenario === "location-not-verified" || location.isVerified === false) {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_LOCATION_NOT_VERIFIED",
        "Google Business Profile location is not verified"
      );
    }

    const page = paginate(this.reviews, input.pageToken, this.pageSize);
    const result: ListBusinessReviewsResult = {
      reviews: page.items,
      totalReviewCount: this.reviews.length
    };

    const averageRating = calculateAverageRating(this.reviews);

    if (averageRating !== undefined) {
      result.averageRating = averageRating;
    }

    if (page.nextPageToken !== undefined) {
      result.nextPageToken = page.nextPageToken;
    }

    return result;
  }

  private buildTokenSet(input: { includeRefreshToken: boolean }): ProviderTokenSet {
    const tokenSet: ProviderTokenSet = {
      accessToken: mockAccessToken,
      expiresInSeconds: 3600,
      scope: GOOGLE_BUSINESS_PROFILE_SCOPE
    };

    if (input.includeRefreshToken) {
      tokenSet.refreshToken = mockRefreshToken;
    }

    return tokenSet;
  }

  private assertUsableAccessToken(accessToken: string): void {
    if (accessToken.length === 0) {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_AUTH_REQUIRED",
        "Google access token is required"
      );
    }

    if (this.scenario === "token-expired") {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_AUTH_REQUIRED",
        "Google access token expired"
      );
    }

    this.throwScenarioError();
  }

  private throwScenarioError(): void {
    if (this.scenario === "api-unavailable") {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_API_UNAVAILABLE",
        "Google Business Profile API is unavailable"
      );
    }

    if (this.scenario === "rate-limited") {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_RATE_LIMITED",
        "Google Business Profile API rate limit reached"
      );
    }
  }
}

function paginate<T>(
  items: T[],
  pageToken: string | undefined,
  pageSize: number
): { items: T[]; nextPageToken?: string } {
  const start = pageToken === undefined ? 0 : Number.parseInt(pageToken, 10);
  const safeStart = Number.isNaN(start) || start < 0 ? 0 : start;
  const page = items.slice(safeStart, safeStart + pageSize);
  const nextStart = safeStart + pageSize;
  const result: { items: T[]; nextPageToken?: string } = {
    items: page
  };

  if (nextStart < items.length) {
    result.nextPageToken = String(nextStart);
  }

  return result;
}

function calculateAverageRating(reviews: BusinessReview[]): number | undefined {
  if (reviews.length === 0) {
    return undefined;
  }

  const total = reviews.reduce(
    (sum, review) => sum + starRatingToNumber(review.starRating),
    0
  );

  return Number((total / reviews.length).toFixed(1));
}

function starRatingToNumber(starRating: BusinessReview["starRating"]): number {
  const values = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5
  } satisfies Record<BusinessReview["starRating"], number>;

  return values[starRating];
}
