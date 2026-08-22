import type { BusinessReview, ReviewStarRating } from "../../domain/review.js";

export type CachedBusinessReview = BusinessReview & {
  cachedAt: Date;
  expiresAt: Date;
};

export type CacheBusinessReviewInput = {
  tenantId: string;
  businessLocationId: string;
  googleReviewId: string;
  reviewerName?: string;
  starRating: ReviewStarRating;
  comment?: string;
  reviewReply?: { comment: string; updatedAt?: Date };
  reviewCreatedAt: Date;
  reviewUpdatedAt: Date;
  cachedAt: Date;
  expiresAt: Date;
};

export type ListValidReviewCacheInput = {
  tenantId: string;
  businessLocationId: string;
  now: Date;
  limit?: number;
};

export type DeleteExpiredReviewCacheInput = {
  now: Date;
};
export type SaveReviewReplyInput = { tenantId: string; businessLocationId: string; googleReviewId: string; comment: string; updatedAt: Date };

export interface ReviewCacheRepository {
  upsertMany(reviews: CacheBusinessReviewInput[]): Promise<void>;
  listValidByLocation(
    input: ListValidReviewCacheInput
  ): Promise<CachedBusinessReview[]>;
  deleteExpired(input: DeleteExpiredReviewCacheInput): Promise<number>;
  saveReply?(input: SaveReviewReplyInput): Promise<void>;
}
