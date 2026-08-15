import type { Job } from "bullmq";
import { z } from "zod";

import type { CleanupExpiredReviewCache } from "@brm/review-monitoring";

import { logInfo } from "../worker-logger.js";

const cleanupExpiredReviewCacheJobDataSchema = z.object({}).passthrough();

export class CleanupExpiredReviewCacheJob {
  constructor(private readonly useCase: CleanupExpiredReviewCache) {}

  async handle(job: Job<unknown>): Promise<void> {
    const parsedData = cleanupExpiredReviewCacheJobDataSchema.safeParse(job.data);

    if (!parsedData.success) {
      throw new Error("Invalid cleanup-expired-review-cache job data");
    }

    const result = await this.useCase.execute();

    logInfo("cleanup_expired_review_cache_job_completed", {
      deletedCount: result.deletedCount,
      jobId: String(job.id),
      jobName: job.name
    });
  }
}
