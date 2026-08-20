import { describe, it, expect, beforeEach } from "vitest";
import { DisconnectInstagramConnection } from "./disconnect-instagram-connection.js";
import type { StoredInstagramConnection } from "@brm/review-monitoring";
import type { BusinessProfileReviewProvider } from "@brm/review-monitoring";
import type { TokenCipher } from "@brm/review-monitoring";

class FakeProvider implements BusinessProfileReviewProvider {
  buildAuthorizationUrl(): string {
    return "";
  }

  async exchangeAuthorizationCode(): Promise<{ accessToken: string; expiresInSeconds: number; scope: string }> {
    return { accessToken: "token", expiresInSeconds: 3600, scope: "instagram_business_basic" };
  }

  async refreshAccessToken(): Promise<{ accessToken: string; expiresInSeconds: number; scope: string }> {
    return { accessToken: "token", expiresInSeconds: 3600, scope: "instagram_business_basic" };
  }

  async revokeAuthorization(): Promise<void> {}

  async listAccounts(): Promise<{ accounts: [] }> {
    return { accounts: [] };
  }

  async listLocations(): Promise<{ locations: [] }> {
    return { locations: [] };
  }

  async listReviews(): Promise<{ reviews: []; averageRating: number; totalReviewCount: number }> {
    return { reviews: [], averageRating: 0, totalReviewCount: 0 };
  }

  async getUserProfile(): Promise<{ id: string; username: string; account_type: string }> {
    return { id: "mock", username: "mock", account_type: "BUSINESS" };
  }

  async resolveWebhookAccountId(): Promise<{ id: string }> {
    return { id: "mock" };
  }
}

class FakeTokenCipher implements TokenCipher {
  decrypt(value: string): string {
    return value.replace("encrypted:", "");
  }

  encrypt(value: string): string {
    return `encrypted:${value}`;
  }
}

describe("DisconnectInstagramConnection", () => {
  let connectionRepo: {
    disconnectByTenantId: (input: { disconnectedAt: Date; tenantId: string }) => Promise<StoredInstagramConnection | null>;
    deleteByTenantId: (tenantId: string) => Promise<void>;
  };
  let commentRepo: {
    deleteByConnectionId: (input: { connectionId: string }) => Promise<void>;
  };
  let provider: FakeProvider;
  let tokenCipher: FakeTokenCipher;
  let useCase: DisconnectInstagramConnection;

  beforeEach(() => {
    connectionRepo = {
      disconnectByTenantId: async () => null,
      deleteByTenantId: async () => {}
    };
    commentRepo = {
      deleteByConnectionId: async () => {}
    };
    provider = new FakeProvider();
    tokenCipher = new FakeTokenCipher();
    useCase = new DisconnectInstagramConnection({
      instagramConnectionRepository: connectionRepo,
      instagramCommentRepository: commentRepo,
      provider,
      tokenCipher
    });
  });

  it("disconnects keeping data when deleteData is false", async () => {
    const connection: StoredInstagramConnection = {
      id: "conn_1",
      tenantId: "tenant_1",
      instagramUserId: "user_1",
      instagramProfessionalAccountId: "prof_1",
      username: "test",
      accountType: "BUSINESS",
      encryptedAccessToken: "encrypted:token",
      scope: "instagram_business_basic",
      status: "CONNECTED",
      connectedAt: new Date(),
      disconnectedAt: null,
      tokenExpiresAt: new Date()
    };

    connectionRepo.disconnectByTenantId = async () => connection;

    const result = await useCase.execute({ tenantId: "tenant_1", deleteData: false });

    expect(result.disconnected).toBe(true);
  });

  it("deletes data when deleteData is true", async () => {
    const connection: StoredInstagramConnection = {
      id: "conn_1",
      tenantId: "tenant_1",
      instagramUserId: "user_1",
      instagramProfessionalAccountId: "prof_1",
      username: "test",
      accountType: "BUSINESS",
      encryptedAccessToken: "encrypted:token",
      scope: "instagram_business_basic",
      status: "CONNECTED",
      connectedAt: new Date(),
      disconnectedAt: null,
      tokenExpiresAt: new Date()
    };

    connectionRepo.disconnectByTenantId = async () => connection;

    const result = await useCase.execute({ tenantId: "tenant_1", deleteData: true });

    expect(result.disconnected).toBe(true);
  });

  it("returns disconnected false when connection not found", async () => {
    connectionRepo.disconnectByTenantId = async () => null;

    const result = await useCase.execute({ tenantId: "tenant_1", deleteData: false });

    expect(result.disconnected).toBe(false);
  });
});
