import { describe, expect, it } from "vitest";

import type {
  BusinessProfileReviewProvider,
  ListBusinessProfileAccountsResult,
  ListBusinessProfileLocationsResult,
  ListBusinessReviewsResult,
  ProviderTokenSet,
  RefreshProviderAccessTokenInput,
} from "../ports/business-profile-review-provider.js";
import type { GoogleConnectionRepository } from "../ports/google-connection-repository.js";
import { GoogleBusinessProfileProviderError } from "../ports/review-provider-error.js";
import type { TokenCipher } from "../ports/token-cipher.js";
import { ListGoogleLocations } from "./list-google-locations.js";

type GoogleConnectionRecord = Awaited<ReturnType<GoogleConnectionRepository["findByTenantId"]>>;

class FakeGoogleConnectionRepository implements GoogleConnectionRepository {
  constructor(private readonly connection: GoogleConnectionRecord) {}

  async findByTenantId(): Promise<GoogleConnectionRecord> {
    return this.connection;
  }

  async saveConnected(): Promise<NonNullable<GoogleConnectionRecord>> {
    throw new Error("Not implemented for this test.");
  }
}

class FakeTokenCipher implements TokenCipher {
  encrypt(): string {
    throw new Error("Not implemented for this test.");
  }

  decrypt(value: string): string {
    return `decrypted:${value}`;
  }
}

class FakeBusinessProfileProvider implements BusinessProfileReviewProvider {
  refreshTokenInput?: RefreshProviderAccessTokenInput;
  locationsInput?: Parameters<BusinessProfileReviewProvider["listLocations"]>[0];

  buildAuthorizationUrl(): string {
    throw new Error("Not implemented for this test.");
  }

  async exchangeAuthorizationCode(): Promise<ProviderTokenSet> {
    throw new Error("Not implemented for this test.");
  }

  async refreshAccessToken(input: RefreshProviderAccessTokenInput): Promise<ProviderTokenSet> {
    this.refreshTokenInput = input;

    return {
      accessToken: "access-token",
      expiresInSeconds: 3600,
      scope: "https://www.googleapis.com/auth/business.manage",
    };
  }

  async revokeAuthorization(): Promise<void> {
    throw new Error("Not implemented for this test.");
  }

  async listAccounts(): Promise<ListBusinessProfileAccountsResult> {
    throw new Error("Not implemented for this test.");
  }

  async listLocations(
    input: Parameters<BusinessProfileReviewProvider["listLocations"]>[0],
  ): Promise<ListBusinessProfileLocationsResult> {
    this.locationsInput = input;

    return {
      locations: [
        {
          id: "locations/2001",
          accountId: input.accountId,
          name: "BRM Matriz",
        },
      ],
      nextPageToken: "next-page",
    };
  }

  async listReviews(): Promise<ListBusinessReviewsResult> {
    throw new Error("Not implemented for this test.");
  }
}

describe("ListGoogleLocations", () => {
  it("refreshes the access token and lists locations for the connected tenant", async () => {
    const provider = new FakeBusinessProfileProvider();
    const useCase = new ListGoogleLocations({
      googleConnectionRepository: new FakeGoogleConnectionRepository({
        id: "connection-1",
        tenantId: "tenant-1",
        encryptedRefreshToken: "encrypted-refresh-token",
        scope: "https://www.googleapis.com/auth/business.manage",
        status: "CONNECTED",
      }),
      provider,
      tokenCipher: new FakeTokenCipher(),
    });

    const result = await useCase.execute({
      tenantId: "tenant-1",
      accountId: "accounts/1001",
      pageToken: "page-2",
    });

    expect(provider.refreshTokenInput).toEqual({
      refreshToken: "decrypted:encrypted-refresh-token",
    });
    expect(provider.locationsInput).toEqual({
      accessToken: "access-token",
      accountId: "accounts/1001",
      pageToken: "page-2",
    });
    expect(result.locations).toHaveLength(1);
    expect(result.nextPageToken).toBe("next-page");
  });

  it("requires an active Google connection", async () => {
    const useCase = new ListGoogleLocations({
      googleConnectionRepository: new FakeGoogleConnectionRepository(null),
      provider: new FakeBusinessProfileProvider(),
      tokenCipher: new FakeTokenCipher(),
    });

    await expect(
      useCase.execute({
        tenantId: "tenant-1",
        accountId: "accounts/1001",
      }),
    ).rejects.toBeInstanceOf(GoogleBusinessProfileProviderError);
  });
});
