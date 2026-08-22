import type { Job } from "bullmq";
import { describe, expect, it, vi } from "vitest";

import { SyncGoogleReviewsJob, type SyncGoogleReviewsUseCase } from "./sync-google-reviews-job.js";

describe("SyncGoogleReviewsJob", () => {
  it("validates job data and refreshes Google reviews", async () => {
    const useCase: SyncGoogleReviewsUseCase = {
      execute: vi.fn().mockResolvedValue({
        reviews: [{ id: "review-1" }, { id: "review-2" }],
        averageRating: 4.8,
        totalReviewCount: 128,
      }),
    };
    const job = createJob({
      tenantId: "tenant-1",
      accountId: "accounts/1001",
      locationId: "locations/2001",
    });

    await new SyncGoogleReviewsJob(useCase).handle(job);

    expect(useCase.execute).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accountId: "accounts/1001",
      locationId: "locations/2001",
    });
  });

  it("rejects invalid job data", async () => {
    const useCase: SyncGoogleReviewsUseCase = {
      execute: vi.fn(),
    };
    const job = createJob({
      tenantId: "tenant-1",
      accountId: "",
      locationId: "locations/2001",
    });

    await expect(new SyncGoogleReviewsJob(useCase).handle(job)).rejects.toThrow(
      "Invalid sync-google-reviews job data",
    );
    expect(useCase.execute).not.toHaveBeenCalled();
  });
});

function createJob(data: unknown): Job<unknown> {
  return {
    data,
    id: "job-1",
    name: "sync-google-reviews",
  } as Job<unknown>;
}
