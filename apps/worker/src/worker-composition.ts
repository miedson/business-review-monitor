import type { AppConfig } from "@brm/config";
import { prisma } from "@brm/database";
import {
  CleanupExpiredReviewCache,
  EncryptionTokenCipher,
  GoogleBusinessProfileApiProvider,
  GoogleBusinessProfileMockProvider,
  InstagramApiMockProvider,
  InstagramApiProvider,
  PrismaBusinessLocationRepository,
  PrismaGoogleConnectionRepository,
  PrismaInstagramCommentRepository,
  PrismaInstagramConnectionRepository,
  PrismaInstagramConversationRepository,
  PrismaInstagramMessageRepository,
  PrismaReviewCacheRepository,
  ProcessInstagramDirectMessage,
  RefreshGoogleReviewCache,
  ResolveInstagramWebhookIdentity,
} from "@brm/review-monitoring";
import { createEncryptionServiceFromBase64Key } from "@brm/shared";

import { CleanupExpiredReviewCacheJob } from "./jobs/cleanup-expired-review-cache-job.js";
import { ProcessMetaWebhookEventJob } from "./jobs/process-meta-webhook-event-job.js";
import { SyncGoogleReviewsJob } from "./jobs/sync-google-reviews-job.js";
import { RedisRealtimeEventPublisher } from "./realtime-publisher.js";
import { createRedisClient } from "./redis-connection.js";

export function createSyncGoogleReviewsJob(config: AppConfig): SyncGoogleReviewsJob {
  const provider =
    config.GOOGLE_PROVIDER === "mock"
      ? new GoogleBusinessProfileMockProvider()
      : new GoogleBusinessProfileApiProvider({
          clientId: config.GOOGLE_CLIENT_ID,
          clientSecret: config.GOOGLE_CLIENT_SECRET,
          redirectUri: config.GOOGLE_REDIRECT_URI,
        });

  const notificationStore = createNotificationStore();
  const realtimeEventPublisher = new RedisRealtimeEventPublisher(
    createRedisClient(config.REDIS_URL),
  );
  return new SyncGoogleReviewsJob(
    new RefreshGoogleReviewCache({
      businessLocationRepository: new PrismaBusinessLocationRepository(prisma),
      googleConnectionRepository: new PrismaGoogleConnectionRepository(prisma),
      provider,
      reviewCacheRepository: new PrismaReviewCacheRepository(prisma),
      tokenCipher: new EncryptionTokenCipher(
        createEncryptionServiceFromBase64Key(config.TOKEN_ENCRYPTION_KEY),
      ),
    }),
    notificationStore,
    realtimeEventPublisher,
  );
}

export function createCleanupExpiredReviewCacheJob(): CleanupExpiredReviewCacheJob {
  return new CleanupExpiredReviewCacheJob(
    new CleanupExpiredReviewCache({
      reviewCacheRepository: new PrismaReviewCacheRepository(prisma),
    }),
  );
}

export function createProcessMetaWebhookEventJob(config: AppConfig): ProcessMetaWebhookEventJob {
  const instagramProvider =
    config.META_PROVIDER === "real"
      ? new InstagramApiProvider({
          appId: config.META_APP_ID,
          appSecret: config.META_APP_SECRET,
          redirectUri: config.META_INSTAGRAM_REDIRECT_URI,
          graphApiVersion: config.META_GRAPH_API_VERSION,
        })
      : new InstagramApiMockProvider();

  const tokenCipher = new EncryptionTokenCipher(
    createEncryptionServiceFromBase64Key(config.TOKEN_ENCRYPTION_KEY),
  );

  const connectionRepository = new PrismaInstagramConnectionRepository(prisma);
  const commentRepository = new PrismaInstagramCommentRepository(prisma);
  const conversationRepository = new PrismaInstagramConversationRepository(prisma);
  const messageRepository = new PrismaInstagramMessageRepository(prisma);

  const resolveWebhookIdentity = new ResolveInstagramWebhookIdentity({
    instagramConnectionRepository: connectionRepository,
    provider: instagramProvider,
    tokenCipher,
  });

  const processDirectMessage = new ProcessInstagramDirectMessage({
    instagramConversationRepository: conversationRepository,
    instagramMessageRepository: messageRepository,
  });

  return new ProcessMetaWebhookEventJob(
    connectionRepository,
    commentRepository,
    resolveWebhookIdentity,
    conversationRepository,
    messageRepository,
    processDirectMessage,
    undefined,
    undefined,
    new RedisRealtimeEventPublisher(createRedisClient(config.REDIS_URL)),
    createNotificationStore(),
  );
}

function createNotificationStore() {
  return {
    async create(input: {
      tenantId: string;
      type: "INSTAGRAM_COMMENT" | "INSTAGRAM_DIRECT" | "GOOGLE_REVIEW" | "SYSTEM";
      title: string;
      body: string;
      resourceType: string;
      resourceId: string;
      dedupeKey: string;
    }): Promise<void> {
      await prisma.notification.upsert({
        where: { tenantId_dedupeKey: { tenantId: input.tenantId, dedupeKey: input.dedupeKey } },
        create: input,
        update: {},
      });
    },
  };
}
