import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@brm/database";
import { buildApi } from "../../server/app.js";

const testConfig = {
  NODE_ENV: "test",
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
  GOOGLE_PROVIDER: "mock",
  META_PROVIDER: "mock",
  META_APP_ID: "meta-app-id",
  META_APP_SECRET: "meta-app-secret",
  META_INSTAGRAM_REDIRECT_URI: "http://localhost:3333/integrations/instagram/callback",
  META_WEBHOOK_VERIFY_TOKEN: "webhook-verify-token",
  META_GRAPH_API_VERSION: "v21.0"
} as const;

describe("Google manual review sync route", () => {
  afterEach(async () => {
    await prisma.reviewCache.deleteMany();
    await prisma.businessLocation.deleteMany();
    await prisma.googleConnection.deleteMany();
    await prisma.tenantUser.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.user.deleteMany();
  });

  it("enqueues manual review sync and rate limits repeated requests", async () => {
    const app = await buildApi({ config: testConfig });

    try {
      const accessToken = await registerAndGetAccessToken(app);
      const location = await connectGoogleMock(app, accessToken);

      const firstResponse = await app.inject({
        method: "POST",
        url: "/integrations/google/reviews/cache",
        headers: {
          authorization: `Bearer ${accessToken}`
        },
        payload: {
          accountId: location.googleAccountId,
          locationId: location.googleLocationId
        }
      });

    expect(firstResponse.statusCode, firstResponse.body).toBe(202);
      expect(firstResponse.json()).toEqual({
        jobId: expect.any(String)
      });

      const secondResponse = await app.inject({
        method: "POST",
        url: "/integrations/google/reviews/cache",
        headers: {
          authorization: `Bearer ${accessToken}`
        },
        payload: {
          accountId: location.googleAccountId,
          locationId: location.googleLocationId
        }
      });

      expect(secondResponse.statusCode).toBe(429);
    } finally {
      await app.close();
    }
  });
});

async function registerAndGetAccessToken(
  app: Awaited<ReturnType<typeof buildApi>>
): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      name: "Manual Sync User",
      email: `manual-sync-${randomUUID()}@example.com`,
      password: "password123"
    }
  });

  expect(response.statusCode).toBe(201);

  return response.json<{ accessToken: string }>().accessToken;
}

async function connectGoogleMock(
  app: Awaited<ReturnType<typeof buildApi>>,
  accessToken: string
): Promise<{ googleAccountId: string; googleLocationId: string }> {
  const connectResponse = await app.inject({
    method: "GET",
    url: "/integrations/google/connect",
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });
  expect(connectResponse.statusCode).toBe(302);

  const authorizationUrl = new URL(String(connectResponse.headers.location));
  const state = authorizationUrl.searchParams.get("state");
  expect(state).not.toBeNull();

  const callbackResponse = await app.inject({
    method: "GET",
    url: `/integrations/google/callback?code=mock-code&state=${state}`
  });

  expect(callbackResponse.statusCode).toBe(302);

  const accountsResponse = await app.inject({
    method: "GET",
    url: "/integrations/google/accounts",
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });
  expect(accountsResponse.statusCode).toBe(200);
  const accountId = accountsResponse.json<{
    accounts: Array<{ id: string }>;
  }>().accounts[0]?.id;
  if (!accountId) {
    throw new Error("Expected at least one Google account in mock provider.");
  }

  const locationsResponse = await app.inject({
    method: "GET",
    url: `/integrations/google/locations?accountId=${encodeURIComponent(
      accountId
    )}`,
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });
  expect(locationsResponse.statusCode).toBe(200);
  const locationId = locationsResponse.json<{
    locations: Array<{ id: string; name: string }>;
  }>().locations[0]?.id;
  if (!locationId) {
    throw new Error("Expected at least one Google location in mock provider.");
  }

  const connection = await prisma.googleConnection.findFirstOrThrow();
  await prisma.businessLocation.create({
    data: {
      tenantId: connection.tenantId,
      googleConnectionId: connection.id,
      googleAccountId: accountId,
      googleLocationId: locationId,
      name: "Manual Sync Location",
      isSelected: true,
      isActive: true
    }
  });

  const location = await prisma.businessLocation.findFirstOrThrow({
    select: {
      googleAccountId: true,
      googleLocationId: true
    }
  });

  return {
    googleAccountId: location.googleAccountId,
    googleLocationId: location.googleLocationId
  };
}
