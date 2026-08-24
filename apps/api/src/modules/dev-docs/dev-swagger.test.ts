import { describe, expect, it } from "vitest";

import type { AppConfig } from "@brm/config";

import { buildApi } from "../../server/app.js";

const baseConfig: AppConfig = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://brm:brm_dev_password@127.0.0.1:5432/business_review_monitor",
  REDIS_URL: "redis://localhost:6379",
  BRM_QUEUE_PREFIX: "brm",
  JWT_ACCESS_SECRET: "access-secret-with-at-least-32-chars",
  JWT_REFRESH_SECRET: "refresh-secret-with-at-least-32-chars",
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, "a").toString("base64"),
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  GOOGLE_REDIRECT_URI: "http://localhost:3333/integrations/google/callback",
  WEB_URL: "http://localhost:3000",
  API_URL: "http://localhost:3333",
  GOOGLE_PROVIDER: "mock",
  META_PROVIDER: "mock",
  META_APP_ID: "meta-app-id",
  META_APP_SECRET: "meta-app-secret",
  META_INSTAGRAM_REDIRECT_URI: "http://localhost:3333/integrations/instagram/callback",
  META_WEBHOOK_VERIFY_TOKEN: "webhook-verify-token",
  META_GRAPH_API_VERSION: "v21.0",
};

describe("development Swagger documentation", () => {
  it("documents all existing API endpoints", async () => {
    const app = await buildApi({ config: baseConfig });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/dev/docs/json",
      });
      const uiResponse = await app.inject({
        method: "GET",
        url: "/dev/docs",
      });

      expect(response.statusCode).toBe(200);
      expect(uiResponse.statusCode).toBe(200);
      const document = response.json<{
        paths: Record<
          string,
          {
            post?: {
              requestBody?: unknown;
            };
          }
        >;
      }>();

      expect(Object.keys(document.paths).sort()).toEqual([
        "/attention-summary",
        "/auth/login",
        "/auth/logout",
        "/auth/me",
        "/auth/refresh",
        "/auth/register",
        "/automations",
        "/automations/media",
        "/automations/test",
        "/automations/{id}",
        "/automations/{id}/executions",
        "/business-locations/select",
        "/business-locations/{id}/select",
        "/health",
        "/inbox/conversations",
        "/inbox/conversations/{id}/messages",
        "/inbox/conversations/{id}/read",
        "/instagram/comments",
        "/instagram/comments/{id}/mark-replied",
        "/instagram/comments/{id}/reply",
        "/integrations/google/accounts",
        "/integrations/google/callback",
        "/integrations/google/connect",
        "/integrations/google/connect-url",
        "/integrations/google/disconnect",
        "/integrations/google/locations",
        "/integrations/google/reviews",
        "/integrations/google/reviews/cache",
        "/integrations/instagram/accounts",
        "/integrations/instagram/callback",
        "/integrations/instagram/connect",
        "/integrations/instagram/connect-url",
        "/integrations/instagram/disconnect",
        "/integrations/instagram/status",
        "/integrations/status",
        "/notifications",
        "/notifications/read-all",
        "/notifications/{id}/read",
        "/realtime",
        "/reviews/{reviewId}/reply",
        "/webhooks/meta",
      ]);
      expect(document.paths["/auth/register"]?.post?.requestBody).toBeDefined();
      expect(document.paths["/auth/login"]?.post?.requestBody).toBeDefined();
    } finally {
      await app.close();
    }
  });

  it("is not available in production", async () => {
    const app = await buildApi({
      config: {
        ...baseConfig,
        NODE_ENV: "production",
      },
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/dev/docs/json",
      });

      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});
