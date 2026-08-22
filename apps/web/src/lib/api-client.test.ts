import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { listGoogleAccounts } from "./api-client";
import { getStoredSession } from "./auth-session";

const authResponse = {
  accessToken: "renewed-access-token",
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
  },
};

describe("API authentication", () => {
  beforeEach(() => {
    const values = new Map<string, string>([
      ["brm.accessToken", "expired-access-token"],
      ["brm.user", JSON.stringify(authResponse.user)],
    ]);

    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refreshes a rejected access token once and retries the request with cookies", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(authResponse), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accounts: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listGoogleAccounts("expired-access-token")).resolves.toEqual({ accounts: [] });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3333/integrations/google/accounts",
      expect.objectContaining({
        credentials: "include",
        headers: { authorization: "Bearer expired-access-token" },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3333/auth/refresh",
      expect.objectContaining({ credentials: "include", method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3333/integrations/google/accounts",
      expect.objectContaining({
        credentials: "include",
        headers: { authorization: "Bearer renewed-access-token" },
      }),
    );
    expect(getStoredSession()).toMatchObject({ accessToken: "renewed-access-token" });
  });
});
