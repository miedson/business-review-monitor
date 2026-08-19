import type {
  MetaWebhookEntry,
  MetaWebhookChange,
  MetaWebhookCommentValue
} from "@brm/review-monitoring";
import type { NormalizedInstagramComment } from "@brm/review-monitoring";

export interface InstagramCommentWebhookNormalizer {
  normalize(
    entry: MetaWebhookEntry,
    change: MetaWebhookChange
  ): NormalizedInstagramComment | null;
}

export class DefaultInstagramCommentWebhookNormalizer
  implements InstagramCommentWebhookNormalizer
{
  normalize(
    entry: MetaWebhookEntry,
    change: MetaWebhookChange
  ): NormalizedInstagramComment | null {
    if (change.field !== "comments") {
      return null;
    }

    const value = change.value as MetaWebhookCommentValue;

    const commentId = value.comment_id;
    if (!commentId) {
      return null;
    }

    const instagramAccountId = entry.id;

    const mediaId = value.media_id;
    const from = value.from;
    const createdTime = value.created_time;
    const text = value.text;

    return {
      externalCommentId: commentId,
      externalMediaId: mediaId ?? undefined,
      instagramAccountId,
      authorExternalId: from?.id ?? undefined,
      authorUsername: from?.username ?? undefined,
      text: text ?? undefined,
      createdAtExternal: createdTime ? new Date(createdTime * 1000) : undefined,
      rawEventId: entry.id
    };
  }
}