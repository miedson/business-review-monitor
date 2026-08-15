import { describe, expect, it, vi } from "vitest";
import type {
  BusinessLocationRepository,
  FindBusinessLocationByGoogleIdsInput,
  StoredBusinessLocation
} from "../ports/business-location-repository.js";
import type {
  ManualSyncRateLimiter,
  ManualSyncRateLimitInput,
  ManualSyncRateLimitResult
} from "../ports/manual-sync-rate-limiter.js";
import type {
  ReviewSyncJobScheduler,
  ScheduleGoogleReviewSyncInput
} from "../ports/review-sync-job-scheduler.js";
import { RequestGoogleReviewSync } from "./request-google-review-sync.js";

describe("RequestGoogleReviewSync", () => {
  it("rate limits by tenant location and schedules the sync job", async () => {
    const locationRepository = new FakeBusinessLocationRepository({
      id: "business-location-1",
      tenantId: "tenant-1",
      googleAccountId: "accounts/1001",
      googleLocationId: "locations/2001",
      name: "Business A",
      isActive: true
    });
    const rateLimiter = new FakeManualSyncRateLimiter({ allowed: true });
    const jobScheduler = new FakeReviewSyncJobScheduler("job-1");

    const result = await new RequestGoogleReviewSync({
      businessLocationRepository: locationRepository,
      rateLimiter,
      jobScheduler
    }).execute({
      tenantId: "tenant-1",
      accountId: "accounts/1001",
      locationId: "locations/2001"
    });

    expect(result).toEqual({ jobId: "job-1" });
    expect(locationRepository.findInput).toEqual({
      tenantId: "tenant-1",
      googleAccountId: "accounts/1001",
      googleLocationId: "locations/2001"
    });
    expect(rateLimiter.input).toEqual({
      tenantId: "tenant-1",
      businessLocationId: "business-location-1",
      windowSeconds: 300
    });
    expect(jobScheduler.input).toEqual({
      tenantId: "tenant-1",
      accountId: "accounts/1001",
      locationId: "locations/2001"
    });
  });

  it("rejects a location outside the tenant", async () => {
    await expect(
      new RequestGoogleReviewSync({
        businessLocationRepository: new FakeBusinessLocationRepository(null),
        rateLimiter: new FakeManualSyncRateLimiter({ allowed: true }),
        jobScheduler: new FakeReviewSyncJobScheduler("job-1")
      }).execute({
        tenantId: "tenant-1",
        accountId: "accounts/1001",
        locationId: "locations/2001"
      })
    ).rejects.toMatchObject({
      code: "GOOGLE_LOCATION_NOT_FOUND"
    });
  });

  it("rejects manual sync inside the rate limit window", async () => {
    const jobScheduler = new FakeReviewSyncJobScheduler("job-1");

    await expect(
      new RequestGoogleReviewSync({
        businessLocationRepository: new FakeBusinessLocationRepository({
          id: "business-location-1",
          tenantId: "tenant-1",
          googleAccountId: "accounts/1001",
          googleLocationId: "locations/2001",
          name: "Business A",
          isActive: true
        }),
        rateLimiter: new FakeManualSyncRateLimiter({
          allowed: false,
          retryAfterSeconds: 120
        }),
        jobScheduler
      }).execute({
        tenantId: "tenant-1",
        accountId: "accounts/1001",
        locationId: "locations/2001"
      })
    ).rejects.toMatchObject({
      code: "GOOGLE_RATE_LIMITED"
    });
    expect(jobScheduler.scheduleGoogleReviewSync).not.toHaveBeenCalled();
  });
});

class FakeBusinessLocationRepository implements BusinessLocationRepository {
  findInput?: FindBusinessLocationByGoogleIdsInput;

  constructor(private readonly location: StoredBusinessLocation | null) {}

  async findByGoogleIds(
    input: FindBusinessLocationByGoogleIdsInput
  ): Promise<StoredBusinessLocation | null> {
    this.findInput = input;
    return this.location;
  }

  async markSynced(): Promise<void> {}
}

class FakeManualSyncRateLimiter implements ManualSyncRateLimiter {
  input?: ManualSyncRateLimitInput;

  constructor(private readonly result: ManualSyncRateLimitResult) {}

  async consume(
    input: ManualSyncRateLimitInput
  ): Promise<ManualSyncRateLimitResult> {
    this.input = input;
    return this.result;
  }
}

class FakeReviewSyncJobScheduler implements ReviewSyncJobScheduler {
  input?: ScheduleGoogleReviewSyncInput;
  scheduleGoogleReviewSync = vi.fn(
    async (
      input: ScheduleGoogleReviewSyncInput
    ): Promise<{ jobId: string }> => {
      this.input = input;
      return { jobId: this.jobId };
    }
  );

  constructor(private readonly jobId: string) {}
}
