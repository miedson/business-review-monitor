import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { prisma } from "@brm/database";
import argon2 from "argon2";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApi } from "../../server/app.js";

const testEmail = `auth-test-${randomUUID()}@example.com`;
const orphanEmail = `orphan-auth-test-${randomUUID()}@example.com`;
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
  GOOGLE_PROVIDER: "mock"
} as const;

async function deleteTestUser() {
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: [testEmail, orphanEmail]
      }
    },
    select: {
      id: true
    }
  });
  const userIds = users.map((user) => user.id);

  if (userIds.length === 0) {
    return;
  }

  const tenantUsers = await prisma.tenantUser.findMany({
    where: {
      userId: {
        in: userIds
      }
    },
    select: {
      tenantId: true
    }
  });
  const tenantIds = tenantUsers.map((tenantUser) => tenantUser.tenantId);

  await prisma.tenantUser.deleteMany({
    where: {
      userId: {
        in: userIds
      }
    }
  });

  if (tenantIds.length > 0) {
    await prisma.tenant.deleteMany({
      where: {
        id: {
          in: tenantIds
        }
      }
    });
  }

  await prisma.user.deleteMany({
    where: {
      id: {
        in: userIds
      }
    }
  });
}

describe("auth routes", () => {
  beforeEach(async () => {
    await deleteTestUser();
  });

  afterAll(async () => {
    await deleteTestUser();
    await prisma.$disconnect();
  });

  it("registers, reads current user, refreshes and logs out", async () => {
    const app = await buildApi({ config: testConfig });

    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "Auth Test",
        email: testEmail,
        password: "password123"
      }
    });

    expect(registerResponse.statusCode).toBe(201);

    const registerBody = registerResponse.json<{
      user: { email: string };
      tenant: { id: string; name: string };
      accessToken: string;
    }>();
    const setCookie = registerResponse.headers["set-cookie"];

    expect(registerBody.user.email).toBe(testEmail);
    expect(registerBody.tenant.id).toEqual(expect.any(String));
    expect(registerBody.tenant.name).toBe("Auth Test");
    expect(registerBody.accessToken).toEqual(expect.any(String));
    expect(String(setCookie)).toContain("brm_refresh_token");

    const tenantMembership = await prisma.tenantUser.findFirst({
      where: {
        user: {
          email: testEmail
        },
        tenantId: registerBody.tenant.id,
        role: "OWNER"
      }
    });

    expect(tenantMembership).not.toBeNull();

    const meResponse = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: {
        authorization: `Bearer ${registerBody.accessToken}`
      }
    });

    expect(meResponse.statusCode).toBe(200);
    const meBody = meResponse.json<{
      user: { email: string };
      tenant: { id: string };
    }>();

    expect(meBody.user.email).toBe(testEmail);
    expect(meBody.tenant.id).toBe(registerBody.tenant.id);

    const refreshResponse = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      headers: {
        cookie: String(setCookie)
      }
    });

    expect(refreshResponse.statusCode).toBe(200);
    expect(
      refreshResponse.json<{
        tenant: { id: string };
        accessToken: string;
      }>()
    ).toMatchObject({
      tenant: { id: registerBody.tenant.id },
      accessToken: expect.any(String)
    });

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/auth/logout"
    });

    expect(logoutResponse.statusCode).toBe(204);

    await app.close();
  });

  it("rejects login when the user has no tenant membership", async () => {
    const app = await buildApi({ config: testConfig });
    const passwordHash = await argon2.hash("password123", {
      type: argon2.argon2id
    });

    await prisma.user.create({
      data: {
        name: "Orphan User",
        email: orphanEmail,
        passwordHash
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: orphanEmail,
        password: "password123"
      }
    });

    expect(response.statusCode).toBe(403);

    await app.close();
  });

  it("rejects invalid credentials", async () => {
    const app = await buildApi({ config: testConfig });

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: testEmail,
        password: "wrong-password"
      }
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it("rejects invalid register payloads", async () => {
    const app = await buildApi({ config: testConfig });

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        name: "",
        email: "invalid-email",
        password: "short"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: string }>().error).toBe("Invalid request body");

    await app.close();
  });
});
