import type { AppConfig } from "@brm/config";
import { describe, expect, it } from "vitest";
import { buildApi } from "../../server/app.js";

const baseConfig: AppConfig = {
  NODE_ENV: "development",
  DATABASE_URL:
    "postgresql://brm:brm_dev_password@127.0.0.1:5432/business_review_monitor",
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
  GOOGLE_PROVIDER: "mock"
};

describe("development Swagger documentation", () => {
  it("documents all existing API endpoints", async () => {
    const app = await buildApi({ config: baseConfig });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/dev/docs/json"
      });
      const uiResponse = await app.inject({
        method: "GET",
        url: "/dev/docs"
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
        "/auth/login",
        "/auth/logout",
        "/auth/me",
        "/auth/refresh",
      "/auth/register",
      "/business-locations/select",
      "/business-locations/{id}/select",
        "/health",
        "/integrations/google/accounts",
        "/integrations/google/callback",
      "/integrations/google/connect",
      "/integrations/google/connect-url",
      "/integrations/google/disconnect",
        "/integrations/google/locations",
        "/integrations/google/reviews",
        "/integrations/google/reviews/cache"
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
        NODE_ENV: "production"
      }
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/dev/docs/json"
      });

      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});
