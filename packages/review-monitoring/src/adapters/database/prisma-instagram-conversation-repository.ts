import type { PrismaClient } from "@brm/database";

import type {
  InstagramConversationRepository,
  SaveInstagramConversationInput,
  UpdateInstagramConversationInput,
  FindInstagramConversationsInput,
  FindInstagramConversationByIdInput,
  InstagramConversation
} from "../../application/ports/instagram-conversation-repository.js";

export class PrismaInstagramConversationRepository
  implements InstagramConversationRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async save(input: SaveInstagramConversationInput): Promise<InstagramConversation> {
    const conversation = await this.prisma.instagramConversation.create({
      data: {
        tenantId: input.tenantId,
        instagramConnectionId: input.instagramConnectionId,
        participantExternalId: input.participantExternalId,
        participantUsername: input.participantUsername ?? null,
        participantName: input.participantName ?? null,
        participantProfilePictureUrl: input.participantProfilePictureUrl ?? null,
        lastMessageAt: input.lastMessageAt ?? null,
        lastMessagePreview: input.lastMessagePreview ?? null,
        unreadCount: input.unreadCount ?? 0
      }
    });

    return this.mapToDomain(conversation);
  }

  async update(input: UpdateInstagramConversationInput): Promise<InstagramConversation> {
    const data: Record<string, unknown> = {};

    if (input.lastMessageAt !== undefined) data.lastMessageAt = input.lastMessageAt;
    if (input.lastMessagePreview !== undefined) data.lastMessagePreview = input.lastMessagePreview;
    if (input.unreadCount !== undefined) data.unreadCount = input.unreadCount;

    const conversation = await this.prisma.instagramConversation.update({
      where: { id: input.conversationId },
      data
    });

    return this.mapToDomain(conversation);
  }

  async findByTenant(input: FindInstagramConversationsInput): Promise<{ conversations: InstagramConversation[]; nextCursor: string | null }> {
    const where: Record<string, unknown> = {
      tenantId: input.tenantId
    };

    if (input.instagramConnectionId) {
      where.instagramConnectionId = input.instagramConnectionId;
    }

    const findManyArgs: {
      where: Record<string, unknown>;
      orderBy: { lastMessageAt: "desc" };
      take: number;
      cursor?: { id: string };
    } = {
      where,
      orderBy: { lastMessageAt: "desc" },
      take: input.limit ?? 50
    };

    if (input.cursor) {
      findManyArgs.cursor = { id: input.cursor };
    }

    const conversations = await this.prisma.instagramConversation.findMany(findManyArgs);

    const nextCursor = conversations.length === (input.limit ?? 50) ? conversations[conversations.length - 1]!.id : null;

    return {
      conversations: conversations.map(this.mapToDomain),
      nextCursor
    };
  }

  async findByIdForTenant(input: FindInstagramConversationByIdInput): Promise<InstagramConversation | null> {
    const conversation = await this.prisma.instagramConversation.findFirst({
      where: {
        id: input.id,
        tenantId: input.tenantId
      }
    });

    return conversation ? this.mapToDomain(conversation) : null;
  }

  async findByConnectionAndParticipant(input: {
    instagramConnectionId: string;
    participantExternalId: string;
  }): Promise<InstagramConversation | null> {
    const conversation = await this.prisma.instagramConversation.findFirst({
      where: {
        instagramConnectionId: input.instagramConnectionId,
        participantExternalId: input.participantExternalId
      }
    });

    return conversation ? this.mapToDomain(conversation) : null;
  }

  async incrementUnreadCount(conversationId: string): Promise<InstagramConversation | null> {
    const conversation = await this.prisma.instagramConversation.update({
      where: { id: conversationId },
      data: { unreadCount: { increment: 1 } }
    });

    return this.mapToDomain(conversation);
  }

  async markAsRead(conversationId: string, tenantId: string): Promise<InstagramConversation | null> {
    const conversation = await this.prisma.instagramConversation.updateMany({
      where: {
        id: conversationId,
        tenantId
      },
      data: { unreadCount: 0 }
    });

    if (conversation.count === 0) {
      return null;
    }

    const updated = await this.prisma.instagramConversation.findUnique({
      where: { id: conversationId }
    });

    return updated ? this.mapToDomain(updated) : null;
  }

  async deleteByConnectionId(connectionId: string): Promise<void> {
    await this.prisma.instagramConversation.deleteMany({
      where: { instagramConnectionId: connectionId }
    });
  }

  private mapToDomain(conversation: {
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
  }): InstagramConversation {
    return {
      id: conversation.id,
      tenantId: conversation.tenantId,
      instagramConnectionId: conversation.instagramConnectionId,
      participantExternalId: conversation.participantExternalId,
      participantUsername: conversation.participantUsername,
      participantName: conversation.participantName,
      participantProfilePictureUrl: conversation.participantProfilePictureUrl,
      lastMessageAt: conversation.lastMessageAt,
      lastMessagePreview: conversation.lastMessagePreview,
      unreadCount: conversation.unreadCount,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    };
  }
}
