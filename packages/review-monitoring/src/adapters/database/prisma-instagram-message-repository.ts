import type { PrismaClient } from "@brm/database";

import type {
  FindInstagramMessageByIdInput,
  FindInstagramMessagesInput,
  InstagramMessage,
  InstagramMessageRepository,
  SaveInstagramMessageInput,
} from "../../application/ports/instagram-message-repository.js";

export class PrismaInstagramMessageRepository implements InstagramMessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(input: SaveInstagramMessageInput): Promise<InstagramMessage> {
    const message = await this.prisma.instagramMessage.create({
      data: {
        tenantId: input.tenantId,
        instagramConversationId: input.instagramConversationId,
        externalMessageId: input.externalMessageId,
        senderExternalId: input.senderExternalId,
        recipientExternalId: input.recipientExternalId,
        direction: input.direction,
        text: input.text ?? null,
        sentAtExternal: input.sentAtExternal ?? null,
        status: input.status ?? "DELIVERED",
      },
    });

    return this.mapToDomain(message);
  }

  async findByConversation(
    input: FindInstagramMessagesInput,
  ): Promise<{ messages: InstagramMessage[]; nextCursor: string | null }> {
    const findManyArgs: {
      where: { instagramConversationId: string };
      orderBy: { sentAtExternal: "asc" };
      take: number;
      cursor?: { id: string };
    } = {
      where: {
        instagramConversationId: input.instagramConversationId,
      },
      orderBy: { sentAtExternal: "asc" },
      take: input.limit ?? 50,
    };

    if (input.cursor) {
      findManyArgs.cursor = { id: input.cursor };
    }

    const messages = await this.prisma.instagramMessage.findMany(findManyArgs);

    const nextCursor =
      messages.length === (input.limit ?? 50) ? messages[messages.length - 1]!.id : null;

    return {
      messages: messages.map(this.mapToDomain),
      nextCursor,
    };
  }

  async findByIdForTenant(input: FindInstagramMessageByIdInput): Promise<InstagramMessage | null> {
    const message = await this.prisma.instagramMessage.findFirst({
      where: {
        id: input.id,
        tenantId: input.tenantId,
      },
    });

    return message ? this.mapToDomain(message) : null;
  }

  async findByExternalId(input: {
    instagramConversationId: string;
    externalMessageId: string;
  }): Promise<InstagramMessage | null> {
    const message = await this.prisma.instagramMessage.findFirst({
      where: {
        instagramConversationId: input.instagramConversationId,
        externalMessageId: input.externalMessageId,
      },
    });

    return message ? this.mapToDomain(message) : null;
  }

  async deleteByConnectionId(connectionId: string): Promise<void> {
    await this.prisma.instagramMessage.deleteMany({
      where: {
        instagramConversation: {
          instagramConnectionId: connectionId,
        },
      },
    });
  }

  private mapToDomain(message: {
    id: string;
    tenantId: string;
    instagramConversationId: string;
    externalMessageId: string;
    senderExternalId: string;
    recipientExternalId: string;
    direction: "INBOUND" | "OUTBOUND";
    text: string | null;
    sentAtExternal: Date | null;
    status: "SENT" | "DELIVERED" | "READ" | "FAILED";
    createdAt: Date;
    updatedAt: Date;
  }): InstagramMessage {
    return {
      id: message.id,
      tenantId: message.tenantId,
      instagramConversationId: message.instagramConversationId,
      externalMessageId: message.externalMessageId,
      senderExternalId: message.senderExternalId,
      recipientExternalId: message.recipientExternalId,
      direction: message.direction,
      text: message.text,
      sentAtExternal: message.sentAtExternal,
      status: message.status,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
