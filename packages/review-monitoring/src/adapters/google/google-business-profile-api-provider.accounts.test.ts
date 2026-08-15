import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleBusinessProfileApiProvider } from "./google-business-profile-api-provider.js";

describe("GoogleBusinessProfileApiProvider accounts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists accounts through the current Account Management API", async () => {
    const fetchMock = vi.fn(
      async (_url: string | URL, _init?: RequestInit): Promise<Response> => {
        void _url;
        void _init;

        return new Response(
        JSON.stringify({
          accounts: [
            {
              name: "accounts/1001",
              accountName: "Matriz BRM"
            },
            {
              name: "accounts/1002"
            }
          ],
          nextPageToken: "next-page"
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      );
      }
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GoogleBusinessProfileApiProvider({
      clientId: "google-client-id",
      clientSecret: "google-client-secret",
      redirectUri: "http://localhost:3333/integrations/google/callback"
    });

    const result = await provider.listAccounts({
      accessToken: "access-token",
      pageToken: "page-2"
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];

    expect(String(url)).toBe(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageToken=page-2"
    );
    expect(init).toMatchObject({
      headers: {
        Authorization: "Bearer access-token",
        Accept: "application/json"
      }
    });
    expect(result).toEqual({
      accounts: [
        {
          id: "accounts/1001",
          name: "accounts/1001",
          accountName: "Matriz BRM"
        },
        {
          id: "accounts/1002",
          name: "accounts/1002"
        }
      ],
      nextPageToken: "next-page"
    });
  });
});
