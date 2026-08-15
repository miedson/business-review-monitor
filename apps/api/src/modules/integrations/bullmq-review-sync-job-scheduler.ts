import { Queue } from "bullmq";
import type {
  ReviewSyncJobScheduler,
  ScheduleGoogleReviewSyncInput,
  ScheduleGoogleReviewSyncResult
} from "@brm/review-monitoring";

export const googleReviewSyncQueueName = "google-review-sync";
export const syncGoogleReviewsJobName = "sync-google-reviews";

export class BullMqReviewSyncJobScheduler implements ReviewSyncJobScheduler {
  constructor(
    private readonly queue: Queue<ScheduleGoogleReviewSyncInput>
  ) {}

  async scheduleGoogleReviewSync(
    input: ScheduleGoogleReviewSyncInput
  ): Promise<ScheduleGoogleReviewSyncResult> {
    const job = await this.queue.add(syncGoogleReviewsJobName, input);

    return {
      jobId: String(job.id)
    };
  }
}
