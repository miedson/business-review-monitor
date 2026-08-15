import type { Job } from "bullmq";
import type { ListBusinessReviewsResult } from "@brm/review-monitoring";
import { z } from "zod";
import { logInfo } from "../worker-logger.js";

const syncGoogleReviewsJobDataSchema = z
  .object({
    tenantId: z.string().min(1),
    accountId: z.string().min(1),
    locationId: z.string().min(1),
    pageToken: z.string().min(1).optional()
  })
  .strict();

export type SyncGoogleReviewsJobData = z.infer<
  typeof syncGoogleReviewsJobDataSchema
>;

export type SyncGoogleReviewsUseCase = {
  execute(input: SyncGoogleReviewsJobData): Promise<ListBusinessReviewsResult>;
};

export class SyncGoogleReviewsJob {
  constructor(private readonly useCase: SyncGoogleReviewsUseCase) {}

  async handle(job: Job<unknown>): Promise<void> {
    const parsedData = syncGoogleReviewsJobDataSchema.safeParse(job.data);

    if (!parsedData.success) {
      throw new Error("Invalid sync-google-reviews job data");
    }

    const startedAt = Date.now();
    const result = await this.useCase.execute(parsedData.data);

    logInfo("sync_google_reviews_job_completed", {
      tenantId: parsedData.data.tenantId,
      googleAccountId: parsedData.data.accountId,
      googleLocationId: parsedData.data.locationId,
      jobId: job.id ?? null,
      jobName: job.name,
      reviewCount: result.reviews.length,
      totalReviewCount: result.totalReviewCount,
      hasNextPage: Boolean(result.nextPageToken),
      syncDurationMs: Date.now() - startedAt,
      status: "completed"
    });
  }
}
