import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import type { AppConfig } from "@brm/config";
import { loadConfig } from "@brm/config";
import { prisma } from "@brm/database";
import {
  DisconnectGoogleConnection,
  PrismaReviewCacheRepository,
  SelectBusinessLocation
} from "@brm/review-monitoring";
import {
  CompleteGoogleOAuthCallback,
  EncryptionTokenCipher,
  GoogleBusinessProfileApiProvider,
  GoogleBusinessProfileMockProvider,
  ListGoogleAccounts,
  PrismaGoogleConnectionRepository,
  StartGoogleOAuthConnection
} from "@brm/review-monitoring";
import { createEncryptionServiceFromBase64Key } from "@brm/shared";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { registerAuthRoutes } from "../modules/auth/auth.routes.js";
import { AuthService } from "../modules/auth/auth.service.js";
import { UserRepository } from "../modules/auth/user.repository.js";
import { registerDevSwagger } from "../modules/dev-docs/dev-swagger.js";
import {
  BullMqReviewSyncJobScheduler,
  googleReviewSyncQueueName
} from "../modules/integrations/bullmq-review-sync-job-scheduler.js";
import { registerGoogleIntegrationRoutes } from "../modules/integrations/google-integration.routes.js";
import { InMemoryOAuthStateStore } from "../modules/integrations/in-memory-oauth-state.store.js";
import { registerMvpManagementRoutes } from "../modules/integrations/mvp-management.routes.js";
import {
  createBullMqConnection,
  createRedisClient
} from "../modules/integrations/redis-connection.js";
import { RedisManualSyncRateLimiter } from "../modules/integrations/redis-manual-sync-rate-limiter.js";

export type BuildApiOptions = {
  config?: AppConfig;
};

import { ListGoogleLocations } from "@brm/review-monitoring";
import { ListGoogleReviews } from "@brm/review-monitoring";
import {
  PrismaBusinessLocationRepository,
  RequestGoogleReviewSync
} from "@brm/review-monitoring";
import { Queue } from "bullmq";

export async function buildApi(options: BuildApiOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const isProduction = config.NODE_ENV === "production";

  const app = Fastify({
    logger: true,
    genReqId: () => crypto.randomUUID()
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: config.WEB_URL,
    credentials: true
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute"
  });
  await app.register(cookie, {
    secret: config.JWT_REFRESH_SECRET
  });
  await app.register(jwt, {
    secret: config.JWT_ACCESS_SECRET
  });

  app.setErrorHandler((error: FastifyError | ZodError, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "Invalid request body",
        requestId: request.id
      });
    }

    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    const message = statusCode >= 500 ? "Internal server error" : error.message;
    const logPayload = {
      err: {
        message: error.message,
        name: error.name
      }
    };

    if (statusCode >= 500) {
      request.log.error(logPayload);
    } else {
      request.log.info(logPayload);
    }

    return reply.status(statusCode).send({
      error: message,
      requestId: request.id
    });
  });

  if (!isProduction) {
    await registerDevSwagger(app);
  }

  app.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        summary: "API health check",
        response: {
          200: {
            type: "object",
            required: ["status"],
            properties: {
              status: { type: "string" }
            }
          }
        }
      }
    },
    async () => ({
      status: "ok"
    })
  );

  const userRepository = new UserRepository(prisma);
  const authService = new AuthService({
    userRepository,
    jwt: app.jwt,
    refreshSecret: config.JWT_REFRESH_SECRET,
    secureCookies: isProduction
  });
  const provider =
    config.GOOGLE_PROVIDER === "mock"
      ? new GoogleBusinessProfileMockProvider({
          redirectUri: config.GOOGLE_REDIRECT_URI
        })
      : new GoogleBusinessProfileApiProvider({
          clientId: config.GOOGLE_CLIENT_ID,
          clientSecret: config.GOOGLE_CLIENT_SECRET,
          redirectUri: config.GOOGLE_REDIRECT_URI
        });
  const stateStore = new InMemoryOAuthStateStore({
    ttlMs: 10 * 60 * 1000
  });
  const googleConnectionRepository = new PrismaGoogleConnectionRepository(prisma);
  const businessLocationRepository = new PrismaBusinessLocationRepository(prisma);
  const reviewCacheRepository = new PrismaReviewCacheRepository(prisma);
  const tokenCipher = new EncryptionTokenCipher(
    createEncryptionServiceFromBase64Key(config.TOKEN_ENCRYPTION_KEY)
  );
  const startGoogleOAuthConnection = new StartGoogleOAuthConnection({
    provider,
    stateStore
  });
  const completeGoogleOAuthCallback = new CompleteGoogleOAuthCallback({
    provider,
    stateStore,
    tokenCipher,
    googleConnectionRepository,
    now: () => new Date()
  });
  const listGoogleAccounts = new ListGoogleAccounts({
    googleConnectionRepository,
    provider,
    tokenCipher
  });
  const listGoogleLocations = new ListGoogleLocations({
    googleConnectionRepository,
    provider,
    tokenCipher
  });
  const listGoogleReviews = new ListGoogleReviews({
    googleConnectionRepository,
    provider,
    tokenCipher
  });
  const redis = createRedisClient(config.REDIS_URL);
  const googleReviewSyncQueue = new Queue(googleReviewSyncQueueName, {
    connection: createBullMqConnection(config.REDIS_URL),
    prefix: config.BRM_QUEUE_PREFIX
  });
  app.addHook("onClose", async () => {
    await googleReviewSyncQueue.close();
    redis.disconnect();
  });
  const requestGoogleReviewSync = new RequestGoogleReviewSync({
    businessLocationRepository,
    rateLimiter: new RedisManualSyncRateLimiter(redis),
    jobScheduler: new BullMqReviewSyncJobScheduler(googleReviewSyncQueue)
  });
  const selectBusinessLocation = new SelectBusinessLocation({
    businessLocationRepository
  });
  const disconnectGoogleConnection = new DisconnectGoogleConnection({
    businessLocationRepository,
    googleConnectionRepository,
    provider,
    reviewCacheRepository,
    tokenCipher
  });

  registerAuthRoutes(app, authService);
  registerGoogleIntegrationRoutes(app, {
    authService,
    startGoogleOAuthConnection,
    completeGoogleOAuthCallback,
    listGoogleAccounts,
    listGoogleLocations,
    listGoogleReviews,
    requestGoogleReviewSync,
    selectBusinessLocation,
    disconnectGoogleConnection,
    webUrl: config.WEB_URL
  });

  registerMvpManagementRoutes(app, {
    authService,
    disconnectGoogleConnection,
    selectBusinessLocation
  });

  return app;
}
