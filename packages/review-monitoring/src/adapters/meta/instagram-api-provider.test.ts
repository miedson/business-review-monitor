import { describe, expect, it } from "vitest";

import { InstagramApiProvider } from "./instagram-api-provider.js";
import { INSTAGRAM_SCOPE_STRING } from "./instagram.constants.js";

describe("InstagramApiProvider", () => {
  it("builds an Instagram Login authorization URL", () => {
    const provider = new InstagramApiProvider({
      appId: "instagram-app-id",
      appSecret: "instagram-app-secret",
      redirectUri: "https://api.example.com/integrations/instagram/callback",
      graphApiVersion: "v21.0",
    });

    const authorizationUrl = new URL(provider.buildAuthorizationUrl({ state: "secure-state" }));

    expect(authorizationUrl.origin).toBe("https://www.instagram.com");
    expect(authorizationUrl.pathname).toBe("/oauth/authorize");
    expect(authorizationUrl.searchParams.get("client_id")).toBe("instagram-app-id");
    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe(
      "https://api.example.com/integrations/instagram/callback",
    );
    expect(authorizationUrl.searchParams.get("response_type")).toBe("code");
    expect(authorizationUrl.searchParams.get("scope")).toBe(INSTAGRAM_SCOPE_STRING);
    expect(authorizationUrl.searchParams.get("state")).toBe("secure-state");
  });
});
