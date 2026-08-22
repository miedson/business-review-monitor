import { afterEach, describe, expect, it, vi } from "vitest";

import { GoogleBusinessProfileApiProvider } from "./google-business-profile-api-provider.js";

const provider = new GoogleBusinessProfileApiProvider({
  clientId: "google-client-id",
  clientSecret: "google-client-secret",
  redirectUri: "http://localhost:3333/integrations/google/callback",
});

describe("GoogleBusinessProfileApiProvider listLocations", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the Business Information API and normalizes locations", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          locations: [
            {
              name: "locations/2001",
              title: "BRM Matriz",
              storeCode: "BRM-001",
              metadata: {
                hasVoiceOfMerchant: true,
              },
            },
          ],
          nextPageToken: "next-page",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const result = await provider.listLocations({
      accessToken: "access-token",
      accountId: "accounts/1001",
      pageToken: "page-2",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://mybusinessbusinessinformation.googleapis.com/v1/accounts/1001/locations?readMask=name%2Ctitle%2CstoreCode%2Cmetadata&pageToken=page-2",
    );
    expect(init).toMatchObject({
      headers: {
        Authorization: "Bearer access-token",
        Accept: "application/json",
      },
    });
    expect(result).toEqual({
      locations: [
        {
          id: "locations/2001",
          accountId: "accounts/1001",
          name: "BRM Matriz",
          storeCode: "BRM-001",
          isVerified: true,
        },
      ],
      nextPageToken: "next-page",
    });
  });
});
