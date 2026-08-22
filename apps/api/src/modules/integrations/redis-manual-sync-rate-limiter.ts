import type { Redis } from "ioredis";

import type {
  ManualSyncRateLimiter,
  ManualSyncRateLimitInput,
  ManualSyncRateLimitResult,
} from "@brm/review-monitoring";

export class RedisManualSyncRateLimiter implements ManualSyncRateLimiter {
  constructor(private readonly redis: Redis) {}

  async consume(input: ManualSyncRateLimitInput): Promise<ManualSyncRateLimitResult> {
    const key = `manual-sync:google-reviews:${input.tenantId}:${input.businessLocationId}`;
    const result = await this.redis.set(key, "1", "EX", input.windowSeconds, "NX");

    if (result === "OK") {
      return { allowed: true };
    }

    const ttl = await this.redis.ttl(key);

    return {
      allowed: false,
      retryAfterSeconds: ttl > 0 ? ttl : input.windowSeconds,
    };
  }
}
