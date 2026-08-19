import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { prisma } from "@brm/database";
import { afterAll, describe, expect, it } from "vitest";
import { buildApi } from "../../server/app.js";

const createTestEmail = (): string =>
  `instagram-integration-test-${randomUUID()}@example.com`;

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
  META_GRAPH_API_VERSION: "v21.0"
} as const;

describe("instagram integration routes", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("starts OAuth and stores the encrypted access token on callback", async () => {
    const app = await buildApi({ config: testConfig });

    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Instagram Integration Test",
        email: createTestEmail(),
        password: "password123"
      }
    });
    const registerBody = registerResponse.json<{
      accessToken: string;
      tenant: { id: string };
    }>();

    const connectResponse = await app.inject({
      method: "GET",
      url: "/integrations/instagram/connect",
      headers: {
        authorization: `Bearer ${registerBody.accessToken}`
      }
    });

    expect(connectResponse.statusCode).toBe(302);
    const authorizationUrl = new URL(connectResponse.headers.location as string);
    const state = authorizationUrl.searchParams.get("state");

    expect(state).not.toBeNull();
    const stateValue = state ?? "";

    const callbackResponse = await app.inject({
      method: "GET",
      url: `/integrations/instagram/callback?code=mock-code&state=${stateValue}`
    });

    expect(callbackResponse.statusCode).toBe(302);
    expect(callbackResponse.headers.location).toBe(
      "http://localhost:3000/settings/integrations?instagram=connected"
    );

    const instagramConnection = await prisma.instagramConnection.findFirstOrThrow({
      where: {
        tenantId: registerBody.tenant.id
      }
    });

    expect(instagramConnection.status).toBe("CONNECTED");
    expect(instagramConnection.encryptedAccessToken).toEqual(expect.any(String));
    expect(instagramConnection.encryptedAccessToken).not.toContain("mock-access-token");
    expect(instagramConnection.instagramUserId).toBe("mock-user-id");
    expect(instagramConnection.username).toBe("mock_username");
    expect(instagramConnection.accountType).toBe("BUSINESS");
    expect(instagramConnection.scope).toBe("instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages");
    expect(instagramConnection.tokenExpiresAt).not.toBeNull();

    await app.close();
  });

  it("rejects reused OAuth state", async () => {
    const app = await buildApi({ config: testConfig });

    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Instagram Integration Test",
        email: createTestEmail(),
        password: "password123"
      }
    });
    const accessToken = registerResponse.json<{ accessToken: string }>().accessToken;
    const connectResponse = await app.inject({
      method: "GET",
      url: "/integrations/instagram/connect",
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });
    const authorizationUrl = new URL(connectResponse.headers.location as string);
    const state = authorizationUrl.searchParams.get("state");
    expect(state).not.toBeNull();
    const stateValue = state ?? "";

    await app.inject({
      method: "GET",
      url: `/integrations/instagram/callback?code=mock-code&state=${stateValue}`
    });

    const secondCallbackResponse = await app.inject({
      method: "GET",
      url: `/integrations/instagram/callback?code=mock-code&state=${stateValue}`
    });

    expect(secondCallbackResponse.statusCode).toBe(302);
    expect(secondCallbackResponse.headers.location).toBe(
      "http://localhost:3000/settings/integrations?instagram=error"
    );

    await app.close();
  });

  it("rejects callback with missing code or state", async () => {
    const app = await buildApi({ config: testConfig });

    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Instagram Integration Test",
        email: createTestEmail(),
        password: "password123"
      }
    });
    const accessToken = registerResponse.json<{ accessToken: string }>().accessToken;
    const connectResponse = await app.inject({
      method: "GET",
      url: "/integrations/instagram/connect",
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });
    const authorizationUrl = new URL(connectResponse.headers.location as string);
    const state = authorizationUrl.searchParams.get("state");
    expect(state).not.toBeNull();
    const stateValue = state ?? "";

    const missingCodeResponse = await app.inject({
      method: "GET",
      url: `/integrations/instagram/callback?state=${stateValue}`
    });

    expect(missingCodeResponse.statusCode).toBe(302);
    expect(missingCodeResponse.headers.location).toBe(
      "http://localhost:3000/settings/integrations?instagram=error"
    );

    const missingStateResponse = await app.inject({
      method: "GET",
      url: `/integrations/instagram/callback?code=mock-code`
    });

    expect(missingStateResponse.statusCode).toBe(302);
    expect(missingStateResponse.headers.location).toBe(
      "http://localhost:3000/settings/integrations?instagram=error"
    );

    await app.close();
  });

  it("handles error parameter from Meta", async () => {
    const app = await buildApi({ config: testConfig });

    const errorResponse = await app.inject({
      method: "GET",
      url: "/integrations/instagram/callback?error=access_denied"
    });

    expect(errorResponse.statusCode).toBe(302);
    expect(errorResponse.headers.location).toBe(
      "http://localhost:3000/settings/integrations?instagram=error"
    );

    await app.close();
  });
});