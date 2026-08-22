import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";

import { buildApi } from "../../server/app.js";

const testConfig = {
  NODE_ENV: "test",
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
} as const;

describe("meta webhook routes", () => {
  describe("GET /webhooks/meta", () => {
    it("returns challenge when verify token matches and mode is subscribe", async () => {
      const app = await buildApi({ config: testConfig });

      const challenge = "123456789";
      const response = await app.inject({
        method: "GET",
        url: `/webhooks/meta?hub.mode=subscribe&hub.verify_token=${testConfig.META_WEBHOOK_VERIFY_TOKEN}&hub.challenge=${challenge}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/plain");
      expect(response.body).toBe(challenge);

      await app.close();
    });

    it("returns 403 when verify token is incorrect", async () => {
      const app = await buildApi({ config: testConfig });

      const response = await app.inject({
        method: "GET",
        url: "/webhooks/meta?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=123456",
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.error).toBe("Invalid verify token");
      expect(body.code).toBe("META_WEBHOOK_INVALID_VERIFY_TOKEN");
      expect(body.requestId).toBeDefined();

      await app.close();
    });

    it("returns 403 when mode is not subscribe", async () => {
      const app = await buildApi({ config: testConfig });

      const response = await app.inject({
        method: "GET",
        url: `/webhooks/meta?hub.mode=unsubscribe&hub.verify_token=${testConfig.META_WEBHOOK_VERIFY_TOKEN}&hub.challenge=123456`,
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expect(body.error).toBe("Invalid hub.mode");
      expect(body.code).toBe("META_WEBHOOK_INVALID_VERIFY_TOKEN");

      await app.close();
    });

    it("returns 400 when required parameters are missing", async () => {
      const app = await buildApi({ config: testConfig });

      const response = await app.inject({
        method: "GET",
        url: "/webhooks/meta",
      });

      expect(response.statusCode).toBe(400);

      await app.close();
    });

    it("returns 400 when hub.mode is missing", async () => {
      const app = await buildApi({ config: testConfig });

      const response = await app.inject({
        method: "GET",
        url: `/webhooks/meta?hub.verify_token=${testConfig.META_WEBHOOK_VERIFY_TOKEN}&hub.challenge=123456`,
      });

      expect(response.statusCode).toBe(400);

      await app.close();
    });

    it("returns 400 when hub.verify_token is missing", async () => {
      const app = await buildApi({ config: testConfig });

      const response = await app.inject({
        method: "GET",
        url: "/webhooks/meta?hub.mode=subscribe&hub.challenge=123456",
      });

      expect(response.statusCode).toBe(400);

      await app.close();
    });

    it("returns 400 when hub.challenge is missing", async () => {
      const app = await buildApi({ config: testConfig });

      const response = await app.inject({
        method: "GET",
        url: `/webhooks/meta?hub.mode=subscribe&hub.verify_token=${testConfig.META_WEBHOOK_VERIFY_TOKEN}`,
      });

      expect(response.statusCode).toBe(400);

      await app.close();
    });
  });

  describe("POST /webhooks/meta", () => {
    it("returns 401 when signature header is missing", async () => {
      const app = await buildApi({ config: testConfig });

      const response = await app.inject({
        method: "POST",
        url: "/webhooks/meta",
        payload: {
          object: "instagram",
          entry: [],
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBe("Missing X-Hub-Signature-256 header");
      expect(body.code).toBe("META_WEBHOOK_INVALID_SIGNATURE");

      await app.close();
    });

    it("returns 401 when signature is invalid", async () => {
      const app = await buildApi({ config: testConfig });

      const response = await app.inject({
        method: "POST",
        url: "/webhooks/meta",
        headers: {
          "x-hub-signature-256": "sha256=invalid-signature",
        },
        payload: {
          object: "instagram",
          entry: [],
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toBe("Invalid signature");
      expect(body.code).toBe("META_WEBHOOK_INVALID_SIGNATURE");

      await app.close();
    });

    it("returns 401 when signature is invalid", async () => {
      const app = await buildApi({ config: testConfig });

      const response = await app.inject({
        method: "POST",
        url: "/webhooks/meta",
        headers: {
          "x-hub-signature-256": "sha256=invalid-signature",
        },
        payload: {
          invalid: "payload",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.code).toBe("META_WEBHOOK_INVALID_SIGNATURE");

      await app.close();
    });
  });
});
