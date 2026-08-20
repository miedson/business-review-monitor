import { describe, it, expect, beforeEach } from "vitest";
import { CompleteInstagramOAuthCallback } from "./complete-instagram-oauth-callback.js";
import type { InstagramReviewProvider } from "../ports/business-profile-review-provider.js";
import type { InstagramConnectionRepository, StoredInstagramConnection } from "../ports/instagram-connection-repository.js";
import type { OAuthStateStore, OAuthStateData } from "../ports/oauth-state-store.js";
import type { TokenCipher } from "../ports/token-cipher.js";
import type { BusinessProfileAccount, BusinessProfileLocation } from "../../domain/business-profile.js";
import type { BusinessReview } from "../../domain/review.js";

class FakeProvider implements InstagramReviewProvider {
  buildAuthorizationUrl(): string {
    return "https://instagram.com/oauth/authorize?state=test";
  }

  async exchangeAuthorizationCode(): Promise<{ accessToken: string; expiresInSeconds: number; scope: string }> {
    return {
      accessToken: "long-lived-token",
      expiresInSeconds: 5184000,
      scope: "instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages"
    };
  }

  async refreshAccessToken(): Promise<never> {
    throw new Error("Not implemented");
  }

  async revokeAuthorization(): Promise<void> {}

  async listAccounts(): Promise<{ accounts: BusinessProfileAccount[] }> {
    return { accounts: [] };
  }

  async listLocations(): Promise<{ locations: BusinessProfileLocation[] }> {
    return { locations: [] };
  }

  async listReviews(): Promise<{ reviews: BusinessReview[]; averageRating: number; totalReviewCount: number }> {
    return { reviews: [], averageRating: 0, totalReviewCount: 0 };
  }

  async getUserProfile(): Promise<{ id: string; username: string; account_type: string }> {
    return {
      id: "25928677863496445",
      username: "sixsysma",
      account_type: "BUSINESS"
    };
  }

  async resolveWebhookAccountId(): Promise<{ id: string; username?: string; accountType?: string }> {
    return { id: "25928677863496445" };
  }
}

class FakeStateStore implements OAuthStateStore {
  private states = new Map<string, OAuthStateData>();

  async create(input: OAuthStateData): Promise<string> {
    const state = `state-${input.tenantId}-${Date.now()}`;
    this.states.set(state, input);
    return state;
  }

  async consume(state: string): Promise<OAuthStateData | null> {
    const data = this.states.get(state);
    if (data) {
      this.states.delete(state);
      return data;
    }
    return null;
  }
}

class FakeTokenCipher implements TokenCipher {
  encrypt(value: string): string {
    return `encrypted-${value}`;
  }

  decrypt(value: string): string {
    return value.replace("encrypted-", "");
  }
}

class FakeRepository implements InstagramConnectionRepository {
  private connections: Map<string, StoredInstagramConnection> = new Map();

  async findByTenantId(tenantId: string): Promise<StoredInstagramConnection | null> {
    return this.connections.get(tenantId) ?? null;
  }

  async findByInstagramUserId(): Promise<StoredInstagramConnection | null> {
    return null;
  }

  async findByProfessionalAccountId(): Promise<StoredInstagramConnection | null> {
    return null;
  }

  async findConnectedWithoutProfessionalAccountId(): Promise<StoredInstagramConnection[]> {
    return [];
  }

  async saveConnected(input: {
    tenantId: string;
    instagramUserId: string;
    instagramProfessionalAccountId: string | undefined;
    username: string | undefined;
    accountType: string | undefined;
    encryptedAccessToken: string;
    scope: string;
    connectedAt: Date;
    tokenExpiresAt: Date | undefined;
  }): Promise<StoredInstagramConnection> {
    const connection: StoredInstagramConnection = {
      id: "conn-1",
      tenantId: input.tenantId,
      instagramUserId: input.instagramUserId,
      instagramProfessionalAccountId: input.instagramProfessionalAccountId ?? null,
      username: input.username ?? null,
      accountType: input.accountType ?? null,
      encryptedAccessToken: input.encryptedAccessToken,
      scope: input.scope,
      status: "CONNECTED",
      connectedAt: input.connectedAt,
      disconnectedAt: null,
      tokenExpiresAt: input.tokenExpiresAt ?? null
    };
    this.connections.set(input.tenantId, connection);
    return connection;
  }

  async setProfessionalAccountId(): Promise<void> {
    return;
  }

  async disconnectByTenantId(): Promise<StoredInstagramConnection | null> {
    return null;
  }

  async deleteByTenantId(): Promise<void> {
  }
}

