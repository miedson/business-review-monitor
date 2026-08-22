import { describe, expect, it } from "vitest";

import { DefaultInstagramCommentWebhookNormalizer } from "@brm/review-monitoring";
import type { MetaWebhookChange, MetaWebhookEntry } from "@brm/review-monitoring";

describe("DefaultInstagramCommentWebhookNormalizer", () => {
  const normalizer = new DefaultInstagramCommentWebhookNormalizer();

  const createEntry = (overrides: Partial<MetaWebhookEntry> = {}): MetaWebhookEntry => ({
    id: "instagram_account_123",
    time: 1700000000,
    changes: [],
    ...overrides,
  });

  const createChange = (value: Record<string, unknown>, field = "comments"): MetaWebhookChange => ({
    field,
    value,
  });

  it("normalizes a valid comment payload (test format)", () => {
    const entry = createEntry();
    const change = createChange({
      media_id: "media_456",
      comment_id: "comment_789",
      from: { id: "user_111", username: "testuser" },
      created_time: 1700000000,
      text: "Great post!",
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

  it("normalizes a valid comment payload (real Meta format)", () => {
    const entry = createEntry();
    const change = createChange({
      id: "comment_789",
      media: { id: "media_456" },
      from: { id: "user_111", username: "testuser" },
      text: "Real comment from Meta",
    });

    const result = normalizer.normalize(entry, change);

    expect(result).not.toBeNull();
    expect(result?.externalCommentId).toBe("comment_789");
    expect(result?.externalMediaId).toBe("media_456");
    expect(result?.instagramAccountId).toBe("instagram_account_123");
    expect(result?.authorExternalId).toBe("user_111");
    expect(result?.authorUsername).toBe("testuser");
    expect(result?.text).toBe("Real comment from Meta");
    expect(result?.createdAtExternal).toBeUndefined();
    expect(result?.rawEventId).toBe("instagram_account_123");
  });

  it("normalizes real format with media as string", () => {
    const entry = createEntry();
    const change = createChange({
      id: "comment_789",
      media: "media_456",
      from: { id: "user_111" },
      text: "Comment with string media",
    });

    const result = normalizer.normalize(entry, change);

    expect(result).not.toBeNull();
    expect(result?.externalCommentId).toBe("comment_789");
    expect(result?.externalMediaId).toBe("media_456");
    expect(result?.authorExternalId).toBe("user_111");
    expect(result?.authorUsername).toBeUndefined();
    expect(result?.text).toBe("Comment with string media");
    expect(result?.createdAtExternal).toBeUndefined();
  });

  it("handles missing optional fields", () => {
    const entry = createEntry();
    const change = createChange({
      comment_id: "comment_789",
      from: { id: "user_111" },
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
    const change = createChange(
      {
        media_id: "media_456",
        comment_id: "comment_789",
      },
      "mentions",
    );

    const result = normalizer.normalize(entry, change);

    expect(result).toBeNull();
  });

  it("returns null when comment_id is missing", () => {
    const entry = createEntry();
    const change = createChange({
      media_id: "media_456",
      from: { id: "user_111" },
    });

    const result = normalizer.normalize(entry, change);

    expect(result).toBeNull();
  });

  it("returns null when id is missing in real format", () => {
    const entry = createEntry();
    const change = createChange({
      media: { id: "media_456" },
      from: { id: "user_111" },
    });

    const result = normalizer.normalize(entry, change);

    expect(result).toBeNull();
  });

  it("handles payload without 'from' field", () => {
    const entry = createEntry();
    const change = createChange({
      comment_id: "comment_789",
      text: "Comment without author",
    });

    const result = normalizer.normalize(entry, change);

    expect(result).not.toBeNull();
    expect(result?.externalCommentId).toBe("comment_789");
    expect(result?.authorExternalId).toBeUndefined();
    expect(result?.authorUsername).toBeUndefined();
  });

  it("handles real format without 'from' field", () => {
    const entry = createEntry();
    const change = createChange({
      id: "comment_789",
      media: { id: "media_456" },
      text: "Real comment without author",
    });

    const result = normalizer.normalize(entry, change);

    expect(result).not.toBeNull();
    expect(result?.externalCommentId).toBe("comment_789");
    expect(result?.externalMediaId).toBe("media_456");
    expect(result?.authorExternalId).toBeUndefined();
    expect(result?.authorUsername).toBeUndefined();
    expect(result?.text).toBe("Real comment without author");
  });
});
