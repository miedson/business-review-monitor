import type {
  MetaWebhookEntry,
  MetaWebhookMessaging
} from "@brm/review-monitoring";
import type { NormalizedInstagramMessage } from "@brm/review-monitoring";
import { createNormalizedInstagramMessage } from "@brm/review-monitoring";

export interface InstagramMessageWebhookNormalizer {
  normalize(
    entry: MetaWebhookEntry,
    messaging: MetaWebhookMessaging
  ): NormalizedInstagramMessage | null;
}

export class DefaultInstagramMessageWebhookNormalizer
  implements InstagramMessageWebhookNormalizer
{
  normalize(
    entry: MetaWebhookEntry,
    messaging: MetaWebhookMessaging
  ): NormalizedInstagramMessage | null {
    const message = messaging.message;
    const externalMessageId = message?.id ?? message?.mid;
    if (!message || !externalMessageId) {
      return null;
    }

    const instagramAccountId = entry.id;
    const senderId = messaging.sender.id;
    const recipientId = messaging.recipient.id;

    const text = message.text;

    const timestamp = messaging.timestamp;
    const sentAtExternal = timestamp ? new Date(timestamp) : undefined;

    const direction: "INBOUND" | "OUTBOUND" = senderId === instagramAccountId ? "OUTBOUND" : "INBOUND";

    return createNormalizedInstagramMessage({
      instagramAccountId,
      externalMessageId,
      senderExternalId: senderId,
      recipientExternalId: recipientId,
      direction,
      text: text ?? undefined,
      sentAtExternal
    });
  }
}
