import type { BusinessLocationRepository } from "../ports/business-location-repository.js";
import type { ManualSyncRateLimiter } from "../ports/manual-sync-rate-limiter.js";
import type { ReviewSyncJobScheduler } from "../ports/review-sync-job-scheduler.js";
import { GoogleBusinessProfileProviderError } from "../ports/review-provider-error.js";

const manualSyncWindowSeconds = 5 * 60;

export type RequestGoogleReviewSyncInput = {
  tenantId: string;
  accountId: string;
  locationId: string;
};

export type RequestGoogleReviewSyncResult = {
  jobId: string;
};

export type RequestGoogleReviewSyncDependencies = {
  businessLocationRepository: BusinessLocationRepository;
  rateLimiter: ManualSyncRateLimiter;
  jobScheduler: ReviewSyncJobScheduler;
};

export class RequestGoogleReviewSync {
  constructor(
    private readonly dependencies: RequestGoogleReviewSyncDependencies
  ) {}

  async execute(
    input: RequestGoogleReviewSyncInput
  ): Promise<RequestGoogleReviewSyncResult> {
    const businessLocation =
      await this.dependencies.businessLocationRepository.findByGoogleIds({
        tenantId: input.tenantId,
        googleAccountId: input.accountId,
        googleLocationId: input.locationId
      });

    if (!businessLocation) {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_LOCATION_NOT_FOUND",
        "Google Business Profile location was not found for this tenant."
      );
    }

    const rateLimitResult = await this.dependencies.rateLimiter.consume({
      tenantId: input.tenantId,
      businessLocationId: businessLocation.id,
      windowSeconds: manualSyncWindowSeconds
    });

    if (!rateLimitResult.allowed) {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_RATE_LIMITED",
        "Manual Google review sync is rate limited."
      );
    }

    return this.dependencies.jobScheduler.scheduleGoogleReviewSync({
      tenantId: input.tenantId,
      accountId: input.accountId,
      locationId: input.locationId
    });
  }
}
