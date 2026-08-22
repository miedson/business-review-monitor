import { describe, expect, it } from "vitest";

import type {
  BusinessProfileReviewProvider,
  ProviderTokenSet,
} from "../ports/business-profile-review-provider.js";
import type {
  GoogleConnectionRepository,
  SaveConnectedGoogleConnectionInput,
  StoredGoogleConnection,
} from "../ports/google-connection-repository.js";
import type { OAuthStateData, OAuthStateStore } from "../ports/oauth-state-store.js";
import type { TokenCipher } from "../ports/token-cipher.js";
import { CompleteGoogleOAuthCallback } from "./complete-google-oauth-callback.js";

const connectedAt = new Date("2026-08-13T12:00:00.000Z");

describe("CompleteGoogleOAuthCallback", () => {
  it("exchanges the code and stores an encrypted refresh token", async () => {
    const repository = new FakeGoogleConnectionRepository();
    const useCase = new CompleteGoogleOAuthCallback({
      provider: new FakeProvider({
        accessToken: "access-token",
        expiresInSeconds: 3600,
        refreshToken: "refresh-token",
        scope: "scope",
      }),
      stateStore: new FakeOAuthStateStore({
        userId: "user-1",
        tenantId: "tenant-1",
      }),
      tokenCipher: new FakeTokenCipher(),
      googleConnectionRepository: repository,
      now: () => connectedAt,
    });

    const result = await useCase.execute({
      code: "authorization-code",
      state: "state",
    });

    expect(result).toEqual({
      tenantId: "tenant-1",
      googleConnectionId: "connection-1",
    });
    expect(repository.savedConnection).toMatchObject({
      tenantId: "tenant-1",
      encryptedRefreshToken: "encrypted:refresh-token",
      scope: "scope",
      connectedAt,
    });
  });

  it("keeps the previous encrypted refresh token when Google omits it", async () => {
    const repository = new FakeGoogleConnectionRepository({
      id: "connection-1",
      tenantId: "tenant-1",
      encryptedRefreshToken: "encrypted:previous-refresh-token",
      scope: "scope",
      status: "CONNECTED",
    });
    const useCase = new CompleteGoogleOAuthCallback({
      provider: new FakeProvider({
        accessToken: "access-token",
        expiresInSeconds: 3600,
        scope: "scope",
      }),
      stateStore: new FakeOAuthStateStore({
        userId: "user-1",
        tenantId: "tenant-1",
      }),
      tokenCipher: new FakeTokenCipher(),
      googleConnectionRepository: repository,
      now: () => connectedAt,
    });

    await useCase.execute({
      code: "authorization-code",
      state: "state",
    });

    expect(repository.savedConnection?.encryptedRefreshToken).toBe(
      "encrypted:previous-refresh-token",
    );
  });

  it("rejects invalid or expired state", async () => {
    const useCase = new CompleteGoogleOAuthCallback({
      provider: new FakeProvider({
        accessToken: "access-token",
        expiresInSeconds: 3600,
        refreshToken: "refresh-token",
        scope: "scope",
      }),
      stateStore: new FakeOAuthStateStore(null),
      tokenCipher: new FakeTokenCipher(),
      googleConnectionRepository: new FakeGoogleConnectionRepository(),
      now: () => connectedAt,
    });

    await expect(
      useCase.execute({
        code: "authorization-code",
        state: "state",
      }),
    ).rejects.toMatchObject({
      code: "GOOGLE_INVALID_STATE",
    });
  });
});

class FakeProvider implements BusinessProfileReviewProvider {
  constructor(private readonly tokenSet: ProviderTokenSet) {}

  buildAuthorizationUrl(): string {
    return "https://accounts.example.com";
  }

  async exchangeAuthorizationCode(): Promise<ProviderTokenSet> {
    return this.tokenSet;
  }

  async refreshAccessToken(): Promise<ProviderTokenSet> {
    return this.tokenSet;
  }

  async revokeAuthorization(): Promise<void> {}

  async listAccounts(): Promise<never> {
    throw new Error("Not implemented");
  }

  async listLocations(): Promise<never> {
    throw new Error("Not implemented");
  }

  async listReviews(): Promise<never> {
    throw new Error("Not implemented");
  }
}

class FakeOAuthStateStore implements OAuthStateStore {
  constructor(private readonly stateData: OAuthStateData | null) {}

  async create(): Promise<string> {
    return "state";
  }

  async consume(): Promise<OAuthStateData | null> {
    return this.stateData;
  }
}

class FakeTokenCipher implements TokenCipher {
  encrypt(value: string): string {
    return `encrypted:${value}`;
  }

  decrypt(value: string): string {
    return value.replace("encrypted:", "");
  }
}

class FakeGoogleConnectionRepository implements GoogleConnectionRepository {
  savedConnection: SaveConnectedGoogleConnectionInput | null = null;

  constructor(private readonly existingConnection: StoredGoogleConnection | null = null) {}

  async findByTenantId(): Promise<StoredGoogleConnection | null> {
    return this.existingConnection;
  }

  async saveConnected(input: SaveConnectedGoogleConnectionInput): Promise<StoredGoogleConnection> {
    this.savedConnection = input;

    return {
      id: this.existingConnection?.id ?? "connection-1",
      tenantId: input.tenantId,
      encryptedRefreshToken: input.encryptedRefreshToken,
      scope: input.scope,
      status: "CONNECTED",
    };
  }
}
