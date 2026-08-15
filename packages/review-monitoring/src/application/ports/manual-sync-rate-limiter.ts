export type ManualSyncRateLimitInput = {
  tenantId: string;
  businessLocationId: string;
  windowSeconds: number;
};

export type ManualSyncRateLimitResult =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      retryAfterSeconds: number;
    };

export interface ManualSyncRateLimiter {
  consume(input: ManualSyncRateLimitInput): Promise<ManualSyncRateLimitResult>;
}
