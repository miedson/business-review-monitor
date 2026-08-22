export type InstagramConversationDirection = "inbound" | "outbound";

export type InstagramMessageDirection = "INBOUND" | "OUTBOUND";

export type InstagramMessageStatus = "SENT" | "DELIVERED" | "READ" | "FAILED";

export type InstagramConversation = {
  id: string;
  tenantId: string;
  instagramConnectionId: string;
  participantExternalId: string;
  participantUsername: string | null;
  participantName: string | null;
  participantProfilePictureUrl: string | null;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type InstagramMessage = {
  id: string;
  tenantId: string;
  instagramConversationId: string;
  externalMessageId: string;
  senderExternalId: string;
  recipientExternalId: string;
  direction: InstagramMessageDirection;
  text: string | null;
  sentAtExternal: Date | null;
  status: InstagramMessageStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type NormalizedInstagramMessage = {
  instagramAccountId: string;
  externalMessageId: string;
  senderExternalId: string;
  recipientExternalId: string;
  direction: InstagramMessageDirection;
  text: string | undefined;
  sentAtExternal: Date | undefined;
};

export type NormalizedInstagramMessageInput = {
  instagramAccountId: string;
  externalMessageId: string;
  senderExternalId: string;
  recipientExternalId: string;
  direction: InstagramMessageDirection;
  text: string | undefined;
  sentAtExternal: Date | undefined;
};

export function createNormalizedInstagramMessage(
  input: NormalizedInstagramMessageInput,
): NormalizedInstagramMessage {
  return {
    instagramAccountId: input.instagramAccountId,
    externalMessageId: input.externalMessageId,
    senderExternalId: input.senderExternalId,
    recipientExternalId: input.recipientExternalId,
    direction: input.direction,
    text: input.text ?? undefined,
    sentAtExternal: input.sentAtExternal ?? undefined,
  };
}
