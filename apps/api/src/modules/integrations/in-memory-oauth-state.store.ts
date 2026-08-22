import { randomBytes } from "node:crypto";

import type { OAuthStateData, OAuthStateStore } from "@brm/review-monitoring";

type StoredOAuthState = OAuthStateData & {
  expiresAt: number;
};

export type InMemoryOAuthStateStoreOptions = {
  ttlMs: number;
  now?: () => number;
};

export class InMemoryOAuthStateStore implements OAuthStateStore {
  private readonly states = new Map<string, StoredOAuthState>();
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(options: InMemoryOAuthStateStoreOptions) {
    this.ttlMs = options.ttlMs;
    this.now = options.now ?? Date.now;
  }

  async create(input: OAuthStateData): Promise<string> {
    this.deleteExpiredStates();

    const state = randomBytes(32).toString("base64url");

    this.states.set(state, {
      ...input,
      expiresAt: this.now() + this.ttlMs,
    });

    return state;
  }

  async consume(state: string): Promise<OAuthStateData | null> {
    const storedState = this.states.get(state);

    if (!storedState) {
      return null;
    }

    this.states.delete(state);

    if (storedState.expiresAt <= this.now()) {
      return null;
    }

    return {
      userId: storedState.userId,
      tenantId: storedState.tenantId,
    };
  }

  private deleteExpiredStates(): void {
    const now = this.now();

    for (const [state, storedState] of this.states.entries()) {
      if (storedState.expiresAt <= now) {
        this.states.delete(state);
      }
    }
  }
}
