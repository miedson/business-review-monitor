import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  InstagramConnectionRepository,
  InstagramReviewProvider,
  StoredInstagramConnection,
  TokenCipher,
} from "@brm/review-monitoring";
import { GoogleBusinessProfileProviderError } from "@brm/review-monitoring";

import { ResolveInstagramWebhookIdentity } from "./resolve-instagram-webhook-identity.js";

class FakeInstagramConnectionRepository implements InstagramConnectionRepository {
  private connectionsByUserId = new Map<string, StoredInstagramConnection>();
  private connectionsByProfessionalAccountId = new Map<string, StoredInstagramConnection>();
  private connectedWithoutProfessionalAccountId: StoredInstagramConnection[] = [];
  private professionalAccountIdUpdates: Array<{
    connectionId: string;
    professionalAccountId: string;
  }> = [];

  setConnection(connection: StoredInstagramConnection): void {
    this.connectionsByUserId.set(connection.instagramUserId, connection);
    if (connection.instagramProfessionalAccountId) {
      this.connectionsByProfessionalAccountId.set(
        connection.instagramProfessionalAccountId,
        connection,
      );
    }
    if (connection.status === "CONNECTED" && !connection.instagramProfessionalAccountId) {
      this.connectedWithoutProfessionalAccountId.push(connection);
    }
  }

  async findByTenantId(): Promise<StoredInstagramConnection | null> {
    return this.connectionsByUserId.values().next().value ?? null;
  }

  async findByInstagramUserId(instagramUserId: string): Promise<StoredInstagramConnection | null> {
    return this.connectionsByUserId.get(instagramUserId) ?? null;
  }

  async findByProfessionalAccountId(
    professionalAccountId: string,
  ): Promise<StoredInstagramConnection | null> {
    return this.connectionsByProfessionalAccountId.get(professionalAccountId) ?? null;
  }

  async findConnectedWithoutProfessionalAccountId(): Promise<StoredInstagramConnection[]> {
    return this.connectedWithoutProfessionalAccountId;
  }

  async saveConnected(): Promise<StoredInstagramConnection> {
    throw new Error("Not implemented in fake");
  }

  async setProfessionalAccountId(input: {
    connectionId: string;
    professionalAccountId: string;
  }): Promise<void> {
    this.professionalAccountIdUpdates.push(input);
  }

  async disconnectByTenantId(): Promise<StoredInstagramConnection | null> {
    throw new Error("Not implemented in fake");
  }

  async deleteByTenantId(): Promise<void> {}

  getProfessionalAccountIdUpdates() {
    return this.professionalAccountIdUpdates;
  }
}

class FakeProvider {
  private scenarios: Array<{
    throwError?: Error;
    returnProfile?: { id: string; username?: string; account_type?: string };
  }> = [];
  private callIndex = 0;
  private defaultReturn = { id: "mock-resolved-id", username: "mock", account_type: "BUSINESS" };
  resolveWebhookAccountId = vi.fn(
    async (): Promise<{ id: string; username?: string; accountType?: string }> => {
      const scenario = this.scenarios[this.callIndex] ?? {};
      this.callIndex++;
      if (scenario.throwError) {
        throw scenario.throwError;
      }
      if (scenario.returnProfile) {
        const result: { id: string; username?: string; accountType?: string } = {
          id: scenario.returnProfile.id,
        };
        if (scenario.returnProfile.username !== undefined) {
          result.username = scenario.returnProfile.username;
        }
        if (scenario.returnProfile.account_type !== undefined) {
          result.accountType = scenario.returnProfile.account_type;
        }
        return result;
      }
      return {
        id: this.defaultReturn.id,
        username: this.defaultReturn.username,
        accountType: this.defaultReturn.account_type,
      };
    },
  );

  setScenarios(
    scenarios: Array<{
      throwError?: Error;
      returnProfile?: { id: string; username?: string; account_type?: string };
    }>,
  ): void {
    this.scenarios = scenarios;
    this.callIndex = 0;
  }

  setDefaultReturn(returnProfile: { id: string; username: string; account_type: string }): void {
    this.defaultReturn = returnProfile;
  }

  buildAuthorizationUrl(): string {
    return "";
  }

