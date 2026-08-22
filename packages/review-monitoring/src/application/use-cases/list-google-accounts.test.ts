import { describe, expect, it } from "vitest";

import type {
  BusinessProfileReviewProvider,
  ListBusinessProfileAccountsInput,
  ListBusinessProfileAccountsResult,
  ListBusinessProfileLocationsResult,
  ListBusinessReviewsResult,
  ProviderAuthorizationUrlInput,
  ProviderTokenSet,
  RefreshProviderAccessTokenInput,
} from "../ports/business-profile-review-provider.js";
import type {
  GoogleConnectionRepository,
  SaveConnectedGoogleConnectionInput,
  StoredGoogleConnection,
} from "../ports/google-connection-repository.js";
import { GoogleBusinessProfileProviderError } from "../ports/review-provider-error.js";
import { ListGoogleAccounts } from "./list-google-accounts.js";

class FakeGoogleConnectionRepository implements GoogleConnectionRepository {
  constructor(private connection: StoredGoogleConnection | null) {}

  async findByTenantId(): Promise<StoredGoogleConnection | null> {
    return this.connection;
  }

  async saveConnected(input: SaveConnectedGoogleConnectionInput): Promise<StoredGoogleConnection> {
    this.connection = {
      id: "google-connection-1",
      tenantId: input.tenantId,
      encryptedRefreshToken: input.encryptedRefreshToken,
      scope: input.scope,
      status: "CONNECTED",
    };

    return this.connection;
  }
}

class FakeBusinessProfileReviewProvider implements BusinessProfileReviewProvider {
  refreshToken?: string;
  listAccountsInput?: ListBusinessProfileAccountsInput;

  buildAuthorizationUrl(input: ProviderAuthorizationUrlInput): string {
    return `https://accounts.example.com?state=${input.state}`;
  }

  async exchangeAuthorizationCode(): Promise<ProviderTokenSet> {
    return {
      accessToken: "access-token",
      expiresInSeconds: 3600,
      scope: "https://www.googleapis.com/auth/business.manage",
    };
  }

  async refreshAccessToken(input: RefreshProviderAccessTokenInput): Promise<ProviderTokenSet> {
    this.refreshToken = input.refreshToken;

    return {
      accessToken: "refreshed-access-token",
      expiresInSeconds: 3600,
      scope: "https://www.googleapis.com/auth/business.manage",
    };
  }

  async revokeAuthorization(): Promise<void> {}

  async listAccounts(
    input: ListBusinessProfileAccountsInput,
  ): Promise<ListBusinessProfileAccountsResult> {
    this.listAccountsInput = input;

    return {
      accounts: [
        {
          id: "accounts/1001",
          name: "accounts/1001",
          username: "Matriz BRM",
          accountName: "Matriz BRM",
        },
      ],
      nextPageToken: "next-page",
    };
  }

  async listLocations(): Promise<ListBusinessProfileLocationsResult> {
    return { locations: [] };
  }

  async listReviews(): Promise<ListBusinessReviewsResult> {
    return { reviews: [] };
  }
}

describe("ListGoogleAccounts", () => {
  it("refreshes an access token and lists accounts for a connected tenant", async () => {
    const provider = new FakeBusinessProfileReviewProvider();
    const useCase = new ListGoogleAccounts({
      googleConnectionRepository: new FakeGoogleConnectionRepository({
        id: "google-connection-1",
        tenantId: "tenant-1",
        encryptedRefreshToken: "encrypted-refresh-token",
        scope: "https://www.googleapis.com/auth/business.manage",
        status: "CONNECTED",
      }),
      provider,
      tokenCipher: {
        encrypt: (value) => value,
        decrypt: () => "decrypted-refresh-token",
      },
    });

    const result = await useCase.execute({
      tenantId: "tenant-1",
      pageToken: "page-2",
    });

    expect(provider.refreshToken).toBe("decrypted-refresh-token");
    expect(provider.listAccountsInput).toEqual({
      accessToken: "refreshed-access-token",
      pageToken: "page-2",
    });
    expect(result.accounts).toHaveLength(1);
    expect(result.nextPageToken).toBe("next-page");
  });

  it("requires a connected Google authorization", async () => {
    const useCase = new ListGoogleAccounts({
      googleConnectionRepository: new FakeGoogleConnectionRepository(null),
      provider: new FakeBusinessProfileReviewProvider(),
      tokenCipher: {
        encrypt: (value) => value,
        decrypt: (value) => value,
      },
    });

    await expect(useCase.execute({ tenantId: "tenant-1" })).rejects.toMatchObject({
      code: "GOOGLE_AUTH_REQUIRED",
    } satisfies Partial<GoogleBusinessProfileProviderError>);
  });
});
