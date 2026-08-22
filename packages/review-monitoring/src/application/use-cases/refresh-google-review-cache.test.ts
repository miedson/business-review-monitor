import { describe, expect, it, vi } from "vitest";

import type {
  BusinessLocationRepository,
  FindBusinessLocationByGoogleIdsInput,
  MarkBusinessLocationSyncedInput,
  StoredBusinessLocation,
} from "../ports/business-location-repository.js";
import type {
  BusinessProfileReviewProvider,
  ListBusinessProfileAccountsResult,
  ListBusinessProfileLocationsResult,
  ListBusinessReviewsResult,
  ProviderTokenSet,
  RefreshProviderAccessTokenInput,
} from "../ports/business-profile-review-provider.js";
import type { GoogleConnectionRepository } from "../ports/google-connection-repository.js";
import type {
  CacheBusinessReviewInput,
  ReviewCacheRepository,
} from "../ports/review-cache-repository.js";
import { GoogleBusinessProfileProviderError } from "../ports/review-provider-error.js";
import type { TokenCipher } from "../ports/token-cipher.js";
import { RefreshGoogleReviewCache } from "./refresh-google-review-cache.js";

type GoogleConnectionRecord = Awaited<ReturnType<GoogleConnectionRepository["findByTenantId"]>>;

class FakeBusinessLocationRepository implements BusinessLocationRepository {
  findInput?: FindBusinessLocationByGoogleIdsInput;
  syncedInput?: MarkBusinessLocationSyncedInput;

  constructor(private readonly location: StoredBusinessLocation | null) {}

  async findByGoogleIds(
    input: FindBusinessLocationByGoogleIdsInput,
  ): Promise<StoredBusinessLocation | null> {
    this.findInput = input;

    return this.location;
  }

  async markSynced(input: MarkBusinessLocationSyncedInput): Promise<void> {
    this.syncedInput = input;
  }
}

class FakeGoogleConnectionRepository implements GoogleConnectionRepository {
  constructor(private readonly connection: GoogleConnectionRecord) {}

  async findByTenantId(): Promise<GoogleConnectionRecord> {
    return this.connection;
  }

  async saveConnected(): Promise<NonNullable<GoogleConnectionRecord>> {
    throw new Error("Not implemented for this test.");
  }
}

class FakeReviewCacheRepository implements ReviewCacheRepository {
  upsertedReviews: CacheBusinessReviewInput[] = [];

  async upsertMany(reviews: CacheBusinessReviewInput[]): Promise<void> {
    this.upsertedReviews = reviews;
  }

  async listValidByLocation(): Promise<never> {
    throw new Error("Not implemented for this test.");
  }

  async deleteExpired(): Promise<number> {
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

  async listLocations(): Promise<ListBusinessProfileLocationsResult> {
    throw new Error("Not implemented for this test.");
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
          updatedAt: new Date("2026-08-02T10:00:00.000Z"),
        },
      ],
      averageRating: 4.8,
      totalReviewCount: 128,
    };
  }
}

describe("RefreshGoogleReviewCache", () => {
  it("caches Google reviews for seven days for a tenant location", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T12:00:00.000Z"));

    try {
      const provider = new FakeBusinessProfileProvider();
      const reviewCacheRepository = new FakeReviewCacheRepository();
      const businessLocationRepository = new FakeBusinessLocationRepository({
        id: "business-location-1",
        tenantId: "tenant-1",
        googleAccountId: "accounts/1001",
        googleLocationId: "locations/2001",
        name: "BRM Matriz",
        isActive: true,
      });
      const useCase = new RefreshGoogleReviewCache({
        businessLocationRepository,
        googleConnectionRepository: new FakeGoogleConnectionRepository({
          id: "connection-1",
          tenantId: "tenant-1",
          encryptedRefreshToken: "encrypted-refresh-token",
          scope: "https://www.googleapis.com/auth/business.manage",
          status: "CONNECTED",
        }),
        provider,
        reviewCacheRepository,
        tokenCipher: new FakeTokenCipher(),
      });

      await useCase.execute({
        tenantId: "tenant-1",
        accountId: "accounts/1001",
        locationId: "locations/2001",
        pageToken: "page-2",
      });

      expect(businessLocationRepository.findInput).toEqual({
        tenantId: "tenant-1",
        googleAccountId: "accounts/1001",
        googleLocationId: "locations/2001",
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
      expect(reviewCacheRepository.upsertedReviews).toEqual([
        {
          tenantId: "tenant-1",
          businessLocationId: "business-location-1",
          googleReviewId: "review-1",
          reviewerName: "Maria",
          starRating: "FIVE",
          comment: "Excelente atendimento",
          reviewCreatedAt: new Date("2026-08-01T10:00:00.000Z"),
          reviewUpdatedAt: new Date("2026-08-02T10:00:00.000Z"),
          cachedAt: new Date("2026-08-15T12:00:00.000Z"),
          expiresAt: new Date("2026-08-22T12:00:00.000Z"),
        },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects cache refresh when the location is not owned by the tenant", async () => {
    const useCase = new RefreshGoogleReviewCache({
      businessLocationRepository: new FakeBusinessLocationRepository(null),
      googleConnectionRepository: new FakeGoogleConnectionRepository(null),
      provider: new FakeBusinessProfileProvider(),
      reviewCacheRepository: new FakeReviewCacheRepository(),
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
});
