import type { ReviewCacheRepository } from "../ports/review-cache-repository.js";

export type CleanupExpiredReviewCacheDependencies = {
  reviewCacheRepository: ReviewCacheRepository;
};

export type CleanupExpiredReviewCacheResult = {
  deletedCount: number;
};

export class CleanupExpiredReviewCache {
  constructor(private readonly dependencies: CleanupExpiredReviewCacheDependencies) {}

  async execute(now = new Date()): Promise<CleanupExpiredReviewCacheResult> {
    const deletedCount = await this.dependencies.reviewCacheRepository.deleteExpired({
      now,
    });

    return { deletedCount };
  }
}
