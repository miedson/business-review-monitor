import type { InstagramConversation } from "../../domain/instagram-conversation.js";

export type SaveInstagramConversationInput = {
  tenantId: string;
  instagramConnectionId: string;
  participantExternalId: string;
  participantUsername: string | undefined;
  participantName: string | undefined;
  participantProfilePictureUrl: string | undefined;
  lastMessageAt: Date | undefined;
  lastMessagePreview: string | undefined;
  unreadCount: number | undefined;
};

export type UpdateInstagramConversationInput = {
  conversationId: string;
  tenantId: string;
  lastMessageAt: Date | undefined;
  lastMessagePreview: string | undefined;
  unreadCount: number | { increment: number } | undefined;
};

export type FindInstagramConversationsInput = {
  tenantId: string;
  instagramConnectionId: string | undefined;
  limit: number | undefined;
  cursor: string | undefined;
};

export type FindInstagramConversationByIdInput = {
  id: string;
  tenantId: string;
};

export type { InstagramConversation };

export interface InstagramConversationRepository {
  save(input: SaveInstagramConversationInput): Promise<InstagramConversation>;
  update(input: UpdateInstagramConversationInput): Promise<InstagramConversation>;
  findByTenant(
    input: FindInstagramConversationsInput,
  ): Promise<{ conversations: InstagramConversation[]; nextCursor: string | null }>;
  findByIdForTenant(
    input: FindInstagramConversationByIdInput,
  ): Promise<InstagramConversation | null>;
  findByConnectionAndParticipant(input: {
    instagramConnectionId: string;
    participantExternalId: string;
  }): Promise<InstagramConversation | null>;
  incrementUnreadCount(conversationId: string): Promise<InstagramConversation | null>;
  markAsRead(conversationId: string, tenantId: string): Promise<InstagramConversation | null>;
  deleteByConnectionId(connectionId: string): Promise<void>;
}
