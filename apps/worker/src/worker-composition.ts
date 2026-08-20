import {
  CleanupExpiredReviewCache,
  PrismaInstagramConnectionRepository,
  PrismaInstagramCommentRepository,
  ResolveInstagramWebhookIdentity
} from "@brm/review-monitoring";
import { prisma } from "@brm/database";
import {
  EncryptionTokenCipher,
  GoogleBusinessProfileApiProvider,
  GoogleBusinessProfileMockProvider,
  InstagramApiProvider,
  InstagramApiMockProvider,
  PrismaBusinessLocationRepository,
  PrismaGoogleConnectionRepository,
  PrismaReviewCacheRepository,
  RefreshGoogleReviewCache
} from "@brm/review-monitoring";
import { createEncryptionServiceFromBase64Key } from "@brm/shared";
import type { AppConfig } from "@brm/config";
import { SyncGoogleReviewsJob } from "./jobs/sync-google-reviews-job.js";
import { CleanupExpiredReviewCacheJob } from "./jobs/cleanup-expired-review-cache-job.js";
import { ProcessMetaWebhookEventJob } from "./jobs/process-meta-webhook-event-job.js";

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

export function createProcessMetaWebhookEventJob(config: AppConfig): ProcessMetaWebhookEventJob {
  const instagramProvider =
    config.META_PROVIDER === "real"
      ? new InstagramApiProvider({
          appId: config.META_APP_ID,
          appSecret: config.META_APP_SECRET,
          redirectUri: config.META_INSTAGRAM_REDIRECT_URI,
          graphApiVersion: config.META_GRAPH_API_VERSION
        })
      : new InstagramApiMockProvider();

  const tokenCipher = new EncryptionTokenCipher(
    createEncryptionServiceFromBase64Key(config.TOKEN_ENCRYPTION_KEY)
  );

  const connectionRepository = new PrismaInstagramConnectionRepository(prisma);
  const commentRepository = new PrismaInstagramCommentRepository(prisma);

  const resolveWebhookIdentity = new ResolveInstagramWebhookIdentity({
    instagramConnectionRepository: connectionRepository,
    provider: instagramProvider,
    tokenCipher
  });

  return new ProcessMetaWebhookEventJob(
    connectionRepository,
    commentRepository,
    resolveWebhookIdentity
  );
}
