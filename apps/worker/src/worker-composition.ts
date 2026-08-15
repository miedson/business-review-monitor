import {
  CleanupExpiredReviewCache,
} from "@brm/review-monitoring";
import { prisma } from "@brm/database";
import {
  EncryptionTokenCipher,
  GoogleBusinessProfileApiProvider,
  GoogleBusinessProfileMockProvider,
  PrismaBusinessLocationRepository,
  PrismaGoogleConnectionRepository,
  PrismaReviewCacheRepository,
  RefreshGoogleReviewCache
} from "@brm/review-monitoring";
import { createEncryptionServiceFromBase64Key } from "@brm/shared";
import type { AppConfig } from "@brm/config";
import { SyncGoogleReviewsJob } from "./jobs/sync-google-reviews-job.js";
import { CleanupExpiredReviewCacheJob } from "./jobs/cleanup-expired-review-cache-job.js";

export function createSyncGoogleReviewsJob(
  config: AppConfig
): SyncGoogleReviewsJob {
  const provider =
    config.GOOGLE_PROVIDER === "mock"
      ? new GoogleBusinessProfileMockProvider()
      : new GoogleBusinessProfileApiProvider({
          clientId: config.GOOGLE_CLIENT_ID,
          clientSecret: config.GOOGLE_CLIENT_SECRET,
          redirectUri: config.GOOGLE_REDIRECT_URI
        });

  return new SyncGoogleReviewsJob(
    new RefreshGoogleReviewCache({
      businessLocationRepository: new PrismaBusinessLocationRepository(prisma),
      googleConnectionRepository: new PrismaGoogleConnectionRepository(prisma),
      provider,
      reviewCacheRepository: new PrismaReviewCacheRepository(prisma),
      tokenCipher: new EncryptionTokenCipher(
        createEncryptionServiceFromBase64Key(config.TOKEN_ENCRYPTION_KEY)
      )
    })
  );
}

export function createCleanupExpiredReviewCacheJob(): CleanupExpiredReviewCacheJob {
  return new CleanupExpiredReviewCacheJob(
    new CleanupExpiredReviewCache({
      reviewCacheRepository: new PrismaReviewCacheRepository(prisma)
    })
  );
}
