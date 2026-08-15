import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleBusinessProfileApiProvider } from "./google-business-profile-api-provider.js";

const provider = new GoogleBusinessProfileApiProvider({
  clientId: "google-client-id",
  clientSecret: "google-client-secret",
  redirectUri: "http://localhost:3333/integrations/google/callback"
});

describe("GoogleBusinessProfileApiProvider listReviews", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the Google reviews API and normalizes reviews", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          reviews: [
            {
              reviewId: "review-1",
              reviewer: {
                displayName: "Maria"
              },
              starRating: "FIVE",
              comment: "Excelente atendimento",
              createTime: "2026-08-01T10:00:00.000Z",
              updateTime: "2026-08-02T10:00:00.000Z"
            }
          ],
          averageRating: 4.8,
          totalReviewCount: 128,
          nextPageToken: "next-page"
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      )
    );

    const result = await provider.listReviews({
      accessToken: "access-token",
      accountId: "accounts/1001",
      locationId: "locations/2001",
      pageToken: "page-2"
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://mybusiness.googleapis.com/v4/accounts/1001/locations/2001/reviews?pageSize=50&pageToken=page-2"
    );
    expect(init).toMatchObject({
      headers: {
        Authorization: "Bearer access-token",
        Accept: "application/json"
      }
    });
    expect(result).toEqual({
      reviews: [
        {
          id: "review-1",
          reviewerName: "Maria",
          starRating: "FIVE",
          comment: "Excelente atendimento",
          createdAt: new Date("2026-08-01T10:00:00.000Z"),
          updatedAt: new Date("2026-08-02T10:00:00.000Z")
        }
      ],
      averageRating: 4.8,
      totalReviewCount: 128,
      nextPageToken: "next-page"
    });
  });
});
