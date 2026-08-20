import { describe, it, expect, beforeEach } from "vitest";
import { ProcessInstagramDirectMessage } from "./process-instagram-direct-message.js";
import type { StoredInstagramConnection } from "@brm/review-monitoring";
import type { NormalizedInstagramMessage } from "@brm/review-monitoring";

describe("ProcessInstagramDirectMessage", () => {
  let conversationRepo: {
    findByConnectionAndParticipant: (input: { instagramConnectionId: string; participantExternalId: string }) => Promise<{
      id: string;
      tenantId: string;
      instagramConnectionId: string;
      participantExternalId: string;
      unreadCount: number;
      lastMessageAt: Date | null;
      lastMessagePreview: string | null;
    } | null>;
    save: (input: {
      tenantId: string;
      instagramConnectionId: string;
      participantExternalId: string;
      participantUsername: string | undefined;
      participantName: string | undefined;
      participantProfilePictureUrl: string | undefined;
      lastMessageAt: Date | undefined;
      lastMessagePreview: string | undefined;
      unreadCount: number;
    }) => Promise<{
      id: string;
      tenantId: string;
      instagramConnectionId: string;
      participantExternalId: string;
      unreadCount: number;
      lastMessageAt: Date | null;
      lastMessagePreview: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
    update: (input: {
      conversationId: string;
      tenantId: string;
      lastMessageAt?: Date;
      lastMessagePreview?: string;
      unreadCount?: number | { increment: number };
    }) => Promise<{
      id: string;
      tenantId: string;
      instagramConnectionId: string;
      participantExternalId: string;
      unreadCount: number;
      lastMessageAt: Date | null;
      lastMessagePreview: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
  };
  let messageRepo: {
    findByExternalId: (input: { instagramConversationId: string; externalMessageId: string }) => Promise<{
      id: string;
      tenantId: string;
      instagramConversationId: string;
      externalMessageId: string;
      direction: "INBOUND" | "OUTBOUND";
      senderExternalId: string;
      recipientExternalId: string;
      text: string | null;
      sentAtExternal: Date | null;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    } | null>;
    save: (input: {
      tenantId: string;
      instagramConversationId: string;
      externalMessageId: string;
      senderExternalId: string;
      recipientExternalId: string;
      direction: "INBOUND" | "OUTBOUND";
      text: string | undefined;
      sentAtExternal: Date | undefined;
      status: string;
    }) => Promise<{
      id: string;
      tenantId: string;
      instagramConversationId: string;
      externalMessageId: string;
      direction: "INBOUND" | "OUTBOUND";
      senderExternalId: string;
      recipientExternalId: string;
      text: string | null;
      sentAtExternal: Date | null;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
  };
  let useCase: ProcessInstagramDirectMessage;

  beforeEach(() => {
    conversationRepo = {
      findByConnectionAndParticipant: async () => null,
      save: async () => ({
        id: "conv_1",
        tenantId: "tenant_1",
        instagramConnectionId: "conn_1",
        participantExternalId: "participant_1",
        unreadCount: 1,
        lastMessageAt: new Date(),
        lastMessagePreview: "Hello",
        createdAt: new Date(),
        updatedAt: new Date()
      }),
      update: async () => ({
        id: "conv_1",
        tenantId: "tenant_1",
        instagramConnectionId: "conn_1",
        participantExternalId: "participant_1",
        unreadCount: 1,
        lastMessageAt: new Date(),
        lastMessagePreview: "Hello",
        createdAt: new Date(),
        updatedAt: new Date()
      })
    };
    messageRepo = {
      findByExternalId: async () => null,
      save: async () => ({
        id: "msg_1",
        tenantId: "tenant_1",
        instagramConversationId: "conv_1",
        externalMessageId: "msg_ext_1",
        direction: "INBOUND",
        senderExternalId: "sender_1",
        recipientExternalId: "recipient_1",
        text: "Hello",
        sentAtExternal: new Date(),
        status: "DELIVERED",
        createdAt: new Date(),
        updatedAt: new Date()
      })
    };
    useCase = new ProcessInstagramDirectMessage({
      instagramConversationRepository: conversationRepo,
      instagramMessageRepository: messageRepo
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
      tokenExpiresAt: new Date()
    };

    const normalizedMessage: NormalizedInstagramMessage = {
      instagramAccountId: "prof_1",
      externalMessageId: "msg_ext_1",
      senderExternalId: "sender_1",
      recipientExternalId: "recipient_1",
      direction: "INBOUND",
      text: "Hello",
      sentAtExternal: new Date()
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
      tokenExpiresAt: new Date()
    };

    messageRepo.findByExternalId = async () => ({
      id: "msg_1",
      tenantId: "tenant_1",
      instagramConversationId: "conv_1",
      externalMessageId: "msg_ext_1",
      direction: "INBOUND",
      senderExternalId: "sender_1",
      recipientExternalId: "recipient_1",
      text: "Hello",
      sentAtExternal: new Date(),
      status: "DELIVERED",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const normalizedMessage: NormalizedInstagramMessage = {
      instagramAccountId: "prof_1",
      externalMessageId: "msg_ext_1",
      senderExternalId: "sender_1",
      recipientExternalId: "recipient_1",
      direction: "INBOUND",
      text: "Hello",
      sentAtExternal: new Date()
    };

    const result = await useCase.execute({ connection, normalizedMessage });

    expect(result.isNew).toBe(false);
    expect(result.messageId).toBe("msg_1");
  });
});
