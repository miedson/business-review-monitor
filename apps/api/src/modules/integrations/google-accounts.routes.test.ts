import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildApi } from "../../server/app.js";

const requiredTestEnv = {
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
} as const;

Object.assign(process.env, requiredTestEnv);

describe("Google accounts routes", () => {
  it("lists Google Business Profile accounts for a connected tenant", async () => {
    const app = await buildApi();
    const email = `google-accounts-${randomUUID()}@example.com`;

    try {
      const registerResponse = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload: {
          name: "Google Accounts Test",
          email,
          password: "password123"
        }
      });
      const registerBody = registerResponse.json<{ accessToken: string }>();

      const connectResponse = await app.inject({
        method: "GET",
        url: "/integrations/google/connect",
        headers: {
          authorization: `Bearer ${registerBody.accessToken}`
        }
      });
      const authorizationUrl = new URL(connectResponse.headers.location ?? "");
      const state = authorizationUrl.searchParams.get("state");

      expect(connectResponse.statusCode).toBe(302);
      expect(state).toBeTruthy();

      const callbackResponse = await app.inject({
        method: "GET",
        url: `/integrations/google/callback?code=mock-code&state=${state}`
      });

      expect(callbackResponse.statusCode).toBe(302);

      const accountsResponse = await app.inject({
        method: "GET",
        url: "/integrations/google/accounts",
        headers: {
          authorization: `Bearer ${registerBody.accessToken}`
        }
      });

      expect(accountsResponse.statusCode).toBe(200);
      expect(accountsResponse.json()).toMatchObject({
        accounts: [
          {
            id: "accounts/1001",
            name: "accounts/1001",
            accountName: "Matriz BRM"
          },
          {
            id: "accounts/1002",
            name: "accounts/1002",
            accountName: "Filial BRM"
          }
        ]
      });
    } finally {
      await app.close();
    }
  });
});
