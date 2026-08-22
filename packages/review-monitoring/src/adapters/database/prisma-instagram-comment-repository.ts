import type { PrismaClient } from "@brm/database";

import type {
  DeleteInstagramCommentsByConnectionIdInput,
  FindInstagramCommentByIdInput,
  FindInstagramCommentsInput,
  InstagramCommentRepository,
  MarkInstagramCommentRepliedInput,
  UpsertInstagramCommentInput,
} from "../../application/ports/instagram-comment-repository.js";
import type { InstagramComment, InstagramCommentStatus } from "../../domain/instagram-comment.js";

export class PrismaInstagramCommentRepository implements InstagramCommentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(input: UpsertInstagramCommentInput): Promise<InstagramComment> {
    const comment = await this.prisma.instagramComment.upsert({
      where: {
        instagramConnectionId_externalCommentId: {
          instagramConnectionId: input.instagramConnectionId,
          externalCommentId: input.externalCommentId,
        },
      },
      create: {
        tenantId: input.tenantId,
        instagramConnectionId: input.instagramConnectionId,
        externalCommentId: input.externalCommentId,
        externalMediaId: input.externalMediaId ?? null,
        authorExternalId: input.authorExternalId ?? null,
        authorUsername: input.authorUsername ?? null,
        text: input.text ?? null,
        createdAtExternal: input.createdAtExternal ?? null,
        status: input.status ?? "NEW",
      },
      update: {
        externalMediaId: input.externalMediaId ?? null,
        authorExternalId: input.authorExternalId ?? null,
        authorUsername: input.authorUsername ?? null,
        text: input.text ?? null,
        createdAtExternal: input.createdAtExternal ?? null,
        status: input.status ?? "NEW",
        updatedAt: new Date(),
      },
    });

    return this.mapToDomain(comment);
  }

  async findByTenant(input: FindInstagramCommentsInput): Promise<InstagramComment[]> {
    const where: Record<string, unknown> = {
      tenantId: input.tenantId,
    };

    if (input.instagramConnectionId) {
      where.instagramConnectionId = input.instagramConnectionId;
    }

    if (input.status) {
      where.status = input.status;
    }

    const findManyArgs: {
      where: Record<string, unknown>;
      orderBy: { createdAtExternal: "desc" };
      take: number;
      cursor?: { id: string };
    } = {
      where,
      orderBy: { createdAtExternal: "desc" },
      take: input.limit ?? 50,
    };

    if (input.cursor) {
      findManyArgs.cursor = { id: input.cursor };
    }

    const comments = await this.prisma.instagramComment.findMany(findManyArgs);

    return comments.map(this.mapToDomain);
  }

  async findByIdForTenant(input: FindInstagramCommentByIdInput): Promise<InstagramComment | null> {
    const comment = await this.prisma.instagramComment.findFirst({
      where: {
        id: input.id,
        tenantId: input.tenantId,
      },
    });

    return comment ? this.mapToDomain(comment) : null;
  }

  async deleteByConnectionId(input: DeleteInstagramCommentsByConnectionIdInput): Promise<void> {
    await this.prisma.instagramComment.deleteMany({
      where: {
        instagramConnectionId: input.connectionId,
      },
    });
  }

  async markReplied(input: MarkInstagramCommentRepliedInput): Promise<InstagramComment> {
    const comment = await this.prisma.instagramComment.update({
      where: { id: input.id },
      data: { repliedAt: input.repliedAt },
    });
    return this.mapToDomain(comment);
  }

  async saveReply(input: {
    tenantId: string;
    instagramCommentId: string;
    externalReplyId: string;
    text: string;
    createdAt: Date;
  }): Promise<void> {
    await this.prisma.instagramCommentReply.create({
      data: {
        tenantId: input.tenantId,
        instagramCommentId: input.instagramCommentId,
        externalReplyId: input.externalReplyId,
        authorType: "BUSINESS",
        text: input.text,
        createdAtExternal: input.createdAt,
      },
    });
  }

  private mapToDomain(comment: {
    id: string;
    tenantId: string;
    instagramConnectionId: string;
    externalCommentId: string;
    externalMediaId: string | null;
    authorExternalId: string | null;
    authorUsername: string | null;
    text: string | null;
    createdAtExternal: Date | null;
    status: InstagramCommentStatus;
    readAt: Date | null;
    repliedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): InstagramComment {
    return {
      id: comment.id,
      tenantId: comment.tenantId,
      instagramConnectionId: comment.instagramConnectionId,
      externalCommentId: comment.externalCommentId,
      externalMediaId: comment.externalMediaId,
      authorExternalId: comment.authorExternalId,
      authorUsername: comment.authorUsername,
      text: comment.text,
      createdAtExternal: comment.createdAtExternal,
      status: comment.status,
      readAt: comment.readAt,
      repliedAt: comment.repliedAt,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
