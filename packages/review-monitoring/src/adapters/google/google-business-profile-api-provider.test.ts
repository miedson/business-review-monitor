import { describe, expect, it } from "vitest";

import { GoogleBusinessProfileProviderError } from "../../application/ports/review-provider-error.js";
import { GOOGLE_BUSINESS_PROFILE_SCOPE } from "./google-business-profile.constants.js";
import { GoogleBusinessProfileApiProvider } from "./google-business-profile-api-provider.js";

type FetchCall = {
  url: string;
  init: RequestInit | undefined;
};

function createProvider(input: {
  response?: Response;
  calls?: FetchCall[];
} = {}): GoogleBusinessProfileApiProvider {
  const calls = input.calls ?? [];
  const fetchFn: typeof fetch = async (url, init) => {
    calls.push({
      url: String(url),
      init
    });

    return (
      input.response ??
      Response.json({
        access_token: "google-access-token",
        expires_in: 3600,
        refresh_token: "google-refresh-token",
        scope: GOOGLE_BUSINESS_PROFILE_SCOPE
      })
    );
  };

  return new GoogleBusinessProfileApiProvider({
    clientId: "google-client-id",
    clientSecret: "google-client-secret",
    redirectUri: "https://api.example.com/integrations/google/callback",
    authorizationEndpoint: "https://accounts.example.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth.example.com/token",
    revokeEndpoint: "https://oauth.example.com/revoke",
    fetchFn
  });
}

describe("GoogleBusinessProfileApiProvider", () => {
  it("builds the Google OAuth authorization URL for offline consent", () => {
    const provider = createProvider();

    const authorizationUrl = new URL(
      provider.buildAuthorizationUrl({ state: "secure-state" })
    );

    expect(authorizationUrl.origin).toBe("https://accounts.example.com");
    expect(authorizationUrl.searchParams.get("client_id")).toBe("google-client-id");
    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe(
      "https://api.example.com/integrations/google/callback"
    );
    expect(authorizationUrl.searchParams.get("response_type")).toBe("code");
    expect(authorizationUrl.searchParams.get("scope")).toBe(
      GOOGLE_BUSINESS_PROFILE_SCOPE
    );
    expect(authorizationUrl.searchParams.get("access_type")).toBe("offline");
    expect(authorizationUrl.searchParams.get("prompt")).toBe("consent");
    expect(authorizationUrl.searchParams.get("include_granted_scopes")).toBe(
      "true"
    );
    expect(authorizationUrl.searchParams.get("state")).toBe("secure-state");
  });

  it("exchanges an authorization code for a token set", async () => {
    const calls: FetchCall[] = [];
    const provider = createProvider({ calls });

    const tokenSet = await provider.exchangeAuthorizationCode({
      code: "authorization-code"
    });

    expect(tokenSet).toEqual({
      accessToken: "google-access-token",
      expiresInSeconds: 3600,
      refreshToken: "google-refresh-token",
      scope: GOOGLE_BUSINESS_PROFILE_SCOPE
    });
    expect(calls[0]?.url).toBe("https://oauth.example.com/token");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(readRequestBody(calls[0]?.init?.body)).toMatchObject({
      client_id: "google-client-id",
      client_secret: "google-client-secret",
      code: "authorization-code",
      grant_type: "authorization_code",
      redirect_uri: "https://api.example.com/integrations/google/callback"
    });
  });

  it("refreshes an access token without requiring a new refresh token", async () => {
    const calls: FetchCall[] = [];
    const provider = createProvider({
      calls,
      response: Response.json({
        access_token: "new-access-token",
        expires_in: 1800
      })
    });

    const tokenSet = await provider.refreshAccessToken({
      refreshToken: "stored-refresh-token"
    });

    expect(tokenSet).toEqual({
      accessToken: "new-access-token",
      expiresInSeconds: 1800,
      scope: GOOGLE_BUSINESS_PROFILE_SCOPE
    });
    expect(readRequestBody(calls[0]?.init?.body)).toMatchObject({
      client_id: "google-client-id",
      client_secret: "google-client-secret",
      grant_type: "refresh_token",
      refresh_token: "stored-refresh-token"
    });
  });

  it("revokes a refresh token through Google's revoke endpoint", async () => {
    const calls: FetchCall[] = [];
    const provider = createProvider({
      calls,
      response: new Response(null, { status: 200 })
    });

    await provider.revokeAuthorization({
      refreshToken: "stored-refresh-token"
    });

    expect(calls[0]?.url).toBe("https://oauth.example.com/revoke");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(readRequestBody(calls[0]?.init?.body)).toEqual({
      token: "stored-refresh-token"
    });
  });

  it("maps invalid_grant token errors to token revoked", async () => {
    const provider = createProvider({
      response: Response.json({ error: "invalid_grant" }, { status: 400 })
    });

    await expect(
      provider.refreshAccessToken({ refreshToken: "stored-refresh-token" })
    ).rejects.toMatchObject({
      code: "GOOGLE_TOKEN_REVOKED"
    });
  });

  it("rejects invalid token responses", async () => {
    const provider = createProvider({
      response: Response.json({ access_token: "" })
    });

    await expect(
      provider.exchangeAuthorizationCode({ code: "authorization-code" })
    ).rejects.toBeInstanceOf(GoogleBusinessProfileProviderError);
  });
});

function readRequestBody(body: unknown): Record<string, string> {
  if (!(body instanceof URLSearchParams)) {
    return {};
  }

  return Object.fromEntries(body.entries());
}
