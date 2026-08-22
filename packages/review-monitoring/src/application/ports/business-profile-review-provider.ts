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
  refreshToken?: string | undefined;
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

export type ReplyToGoogleReviewInput = {
  accessToken: string;
  accountId: string;
  locationId: string;
  reviewId: string;
  message: string;
};

export type InstagramUserProfile = {
  id: string;
  username: string;
  account_type: string;
  name?: string;
  profile_pic?: string;
};
export type InstagramMediaMetadata = { id: string; media_type?: string; media_product_type?: string; media_url?: string; thumbnail_url?: string; permalink?: string; caption?: string; timestamp?: Date };

export type ResolveWebhookAccountIdInput = {
  webhookAccountId: string;
  accessToken: string;
};

export type ResolveWebhookAccountIdResult = {
  id: string;
  username?: string;
  accountType?: string;
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
  replyToReview?(input: ReplyToGoogleReviewInput): Promise<void>;
}

export interface InstagramReviewProvider extends BusinessProfileReviewProvider {
  replyToComment?(input: { accessToken: string; commentId: string; message: string }): Promise<{ id: string }>;
  getUserProfile(accessToken: string): Promise<InstagramUserProfile>;
  getExternalUserProfile?(accessToken: string, userId: string): Promise<InstagramUserProfile>;
  getMediaMetadata?(accessToken: string, mediaId: string): Promise<InstagramMediaMetadata>;
  resolveWebhookAccountId(
    input: ResolveWebhookAccountIdInput
  ): Promise<ResolveWebhookAccountIdResult>;
}

export type GoogleBusinessProfileProvider = BusinessProfileReviewProvider;
