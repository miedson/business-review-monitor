import type { PrismaClient } from "@brm/database";
import type {
  CacheBusinessReviewInput,
  CachedBusinessReview,
  DeleteExpiredReviewCacheInput,
  ListValidReviewCacheInput,
  ReviewCacheRepository
} from "../../application/ports/review-cache-repository.js";
import type { ReviewStarRating } from "../../domain/review.js";

export class PrismaReviewCacheRepository implements ReviewCacheRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertMany(reviews: CacheBusinessReviewInput[]): Promise<void> {
    if (reviews.length === 0) {
      return;
    }

    await this.prisma.$transaction(
      reviews.map((review) =>
        this.prisma.reviewCache.upsert({
          where: {
            businessLocationId_googleReviewId: {
              businessLocationId: review.businessLocationId,
              googleReviewId: review.googleReviewId
            }
          },
          create: {
            tenantId: review.tenantId,
            businessLocationId: review.businessLocationId,
            googleReviewId: review.googleReviewId,
            reviewerName: review.reviewerName ?? null,
            starRating: starRatingToNumber(review.starRating),
            comment: review.comment ?? null,
            replyText: review.reviewReply?.comment ?? null,
            replyUpdatedAt: review.reviewReply?.updatedAt ?? null,
            reviewCreatedAt: review.reviewCreatedAt,
            reviewUpdatedAt: review.reviewUpdatedAt,
            cachedAt: review.cachedAt,
            expiresAt: review.expiresAt
          },
          update: {
            reviewerName: review.reviewerName ?? null,
            starRating: starRatingToNumber(review.starRating),
            comment: review.comment ?? null,
            replyText: review.reviewReply?.comment ?? null,
            replyUpdatedAt: review.reviewReply?.updatedAt ?? null,
            reviewCreatedAt: review.reviewCreatedAt,
            reviewUpdatedAt: review.reviewUpdatedAt,
            cachedAt: review.cachedAt,
            expiresAt: review.expiresAt
          }
        })
      )
    );
  }

  async listValidByLocation(
    input: ListValidReviewCacheInput
  ): Promise<CachedBusinessReview[]> {
    const rows = await this.prisma.reviewCache.findMany({
      where: {
        tenantId: input.tenantId,
        businessLocationId: input.businessLocationId,
        expiresAt: {
          gt: input.now
        }
      },
      orderBy: {
        reviewUpdatedAt: "desc"
      },
      ...(input.limit ? { take: input.limit } : {})
    });

    return rows.map((row) => ({
      id: row.googleReviewId,
      ...(row.reviewerName ? { reviewerName: row.reviewerName } : {}),
      starRating: numberToStarRating(row.starRating),
      ...(row.comment ? { comment: row.comment } : {}),
      ...(row.replyText ? { reviewReply: { comment: row.replyText, ...(row.replyUpdatedAt ? { updatedAt: row.replyUpdatedAt } : {}) } } : {}),
      createdAt: row.reviewCreatedAt,
      updatedAt: row.reviewUpdatedAt,
      cachedAt: row.cachedAt,
      expiresAt: row.expiresAt
    }));
  }

  async deleteExpired(input: DeleteExpiredReviewCacheInput): Promise<number> {
    const result = await this.prisma.reviewCache.deleteMany({
      where: {
        expiresAt: {
          lte: input.now
        }
      }
    });

    return result.count;
  }

  async deleteByTenantId(tenantId: string): Promise<void> {
    await this.prisma.reviewCache.deleteMany({
      where: { tenantId }
    });
  }
}

function starRatingToNumber(starRating: ReviewStarRating): number {
  const ratings: Record<ReviewStarRating, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5
  };

  return ratings[starRating];
}

function numberToStarRating(starRating: number): ReviewStarRating {
  if (starRating === 5) {
    return "FIVE";
  }

  if (starRating === 4) {
    return "FOUR";
  }

  if (starRating === 3) {
    return "THREE";
  }

  if (starRating === 2) {
    return "TWO";
  }

  return "ONE";
}
