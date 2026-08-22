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
import { ListGoogleReviews } from "./list-google-reviews.js";

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
  reviewsInput?: Parameters<BusinessProfileReviewProvider["listReviews"]>[0];
  availableLocationIds = ["locations/2001"];

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
    return {
      locations: this.availableLocationIds.map((id) => ({
        id,
        accountId: input.accountId,
        name: id,
      })),
    };
  }

  async listReviews(
    input: Parameters<BusinessProfileReviewProvider["listReviews"]>[0],
  ): Promise<ListBusinessReviewsResult> {
    this.reviewsInput = input;

    return {
      reviews: [
        {
          id: "review-1",
          reviewerName: "Maria",
          starRating: "FIVE",
          comment: "Excelente atendimento",
          createdAt: new Date("2026-08-01T10:00:00.000Z"),
          updatedAt: new Date("2026-08-01T10:00:00.000Z"),
        },
      ],
      averageRating: 4.8,
      totalReviewCount: 128,
      nextPageToken: "next-page",
    };
  }
}

describe("ListGoogleReviews", () => {
  it("refreshes the access token and lists reviews for the connected tenant", async () => {
    const provider = new FakeBusinessProfileProvider();
    const useCase = new ListGoogleReviews({
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
      locationId: "locations/2001",
      pageToken: "page-2",
    });

    expect(provider.refreshTokenInput).toEqual({
      refreshToken: "decrypted:encrypted-refresh-token",
    });
    expect(provider.reviewsInput).toEqual({
      accessToken: "access-token",
      accountId: "accounts/1001",
      locationId: "locations/2001",
      pageToken: "page-2",
    });
    expect(result.averageRating).toBe(4.8);
    expect(result.totalReviewCount).toBe(128);
    expect(result.reviews).toHaveLength(1);
  });

  it("requires an active Google connection", async () => {
    const useCase = new ListGoogleReviews({
      googleConnectionRepository: new FakeGoogleConnectionRepository(null),
      provider: new FakeBusinessProfileProvider(),
      tokenCipher: new FakeTokenCipher(),
    });

    await expect(
      useCase.execute({
        tenantId: "tenant-1",
        accountId: "accounts/1001",
        locationId: "locations/2001",
      }),
    ).rejects.toBeInstanceOf(GoogleBusinessProfileProviderError);
  });

  it("does not query a location that is unavailable to the tenant connection", async () => {
    const provider = new FakeBusinessProfileProvider();
    provider.availableLocationIds = ["locations/tenant-b"];
    const useCase = new ListGoogleReviews({
      googleConnectionRepository: new FakeGoogleConnectionRepository({
        id: "connection-b",
        tenantId: "tenant-b",
        encryptedRefreshToken: "encrypted",
        scope: "scope",
        status: "CONNECTED",
      }),
      provider,
      tokenCipher: new FakeTokenCipher(),
    });

    await expect(
      useCase.execute({
        tenantId: "tenant-b",
        accountId: "accounts/1",
        locationId: "locations/tenant-a",
      }),
    ).rejects.toMatchObject({ code: "GOOGLE_LOCATION_NOT_FOUND" });
    expect(provider.reviewsInput).toBeUndefined();
  });
});
