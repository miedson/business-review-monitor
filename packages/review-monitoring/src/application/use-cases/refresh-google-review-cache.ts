import type {
  BusinessProfileReviewProvider,
  ListBusinessReviewsResult
} from "../ports/business-profile-review-provider.js";
import type { BusinessLocationRepository } from "../ports/business-location-repository.js";
import type { GoogleConnectionRepository } from "../ports/google-connection-repository.js";
import type { ReviewCacheRepository } from "../ports/review-cache-repository.js";
import { GoogleBusinessProfileProviderError } from "../ports/review-provider-error.js";
import type { TokenCipher } from "../ports/token-cipher.js";

const reviewCacheTtlDays = 7;
const millisecondsPerDay = 24 * 60 * 60 * 1000;

export type RefreshGoogleReviewCacheInput = {
  tenantId: string;
  accountId: string;
  locationId: string;
  pageToken?: string;
};

export type RefreshGoogleReviewCacheDependencies = {
  businessLocationRepository: BusinessLocationRepository;
  googleConnectionRepository: GoogleConnectionRepository;
  provider: BusinessProfileReviewProvider;
  reviewCacheRepository: ReviewCacheRepository;
  tokenCipher: TokenCipher;
};

export class RefreshGoogleReviewCache {
  constructor(
    private readonly dependencies: RefreshGoogleReviewCacheDependencies
  ) {}

  async execute(
    input: RefreshGoogleReviewCacheInput
  ): Promise<ListBusinessReviewsResult> {
    const businessLocation =
      await this.dependencies.businessLocationRepository.findByGoogleIds({
        tenantId: input.tenantId,
        googleAccountId: input.accountId,
        googleLocationId: input.locationId
      });

    if (!businessLocation || !businessLocation.isActive) {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_LOCATION_NOT_FOUND",
        "Business location is not available for this tenant."
      );
    }

    const connection =
      await this.dependencies.googleConnectionRepository.findByTenantId(
        input.tenantId
      );

    if (
      !connection ||
      connection.status !== "CONNECTED" ||
      !connection.encryptedRefreshToken
    ) {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_AUTH_REQUIRED",
        "Google connection is required before caching reviews."
      );
    }

    const refreshToken = this.dependencies.tokenCipher.decrypt(
      connection.encryptedRefreshToken
    );
    const tokenSet = await this.dependencies.provider.refreshAccessToken({
      refreshToken
    });
    const reviewsResult = await this.dependencies.provider.listReviews({
      accessToken: tokenSet.accessToken,
      accountId: input.accountId,
      locationId: input.locationId,
      ...(input.pageToken ? { pageToken: input.pageToken } : {})
    });

    const cachedAt = new Date();
    const expiresAt = new Date(
      cachedAt.getTime() + reviewCacheTtlDays * millisecondsPerDay
    );

    await this.dependencies.reviewCacheRepository.upsertMany(
      reviewsResult.reviews.map((review) => ({
        tenantId: input.tenantId,
        businessLocationId: businessLocation.id,
        googleReviewId: review.id,
        ...(review.reviewerName ? { reviewerName: review.reviewerName } : {}),
        starRating: review.starRating,
        ...(review.comment ? { comment: review.comment } : {}),
        ...(review.reviewReply ? { reviewReply: review.reviewReply } : {}),
        reviewCreatedAt: review.createdAt,
        reviewUpdatedAt: review.updatedAt,
        cachedAt,
        expiresAt
      }))
    );

    await this.dependencies.businessLocationRepository.markSynced({
      tenantId: input.tenantId,
      businessLocationId: businessLocation.id,
      syncedAt: cachedAt
    });

    return reviewsResult;
  }
}
