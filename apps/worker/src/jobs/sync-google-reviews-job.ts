import type { Job } from "bullmq";
import { z } from "zod";

import type { ListBusinessReviewsResult } from "@brm/review-monitoring";

import { logInfo } from "../worker-logger.js";

const syncGoogleReviewsJobDataSchema = z
  .object({
    tenantId: z.string().min(1),
    accountId: z.string().min(1),
    locationId: z.string().min(1),
    pageToken: z.string().min(1).optional(),
  })
  .strict();

export type SyncGoogleReviewsJobData = z.infer<typeof syncGoogleReviewsJobDataSchema>;

export type SyncGoogleReviewsUseCase = {
  execute(input: SyncGoogleReviewsJobData): Promise<ListBusinessReviewsResult>;
};
type NotificationStore = {
  create(input: {
    tenantId: string;
    type: "GOOGLE_REVIEW";
    title: string;
    body: string;
    resourceType: string;
    resourceId: string;
    dedupeKey: string;
  }): Promise<void>;
};
type RealtimeEventPublisher = {
  publish(event: {
    tenantId: string;
    type: string;
    payload: Record<string, string>;
  }): Promise<void>;
};

export class SyncGoogleReviewsJob {
  constructor(
    private readonly useCase: SyncGoogleReviewsUseCase,
    private readonly notificationStore?: NotificationStore,
    private readonly realtimeEventPublisher?: RealtimeEventPublisher,
  ) {}

  async handle(job: Job<unknown>): Promise<void> {
    const parsedData = syncGoogleReviewsJobDataSchema.safeParse(job.data);

    if (!parsedData.success) {
      throw new Error("Invalid sync-google-reviews job data");
    }

    const startedAt = Date.now();
    const result = await this.useCase.execute(parsedData.data);
    for (const review of result.reviews) {
      await this.notificationStore?.create({
        tenantId: parsedData.data.tenantId,
        type: "GOOGLE_REVIEW",
        title: "Nova avaliação no Google",
        body: review.comment ?? "Uma nova avaliação foi recebida.",
        resourceType: "google-review",
        resourceId: review.id,
        dedupeKey: `google-review:${review.id}`,
      });
    }
    if (result.reviews.length > 0) {
      await this.realtimeEventPublisher?.publish({
        tenantId: parsedData.data.tenantId,
        type: "google.review.created",
        payload: { locationId: parsedData.data.locationId },
      });
    }

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
      status: "completed",
    });
  }
}