  async exchangeAuthorizationCode(): Promise<{
    accessToken: string;
    expiresInSeconds: number;
    scope: string;
  }> {
    return { accessToken: "token", expiresInSeconds: 3600, scope: "instagram_business_basic" };
  }

  async refreshAccessToken(): Promise<{
    accessToken: string;
    expiresInSeconds: number;
    scope: string;
  }> {
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
    return {
      id: "mock-user-id",
      username: "mock",
      account_type: "BUSINESS",
    };
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

describe("ResolveInstagramWebhookIdentity", () => {
  let connectionRepo: FakeInstagramConnectionRepository;
  let provider: FakeProvider;
  let tokenCipher: FakeTokenCipher;
  let useCase: ResolveInstagramWebhookIdentity;

  beforeEach(() => {
    connectionRepo = new FakeInstagramConnectionRepository();
    provider = new FakeProvider();
    tokenCipher = new FakeTokenCipher();
    useCase = new ResolveInstagramWebhookIdentity({
      instagramConnectionRepository: connectionRepo,
      provider: provider as unknown as InstagramReviewProvider,
      tokenCipher,
    });
  });

  it("resolves via fast path when professionalAccountId already mapped", async () => {
    const connection: StoredInstagramConnection = {
      id: "conn_1",
      tenantId: "tenant_1",
      instagramUserId: "25928677863496445",
      instagramProfessionalAccountId: "17841480590934524",
      username: "sixsysma",
      accountType: "BUSINESS",
      encryptedAccessToken: "encrypted:token",
      scope: "instagram_business_basic",
      status: "CONNECTED",
      connectedAt: new Date(),
      disconnectedAt: null,
      tokenExpiresAt: new Date(),
    };
    connectionRepo.setConnection(connection);

    const result = await useCase.execute({
      webhookAccountId: "17841480590934524",
    });

    expect(result).not.toBeNull();
    expect(result!.connection.id).toBe("conn_1");
    expect(result!.resolvedInstagramUserId).toBe("25928677863496445");
    expect(provider.resolveWebhookAccountId).not.toHaveBeenCalled();
  });

  it("discovers connection via Meta API when fast path misses", async () => {
    const connection: StoredInstagramConnection = {
      id: "conn_1",
      tenantId: "tenant_1",
      instagramUserId: "25928677863496445",
      instagramProfessionalAccountId: null,
      username: "sixsysma",
      accountType: "BUSINESS",
      encryptedAccessToken: "encrypted:real-token",
      scope: "instagram_business_basic",
      status: "CONNECTED",
      connectedAt: new Date(),
      disconnectedAt: null,
      tokenExpiresAt: new Date(),
    };
    connectionRepo.setConnection(connection);

    provider.setScenarios([
      {
        returnProfile: { id: "25928677863496445", username: "sixsysma", account_type: "BUSINESS" },
      },
    ]);

    const result = await useCase.execute({
      webhookAccountId: "17841480590934524",
    });

    expect(result).not.toBeNull();
    expect(result!.connection.id).toBe("conn_1");
    expect(result!.resolvedInstagramUserId).toBe("25928677863496445");
    expect(connectionRepo.getProfessionalAccountIdUpdates()).toHaveLength(1);
    expect(connectionRepo.getProfessionalAccountIdUpdates()[0]).toMatchObject({
      connectionId: "conn_1",
      professionalAccountId: "17841480590934524",
    });
  });

  it("returns null when no candidate matches", async () => {
    const connection: StoredInstagramConnection = {
      id: "conn_1",
      tenantId: "tenant_1",
      instagramUserId: "111111",
      instagramProfessionalAccountId: null,
      username: "other",
      accountType: "BUSINESS",
      encryptedAccessToken: "encrypted:token",
      scope: "instagram_business_basic",
      status: "CONNECTED",
      connectedAt: new Date(),
      disconnectedAt: null,
      tokenExpiresAt: new Date(),
    };
    connectionRepo.setConnection(connection);

    provider.setScenarios([
      {
        returnProfile: { id: "25928677863496445", username: "sixsysma", account_type: "BUSINESS" },
      },
    ]);

    const result = await useCase.execute({
      webhookAccountId: "17841480590934524",
    });

    expect(result).toBeNull();
    expect(connectionRepo.getProfessionalAccountIdUpdates()).toHaveLength(0);
  });

  it("continues to next candidate on permission denied", async () => {
    const connectionA: StoredInstagramConnection = {
      id: "conn_a",
      tenantId: "tenant_a",
      instagramUserId: "111111",
      instagramProfessionalAccountId: null,
      username: "user_a",
      accountType: "BUSINESS",
      encryptedAccessToken: "encrypted:token_a",
      scope: "instagram_business_basic",
      status: "CONNECTED",
      connectedAt: new Date(),
      disconnectedAt: null,
      tokenExpiresAt: new Date(),
    };
    const connectionB: StoredInstagramConnection = {
      id: "conn_b",
      tenantId: "tenant_b",
      instagramUserId: "25928677863496445",
      instagramProfessionalAccountId: null,
      username: "sixsysma",
      accountType: "BUSINESS",
      encryptedAccessToken: "encrypted:token_b",
      scope: "instagram_business_basic",
      status: "CONNECTED",
      connectedAt: new Date(),
      disconnectedAt: null,
      tokenExpiresAt: new Date(),
    };
    connectionRepo.setConnection(connectionA);
    connectionRepo.setConnection(connectionB);

    provider.setScenarios([
      {
        throwError: new GoogleBusinessProfileProviderError(
          "INSTAGRAM_PERMISSION_DENIED",
          "Instagram permission denied",
        ),
      },
      {
        returnProfile: { id: "25928677863496445", username: "sixsysma", account_type: "BUSINESS" },
      },
    ]);

    const result = await useCase.execute({
      webhookAccountId: "17841480590934524",
    });

    expect(result).not.toBeNull();
    expect(result!.connection.id).toBe("conn_b");
    expect(connectionRepo.getProfessionalAccountIdUpdates()).toHaveLength(1);
  });

  it("throws on transient API error", async () => {
    const connection: StoredInstagramConnection = {
      id: "conn_1",
      tenantId: "tenant_1",
      instagramUserId: "25928677863496445",
      instagramProfessionalAccountId: null,
      username: "sixsysma",
      accountType: "BUSINESS",
      encryptedAccessToken: "encrypted:token",
      scope: "instagram_business_basic",
      status: "CONNECTED",
      connectedAt: new Date(),
      disconnectedAt: null,
      tokenExpiresAt: new Date(),
    };
    connectionRepo.setConnection(connection);

    provider.setScenarios([
      {
        throwError: new GoogleBusinessProfileProviderError(
          "INSTAGRAM_API_UNAVAILABLE",
          "Instagram API unavailable",
        ),
      },
    ]);

    await expect(useCase.execute({ webhookAccountId: "17841480590934524" })).rejects.toThrow(
      "Instagram API unavailable",
    );
  });

  it("skips candidate with missing encryptedAccessToken", async () => {
    const connection: StoredInstagramConnection = {
      id: "conn_1",
      tenantId: "tenant_1",
      instagramUserId: "25928677863496445",
      instagramProfessionalAccountId: null,
      username: "sixsysma",
      accountType: "BUSINESS",
      encryptedAccessToken: null,
      scope: "instagram_business_basic",
      status: "CONNECTED",
      connectedAt: new Date(),
      disconnectedAt: null,
      tokenExpiresAt: new Date(),
    };
    connectionRepo.setConnection(connection);

    const result = await useCase.execute({
      webhookAccountId: "17841480590934524",
    });

    expect(result).toBeNull();
  });

  it("does not test DISCONNECTED connections", async () => {
    const disconnected: StoredInstagramConnection = {
      id: "conn_1",
      tenantId: "tenant_1",
      instagramUserId: "25928677863496445",
      instagramProfessionalAccountId: null,
      username: "sixsysma",
      accountType: "BUSINESS",
      encryptedAccessToken: "encrypted:token",
      scope: "instagram_business_basic",
      status: "DISCONNECTED",
      connectedAt: new Date(),
      disconnectedAt: new Date(),
      tokenExpiresAt: new Date(),
    };
    connectionRepo.setConnection(disconnected);

    const result = await useCase.execute({
      webhookAccountId: "17841480590934524",
    });

    expect(result).toBeNull();
  });
});
