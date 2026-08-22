"use client";

import type { AuthUser } from "./api-client";

const accessTokenStorageKey = "brm.accessToken";
const userStorageKey = "brm.user";

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

export function getStoredSession(): AuthSession | null {
  const accessToken = window.localStorage.getItem(accessTokenStorageKey);
  const userPayload = window.localStorage.getItem(userStorageKey);

  if (!accessToken || !userPayload) {
    return null;
  }

  try {
    return {
      accessToken,
      user: JSON.parse(userPayload) as AuthUser,
    };
  } catch {
    clearStoredSession();
    return null;
  }
}

export function storeSession(session: AuthSession): void {
  window.localStorage.setItem(accessTokenStorageKey, session.accessToken);
  window.localStorage.setItem(userStorageKey, JSON.stringify(session.user));
}

export function clearStoredSession(): void {
  window.localStorage.removeItem(accessTokenStorageKey);
  window.localStorage.removeItem(userStorageKey);
}