describe("CompleteInstagramOAuthCallback", () => {
  let provider: FakeProvider;
  let stateStore: FakeStateStore;
  let tokenCipher: FakeTokenCipher;
  let repository: FakeRepository;
  let callback: CompleteInstagramOAuthCallback;

  beforeEach(() => {
    provider = new FakeProvider();
    stateStore = new FakeStateStore();
    tokenCipher = new FakeTokenCipher();
    repository = new FakeRepository();
    callback = new CompleteInstagramOAuthCallback({
      provider,
      stateStore,
      tokenCipher,
      instagramConnectionRepository: repository,
      now: () => new Date("2024-01-01T00:00:00Z"),
      logger: console
    });
  });

  it("creates new connection with instagramUserId and null professionalAccountId", async () => {
    const state = await stateStore.create({ userId: "user-1", tenantId: "tenant-1" });

    const result = await callback.execute({
      code: "valid-code",
      state
    });

    expect(result.tenantId).toBe("tenant-1");
    expect(result.instagramConnectionId).toBe("conn-1");

    const connection = await repository.findByTenantId("tenant-1");
    expect(connection).not.toBeNull();
    expect(connection?.instagramUserId).toBe("25928677863496445");
    expect(connection?.instagramProfessionalAccountId).toBeNull();
    expect(connection?.scope).toBe("instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages");
  });

  it("preserves professionalAccountId when reconnecting the same Instagram account", async () => {
    const state = await stateStore.create({ userId: "user-1", tenantId: "tenant-1" });

    await repository.saveConnected({
      tenantId: "tenant-1",
      instagramUserId: "25928677863496445",
      instagramProfessionalAccountId: "17841480590934524",
      username: "sixsysma",
      accountType: "BUSINESS",
      encryptedAccessToken: "encrypted-old-token",
      scope: "instagram_business_basic",
      connectedAt: new Date("2024-01-01T00:00:00Z"),
      tokenExpiresAt: undefined
    });

    const result = await callback.execute({
      code: "valid-code",
      state
    });

    expect(result.tenantId).toBe("tenant-1");
    expect(result.instagramConnectionId).toBe("conn-1");

    const connection = await repository.findByTenantId("tenant-1");
    expect(connection).not.toBeNull();
    expect(connection?.instagramUserId).toBe("25928677863496445");
    expect(connection?.instagramProfessionalAccountId).toBe("17841480590934524");
  });

  it("nulls professionalAccountId when reconnecting a different Instagram account", async () => {
    await repository.saveConnected({
      tenantId: "tenant-1",
      instagramUserId: "25928677863496445",
      instagramProfessionalAccountId: "17841480590934524",
      username: "sixsysma",
      accountType: "BUSINESS",
      encryptedAccessToken: "encrypted-old-token",
      scope: "instagram_business_basic",
      connectedAt: new Date("2024-01-01T00:00:00Z"),
      tokenExpiresAt: undefined
    });

    const differentProvider = {
      buildAuthorizationUrl(): string {
        return "https://instagram.com/oauth/authorize?state=test";
      },
      async exchangeAuthorizationCode(): Promise<{ accessToken: string; expiresInSeconds: number; scope: string }> {
        return {
          accessToken: "long-lived-token",
          expiresInSeconds: 5184000,
          scope: "instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages"
        };
      },
      async refreshAccessToken(): Promise<never> {
        throw new Error("Not implemented");
      },
      async revokeAuthorization(): Promise<void> {},
      async listAccounts(): Promise<{ accounts: BusinessProfileAccount[] }> {
        return { accounts: [] };
      },
      async listLocations(): Promise<{ locations: BusinessProfileLocation[] }> {
        return { locations: [] };
      },
      async listReviews(): Promise<{ reviews: BusinessReview[]; averageRating: number; totalReviewCount: number }> {
        return { reviews: [], averageRating: 0, totalReviewCount: 0 };
      },
      async getUserProfile(): Promise<{ id: string; username: string; account_type: string }> {
        return {
          id: "999999999",
          username: "newaccount",
          account_type: "BUSINESS"
        };
      },
      async resolveWebhookAccountId(): Promise<{ id: string; username?: string; accountType?: string }> {
        return { id: "999999999" };
      }
    };

    const differentState = await stateStore.create({ userId: "user-1", tenantId: "tenant-1" });

    const differentCallback = new CompleteInstagramOAuthCallback({
      provider: differentProvider,
      stateStore,
      tokenCipher,
      instagramConnectionRepository: repository,
      now: () => new Date("2024-01-01T00:00:00Z"),
      logger: console
    });

    const result = await differentCallback.execute({
      code: "valid-code",
      state: differentState
    });

    expect(result.tenantId).toBe("tenant-1");

    const connection = await repository.findByTenantId("tenant-1");
    expect(connection).not.toBeNull();
    expect(connection?.instagramUserId).toBe("999999999");
    expect(connection?.instagramProfessionalAccountId).toBeNull();
  });

  it("fails with invalid state", async () => {
    await expect(
      callback.execute({
        code: "valid-code",
        state: "invalid-state"
      })
    ).rejects.toMatchObject({
      code: "INSTAGRAM_INVALID_STATE"
    });
  });
});