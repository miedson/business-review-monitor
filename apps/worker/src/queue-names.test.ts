import { describe, expect, it } from "vitest";

import {
  cleanupExpiredReviewCacheJobName,
  googleReviewSyncQueueName,
  maintenanceQueueName,
  syncGoogleReviewsJobName,
} from "./queue-names.js";

describe("queue names", () => {
  it("keeps the initial BullMQ queues explicit and stable", () => {
    expect(googleReviewSyncQueueName).toBe("google-review-sync");
    expect(maintenanceQueueName).toBe("maintenance");
  });

  it("keeps the initial BullMQ job names explicit and stable", () => {
    expect(syncGoogleReviewsJobName).toBe("sync-google-reviews");
    expect(cleanupExpiredReviewCacheJobName).toBe("cleanup-expired-review-cache");
  });
});
