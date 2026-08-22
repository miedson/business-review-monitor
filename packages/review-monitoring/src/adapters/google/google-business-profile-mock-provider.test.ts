import { describe, expect, it } from "vitest";

import type { BusinessProfileReviewProvider } from "../../application/ports/business-profile-review-provider.js";
import { GoogleBusinessProfileProviderError } from "../../application/ports/review-provider-error.js";
import { GoogleBusinessProfileMockProvider } from "./google-business-profile-mock-provider.js";
import { GOOGLE_BUSINESS_PROFILE_SCOPE } from "./google-business-profile.constants.js";

describe("GoogleBusinessProfileMockProvider", () => {
  it("implements the review provider port", () => {
    const provider: BusinessProfileReviewProvider = new GoogleBusinessProfileMockProvider();

    expect(provider).toBeDefined();
  });

  it("builds an OAuth authorization URL with offline access and state", () => {
    const provider = new GoogleBusinessProfileMockProvider({
      authorizationBaseUrl: "https://mock.example/oauth",
      redirectUri: "https://api.example/integrations/google/callback",
    });

    const authorizationUrl = new URL(provider.buildAuthorizationUrl({ state: "secure-state" }));

    expect(authorizationUrl.origin).toBe("https://mock.example");
    expect(authorizationUrl.searchParams.get("response_type")).toBe("code");
    expect(authorizationUrl.searchParams.get("scope")).toBe(GOOGLE_BUSINESS_PROFILE_SCOPE);
    expect(authorizationUrl.searchParams.get("access_type")).toBe("offline");
    expect(authorizationUrl.searchParams.get("prompt")).toBe("consent");
    expect(authorizationUrl.searchParams.get("state")).toBe("secure-state");
  });

  it("exchanges an authorization code for access and refresh tokens", async () => {
    const provider = new GoogleBusinessProfileMockProvider();

    const tokenSet = await provider.exchangeAuthorizationCode({
      code: "mock-code",
    });

    expect(tokenSet.accessToken).toBe("mock-access-token");
    expect(tokenSet.refreshToken).toBe("mock-refresh-token");
    expect(tokenSet.scope).toBe(GOOGLE_BUSINESS_PROFILE_SCOPE);
  });

  it("refreshes access tokens without returning a new refresh token", async () => {
    const provider = new GoogleBusinessProfileMockProvider();

    const tokenSet = await provider.refreshAccessToken({
      refreshToken: "mock-refresh-token",
    });

    expect(tokenSet.accessToken).toBe("mock-access-token");
    expect(tokenSet.refreshToken).toBeUndefined();
  });

  it("lists accounts and locations with pagination", async () => {
    const provider = new GoogleBusinessProfileMockProvider({ pageSize: 1 });

    const firstAccountsPage = await provider.listAccounts({
      accessToken: "mock-access-token",
    });
    expect(firstAccountsPage.nextPageToken).toBeDefined();

    const secondAccountsPage = await provider.listAccounts({
      accessToken: "mock-access-token",
      pageToken: firstAccountsPage.nextPageToken ?? "",
    });
    const firstLocationsPage = await provider.listLocations({
      accessToken: "mock-access-token",
      accountId: "accounts/1001",
    });

    expect(firstAccountsPage.accounts).toHaveLength(1);
    expect(firstAccountsPage.nextPageToken).toBe("1");
    expect(secondAccountsPage.accounts).toHaveLength(1);
    expect(firstLocationsPage.locations).toHaveLength(1);
    expect(firstLocationsPage.nextPageToken).toBe("1");
  });

  it("lists reviews with pagination and summary", async () => {
    const provider = new GoogleBusinessProfileMockProvider({ pageSize: 2 });

    const firstPage = await provider.listReviews({
      accessToken: "mock-access-token",
      accountId: "accounts/1001",
      locationId: "locations/2001",
    });
    expect(firstPage.nextPageToken).toBeDefined();

    const secondPage = await provider.listReviews({
      accessToken: "mock-access-token",
      accountId: "accounts/1001",
      locationId: "locations/2001",
      pageToken: firstPage.nextPageToken ?? "",
    });

    expect(firstPage.reviews).toHaveLength(2);
    expect(firstPage.nextPageToken).toBe("2");
    expect(firstPage.averageRating).toBe(3.7);
    expect(firstPage.totalReviewCount).toBe(3);
    expect(secondPage.reviews).toHaveLength(1);
  });

  it("can simulate no businesses found", async () => {
    const provider = new GoogleBusinessProfileMockProvider({
      scenario: "no-businesses",
    });

    const result = await provider.listAccounts({
      accessToken: "mock-access-token",
    });

    expect(result.accounts).toEqual([]);
  });

  it("can simulate a revoked refresh token", async () => {
    const provider = new GoogleBusinessProfileMockProvider({
      scenario: "refresh-token-invalid",
    });

    await expect(
      provider.refreshAccessToken({ refreshToken: "mock-refresh-token" }),
    ).rejects.toMatchObject({
      code: "GOOGLE_TOKEN_REVOKED",
    });
  });

  it("can simulate rate limiting", async () => {
    const provider = new GoogleBusinessProfileMockProvider({
      scenario: "rate-limited",
    });

    await expect(provider.listAccounts({ accessToken: "mock-access-token" })).rejects.toMatchObject(
      {
        code: "GOOGLE_RATE_LIMITED",
      },
    );
  });

  it("can simulate an unavailable API", async () => {
    const provider = new GoogleBusinessProfileMockProvider({
      scenario: "api-unavailable",
    });

    await expect(provider.listAccounts({ accessToken: "mock-access-token" })).rejects.toMatchObject(
      {
        code: "GOOGLE_API_UNAVAILABLE",
      },
    );
  });

  it("can simulate an expired access token", async () => {
    const provider = new GoogleBusinessProfileMockProvider({
      scenario: "token-expired",
    });

    await expect(provider.listAccounts({ accessToken: "mock-access-token" })).rejects.toMatchObject(
      {
        code: "GOOGLE_AUTH_REQUIRED",
      },
    );
  });

  it("can simulate an unverified location", async () => {
    const provider = new GoogleBusinessProfileMockProvider({
      scenario: "location-not-verified",
    });

    await expect(
      provider.listReviews({
        accessToken: "mock-access-token",
        accountId: "accounts/1001",
        locationId: "locations/2001",
      }),
    ).rejects.toMatchObject({
      code: "GOOGLE_LOCATION_NOT_VERIFIED",
    });
  });

  it("rejects invalid callbacks", async () => {
    const provider = new GoogleBusinessProfileMockProvider();

    await expect(provider.exchangeAuthorizationCode({ code: "" })).rejects.toBeInstanceOf(
      GoogleBusinessProfileProviderError,
    );
  });
});
