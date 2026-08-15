import type {
  BusinessProfileAccount,
  BusinessProfileLocation
} from "../../domain/business-profile.js";
import type { BusinessReview, ReviewSummary } from "../../domain/review.js";

export type ProviderAuthorizationUrlInput = {
  state: string;
};

export type ProviderAuthorizationCodeInput = {
  code: string;
};

export type ProviderTokenSet = {
  accessToken: string;
  expiresInSeconds: number;
  refreshToken?: string;
  scope: string;
};

export type RefreshProviderAccessTokenInput = {
  refreshToken: string;
};

export type RevokeProviderAuthorizationInput = {
  refreshToken: string;
};

export type ListBusinessProfileAccountsInput = {
  accessToken: string;
  pageToken?: string;
};

export type ListBusinessProfileAccountsResult = {
  accounts: BusinessProfileAccount[];
  nextPageToken?: string;
};

export type ListBusinessProfileLocationsInput = {
  accessToken: string;
  accountId: string;
  pageToken?: string;
};

export type ListBusinessProfileLocationsResult = {
  locations: BusinessProfileLocation[];
  nextPageToken?: string;
};

export type ListBusinessReviewsInput = {
  accessToken: string;
  accountId: string;
  locationId: string;
  pageToken?: string;
};

export type ListBusinessReviewsResult = ReviewSummary & {
  reviews: BusinessReview[];
  nextPageToken?: string;
};

export interface BusinessProfileReviewProvider {
  buildAuthorizationUrl(input: ProviderAuthorizationUrlInput): string;
  exchangeAuthorizationCode(
    input: ProviderAuthorizationCodeInput
  ): Promise<ProviderTokenSet>;
  refreshAccessToken(
    input: RefreshProviderAccessTokenInput
  ): Promise<ProviderTokenSet>;
  revokeAuthorization(input: RevokeProviderAuthorizationInput): Promise<void>;
  listAccounts(
    input: ListBusinessProfileAccountsInput
  ): Promise<ListBusinessProfileAccountsResult>;
  listLocations(
    input: ListBusinessProfileLocationsInput
  ): Promise<ListBusinessProfileLocationsResult>;
  listReviews(input: ListBusinessReviewsInput): Promise<ListBusinessReviewsResult>;
}

export type GoogleBusinessProfileProvider = BusinessProfileReviewProvider;
