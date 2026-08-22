import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  InstagramConversation,
  InstagramMessage,
  NormalizedInstagramMessage,
  StoredInstagramConnection,
} from "@brm/review-monitoring";

import { ProcessInstagramDirectMessage } from "./process-instagram-direct-message.js";

type ConversationRepoMock = {
  findByConnectionAndParticipant: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  findByTenant: ReturnType<typeof vi.fn>;
  findByIdForTenant: ReturnType<typeof vi.fn>;
  incrementUnreadCount: ReturnType<typeof vi.fn>;
  markAsRead: ReturnType<typeof vi.fn>;
  deleteByConnectionId: ReturnType<typeof vi.fn>;
};

type MessageRepoMock = {
  save: ReturnType<typeof vi.fn>;
  findByConversation: ReturnType<typeof vi.fn>;
  findByIdForTenant: ReturnType<typeof vi.fn>;
  findByExternalId: ReturnType<typeof vi.fn>;
  markOutboundMessagesAsRead: ReturnType<typeof vi.fn>;
  deleteByConnectionId: ReturnType<typeof vi.fn>;
};

function createConversationRepoMock(): ConversationRepoMock {
  return {
    findByConnectionAndParticipant: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue({
      id: "conv_1",
      tenantId: "tenant_1",
      instagramConnectionId: "conn_1",
      participantExternalId: "participant_1",
      participantUsername: "participant_1",
      participantName: "participant_1",
      participantProfilePictureUrl: null,
      lastMessageAt: new Date(),
      lastMessagePreview: "Hello",
      unreadCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as InstagramConversation),
    update: vi.fn().mockResolvedValue({
      id: "conv_1",
      tenantId: "tenant_1",
      instagramConnectionId: "conn_1",
      participantExternalId: "participant_1",
      participantUsername: "participant_1",
      participantName: "participant_1",
      participantProfilePictureUrl: null,
      lastMessageAt: new Date(),
      lastMessagePreview: "Hello",
      unreadCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as InstagramConversation),
    findByTenant: vi.fn().mockResolvedValue({ conversations: [], nextCursor: null }),
    findByIdForTenant: vi.fn().mockResolvedValue(null),
    incrementUnreadCount: vi.fn().mockResolvedValue(null),
    markAsRead: vi.fn().mockResolvedValue(null),
    deleteByConnectionId: vi.fn().mockResolvedValue(undefined),
  };
}

function createMessageRepoMock(): MessageRepoMock {
  return {
    save: vi.fn().mockResolvedValue({
      id: "msg_1",
      tenantId: "tenant_1",
      instagramConversationId: "conv_1",
      externalMessageId: "msg_ext_1",
      senderExternalId: "sender_1",
      recipientExternalId: "recipient_1",
      direction: "INBOUND",
      text: "Hello",
      sentAtExternal: new Date(),
      status: "DELIVERED",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as InstagramMessage),
    findByConversation: vi.fn().mockResolvedValue({ messages: [], nextCursor: null }),
    findByIdForTenant: vi.fn().mockResolvedValue(null),
    findByExternalId: vi.fn().mockResolvedValue(null),
    markOutboundMessagesAsRead: vi.fn().mockResolvedValue(0),
    deleteByConnectionId: vi.fn().mockResolvedValue(undefined),
  };
}

describe("ProcessInstagramDirectMessage", () => {
  let conversationRepo: ConversationRepoMock;
  let messageRepo: MessageRepoMock;
  let useCase: ProcessInstagramDirectMessage;

  beforeEach(() => {
    conversationRepo = createConversationRepoMock();
    messageRepo = createMessageRepoMock();
    useCase = new ProcessInstagramDirectMessage({
      instagramConversationRepository: conversationRepo,
      instagramMessageRepository: messageRepo,
    });
  });

  it("creates conversation and message for new inbound message", async () => {
    const connection: StoredInstagramConnection = {
      id: "conn_1",
      tenantId: "tenant_1",
      instagramUserId: "user_1",
      instagramProfessionalAccountId: "prof_1",
      username: "test",
      accountType: "BUSINESS",
      encryptedAccessToken: "encrypted:token",
      scope: "instagram_business_basic",
      status: "CONNECTED",
      connectedAt: new Date(),
      disconnectedAt: null,
      tokenExpiresAt: new Date(),
    };

    const normalizedMessage: NormalizedInstagramMessage = {
      instagramAccountId: "prof_1",
      externalMessageId: "msg_ext_1",
      senderExternalId: "sender_1",
      recipientExternalId: "recipient_1",
      direction: "INBOUND",
      text: "Hello",
      sentAtExternal: new Date(),
    };

    const result = await useCase.execute({ connection, normalizedMessage });

    expect(result.isNew).toBe(true);
    expect(result.conversationId).toBe("conv_1");
    expect(result.messageId).toBe("msg_1");
  });

  it("ignores duplicate messages idempotently", async () => {
    const connection: StoredInstagramConnection = {
      id: "conn_1",
      tenantId: "tenant_1",
      instagramUserId: "user_1",
      instagramProfessionalAccountId: "prof_1",
      username: "test",
      accountType: "BUSINESS",
      encryptedAccessToken: "encrypted:token",
      scope: "instagram_business_basic",
      status: "CONNECTED",
      connectedAt: new Date(),
      disconnectedAt: null,
      tokenExpiresAt: new Date(),
    };

    messageRepo.findByExternalId.mockResolvedValue({
      id: "msg_1",
      tenantId: "tenant_1",
      instagramConversationId: "conv_1",
      externalMessageId: "msg_ext_1",
      senderExternalId: "sender_1",
      recipientExternalId: "recipient_1",
      direction: "INBOUND",
      text: "Hello",
      sentAtExternal: new Date(),
      status: "DELIVERED",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as InstagramMessage);

    conversationRepo.findByConnectionAndParticipant.mockResolvedValue({
      id: "conv_1",
      tenantId: "tenant_1",
      instagramConnectionId: "conn_1",
      participantExternalId: "sender_1",
      participantUsername: "sender_1",
      participantName: "sender_1",
      participantProfilePictureUrl: null,
      lastMessageAt: new Date(),
      lastMessagePreview: "Hello",
      unreadCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as InstagramConversation);

    const normalizedMessage: NormalizedInstagramMessage = {
      instagramAccountId: "prof_1",
      externalMessageId: "msg_ext_1",
      senderExternalId: "sender_1",
      recipientExternalId: "recipient_1",
      direction: "INBOUND",
      text: "Hello",
      sentAtExternal: new Date(),
    };

    const result = await useCase.execute({ connection, normalizedMessage });

    expect(result.isNew).toBe(false);
    expect(result.messageId).toBe("msg_1");
  });
});
