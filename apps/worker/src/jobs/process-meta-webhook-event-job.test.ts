import { describe, it, expect, beforeEach } from "vitest";
import { ProcessMetaWebhookEventJob } from "./process-meta-webhook-event-job.js";
import type { StoredInstagramConnection } from "@brm/review-monitoring";
import type { InstagramCommentRepository, UpsertInstagramCommentInput } from "@brm/review-monitoring";
import type { InstagramCommentWebhookNormalizer } from "@brm/review-monitoring";
import type { NormalizedInstagramComment } from "@brm/review-monitoring";
import type { Job } from "bullmq";
import type { ProcessMetaWebhookEventJobData } from "./process-meta-webhook-event-job.js";

class FakeInstagramConnectionRepository {
  private connections: Map<string, StoredInstagramConnection> = new Map();

  setConnection(connection: StoredInstagramConnection): void {
    this.connections.set(connection.instagramUserId, connection);
  }

  async findByInstagramUserId(instagramUserId: string): Promise<StoredInstagramConnection | null> {
    return this.connections.get(instagramUserId) ?? null;
  }
}

class FakeInstagramCommentRepository implements InstagramCommentRepository {
  upserted: UpsertInstagramCommentInput[] = [];

  async upsert(input: UpsertInstagramCommentInput): Promise<{
    id: string;
    tenantId: string;
    instagramConnectionId: string;
    externalCommentId: string;
    externalMediaId: string | null;
    authorExternalId: string | null;
    authorUsername: string | null;
    text: string | null;
    createdAtExternal: Date | null;
    status: "NEW" | "READ";
    createdAt: Date;
    updatedAt: Date;
  }> {
    this.upserted.push(input);
    return {
      id: `comment_${this.upserted.length}`,
      tenantId: input.tenantId,
      instagramConnectionId: input.instagramConnectionId,
      externalCommentId: input.externalCommentId,
      externalMediaId: input.externalMediaId ?? null,
      authorExternalId: input.authorExternalId ?? null,
      authorUsername: input.authorUsername ?? null,
      text: input.text ?? null,
      createdAtExternal: input.createdAtExternal ?? null,
      status: input.status ?? "NEW",
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async findByTenant(): Promise<never[]> {
    return [];
  }

  async findByIdForTenant(): Promise<null> {
    return null;
  }
}

class FakeNormalizer implements InstagramCommentWebhookNormalizer {
  result: NormalizedInstagramComment | null = null;

  normalize(): NormalizedInstagramComment | null {
    return this.result;
  }
}

describe("ProcessMetaWebhookEventJob - comments", () => {
  let connectionRepo: FakeInstagramConnectionRepository;
  let commentRepo: FakeInstagramCommentRepository;
  let normalizer: FakeNormalizer;
  let job: ProcessMetaWebhookEventJob;

  beforeEach(() => {
    connectionRepo = new FakeInstagramConnectionRepository();
    commentRepo = new FakeInstagramCommentRepository();
    normalizer = new FakeNormalizer();
    job = new ProcessMetaWebhookEventJob(connectionRepo, commentRepo, normalizer);
  });

  const createJobData = (overrides: Partial<ProcessMetaWebhookEventJobData> = {}): ProcessMetaWebhookEventJobData => ({
    payload: {
      object: "instagram",
      entry: [
        {
          id: "instagram_account_123",
          time: 1700000000,
          changes: [
            {
              field: "comments",
              value: {
                comment_id: "comment_789",
                media_id: "media_456",
                from: { id: "user_111", username: "testuser" },
                created_time: 1700000000,
                text: "Great post!"
              }
            }
          ]
        }
      ]
    },
    receivedAt: new Date().toISOString(),
    requestId: "123e4567-e89b-12d3-a456-426614174000",
    ...overrides
  });

  it("processes comment and persists it", async () => {
    const connection: StoredInstagramConnection = {
      id: "conn_1",
      tenantId: "tenant_1",
      instagramUserId: "instagram_account_123",
      username: "testaccount",
      accountType: "BUSINESS",
      encryptedAccessToken: "encrypted_token",
      scope: "instagram_basic,instagram_manage_comments",
      status: "CONNECTED",
      tokenExpiresAt: new Date(Date.now() + 86400000)
    };
    connectionRepo.setConnection(connection);

    normalizer.result = {
      externalCommentId: "comment_789",
      externalMediaId: "media_456",
      instagramAccountId: "instagram_account_123",
      authorExternalId: "user_111",
      authorUsername: "testuser",
      text: "Great post!",
      createdAtExternal: new Date(1700000000 * 1000),
      rawEventId: "instagram_account_123"
    };

    const mockJob = { id: "job_1", name: "process-meta-webhook-event", data: createJobData() } as unknown as Job<ProcessMetaWebhookEventJobData>;

    await job.handle(mockJob);

    expect(commentRepo.upserted).toHaveLength(1);
    expect(commentRepo.upserted[0]!).toMatchObject({
      tenantId: "tenant_1",
      instagramConnectionId: "conn_1",
      externalCommentId: "comment_789",
      externalMediaId: "media_456",
      authorExternalId: "user_111",
      authorUsername: "testuser",
      text: "Great post!",
      status: "NEW"
    });
  });

  it("does not persist when connection not found", async () => {
    normalizer.result = {
      externalCommentId: "comment_789",
      externalMediaId: "media_456",
      instagramAccountId: "unknown_account",
      authorExternalId: "user_111",
      authorUsername: "testuser",
      text: "Great post!",
      createdAtExternal: new Date(1700000000 * 1000),
      rawEventId: "unknown_account"
    };

    const mockJob = { id: "job_1", name: "process-meta-webhook-event", data: createJobData() } as unknown as Job<ProcessMetaWebhookEventJobData>;

    await job.handle(mockJob);

    expect(commentRepo.upserted).toHaveLength(0);
  });

  it("handles duplicate events idempotently", async () => {
    const connection: StoredInstagramConnection = {
      id: "conn_1",
      tenantId: "tenant_1",
      instagramUserId: "instagram_account_123",
      username: "testaccount",
      accountType: "BUSINESS",
      encryptedAccessToken: "encrypted_token",
      scope: "instagram_basic,instagram_manage_comments",
      status: "CONNECTED",
      tokenExpiresAt: new Date(Date.now() + 86400000)
    };
    connectionRepo.setConnection(connection);

    normalizer.result = {
      externalCommentId: "comment_789",
      externalMediaId: "media_456",
      instagramAccountId: "instagram_account_123",
      authorExternalId: "user_111",
      authorUsername: "testuser",
      text: "Great post!",
      createdAtExternal: new Date(1700000000 * 1000),
      rawEventId: "instagram_account_123"
    };

    const mockJob = { id: "job_1", name: "process-meta-webhook-event", data: createJobData() } as unknown as Job<ProcessMetaWebhookEventJobData>;

    await job.handle(mockJob);
    await job.handle(mockJob);

    expect(commentRepo.upserted).toHaveLength(2);
    expect(commentRepo.upserted[0]!.externalCommentId).toBe("comment_789");
    expect(commentRepo.upserted[1]!.externalCommentId).toBe("comment_789");
  });

  it("ignores unsupported event types", async () => {
    normalizer.result = null;

    const mockJob = { id: "job_1", name: "process-meta-webhook-event", data: {
      ...createJobData(),
      payload: {
        object: "instagram",
        entry: [
          {
            id: "instagram_account_123",
            time: 1700000000,
            changes: [
              {
                field: "mentions",
                value: { media_id: "media_456" }
              }
            ]
          }
        ]
      }
    }} as unknown as Job<ProcessMetaWebhookEventJobData>;

    await job.handle(mockJob);

    expect(commentRepo.upserted).toHaveLength(0);
  });

  it("handles normalization failure gracefully", async () => {
    normalizer.result = null;

    const mockJob = { id: "job_1", name: "process-meta-webhook-event", data: createJobData() } as unknown as Job<ProcessMetaWebhookEventJobData>;

    await job.handle(mockJob);

    expect(commentRepo.upserted).toHaveLength(0);
  });
});