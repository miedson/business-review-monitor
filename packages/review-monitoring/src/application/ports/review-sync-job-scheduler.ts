export type ScheduleGoogleReviewSyncInput = {
  tenantId: string;
  accountId: string;
  locationId: string;
};

export type ScheduleGoogleReviewSyncResult = {
  jobId: string;
};

export interface ReviewSyncJobScheduler {
  scheduleGoogleReviewSync(
    input: ScheduleGoogleReviewSyncInput
  ): Promise<ScheduleGoogleReviewSyncResult>;
}
