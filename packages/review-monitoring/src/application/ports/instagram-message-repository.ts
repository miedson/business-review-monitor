import type { InstagramMessage, InstagramMessageStatus } from "../../domain/instagram-message.js";

export type { InstagramMessage, InstagramMessageStatus };

export type SaveInstagramMessageInput = {
  tenantId: string;
  instagramConversationId: string;
  externalMessageId: string;
  senderExternalId: string;
  recipientExternalId: string;
  direction: "INBOUND" | "OUTBOUND";
  text: string | undefined;
  sentAtExternal: Date | undefined;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED" | undefined;
};

export type FindInstagramMessagesInput = {
  tenantId: string;
  instagramConversationId: string;
  limit: number | undefined;
  cursor: string | undefined;
};

export type FindInstagramMessageByIdInput = {
  id: string;
  tenantId: string;
};

export interface InstagramMessageRepository {
  save(input: SaveInstagramMessageInput): Promise<InstagramMessage>;
  findByConversation(input: FindInstagramMessagesInput): Promise<{ messages: InstagramMessage[]; nextCursor: string | null }>;
  findByIdForTenant(input: FindInstagramMessageByIdInput): Promise<InstagramMessage | null>;
  findByExternalId(input: {
    instagramConversationId: string;
    externalMessageId: string;
  }): Promise<InstagramMessage | null>;
  deleteByConnectionId(connectionId: string): Promise<void>;
}
