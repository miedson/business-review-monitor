import { describe, it, expect } from "vitest";
import { DefaultInstagramCommentWebhookNormalizer } from "@brm/review-monitoring";
import type { MetaWebhookEntry, MetaWebhookChange } from "@brm/review-monitoring";

describe("DefaultInstagramCommentWebhookNormalizer", () => {
  const normalizer = new DefaultInstagramCommentWebhookNormalizer();

  const createEntry = (overrides: Partial<MetaWebhookEntry> = {}): MetaWebhookEntry => ({
    id: "instagram_account_123",
    time: 1700000000,
    changes: [],
    ...overrides
  });

  const createChange = (value: Record<string, unknown>, field = "comments"): MetaWebhookChange => ({
    field,
    value
  });

  it("normalizes a valid comment payload", () => {
    const entry = createEntry();
    const change = createChange({
      media_id: "media_456",
      comment_id: "comment_789",
      from: { id: "user_111", username: "testuser" },
      created_time: 1700000000,
      text: "Great post!"
    });

    const result = normalizer.normalize(entry, change);

    expect(result).not.toBeNull();
    expect(result?.externalCommentId).toBe("comment_789");
    expect(result?.externalMediaId).toBe("media_456");
    expect(result?.instagramAccountId).toBe("instagram_account_123");
    expect(result?.authorExternalId).toBe("user_111");
    expect(result?.authorUsername).toBe("testuser");
    expect(result?.text).toBe("Great post!");
    expect(result?.createdAtExternal).toEqual(new Date(1700000000 * 1000));
    expect(result?.rawEventId).toBe("instagram_account_123");
  });

  it("handles missing optional fields", () => {
    const entry = createEntry();
    const change = createChange({
      comment_id: "comment_789",
      from: { id: "user_111" }
    });

    const result = normalizer.normalize(entry, change);

    expect(result).not.toBeNull();
    expect(result?.externalCommentId).toBe("comment_789");
    expect(result?.externalMediaId).toBeUndefined();
    expect(result?.authorUsername).toBeUndefined();
    expect(result?.text).toBeUndefined();
    expect(result?.createdAtExternal).toBeUndefined();
  });

  it("returns null for non-comment field", () => {
    const entry = createEntry();
    const change = createChange({
      media_id: "media_456",
      comment_id: "comment_789"
    }, "mentions");

    const result = normalizer.normalize(entry, change);

    expect(result).toBeNull();
  });

  it("returns null when comment_id is missing", () => {
    const entry = createEntry();
    const change = createChange({
      media_id: "media_456",
      from: { id: "user_111" }
    });

    const result = normalizer.normalize(entry, change);

    expect(result).toBeNull();
  });

  it("handles payload without 'from' field", () => {
    const entry = createEntry();
    const change = createChange({
      comment_id: "comment_789",
      text: "Comment without author"
    });

    const result = normalizer.normalize(entry, change);

    expect(result).not.toBeNull();
    expect(result?.externalCommentId).toBe("comment_789");
    expect(result?.authorExternalId).toBeUndefined();
    expect(result?.authorUsername).toBeUndefined();
  });
});