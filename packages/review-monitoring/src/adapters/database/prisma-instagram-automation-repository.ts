import type { Prisma, PrismaClient } from "@brm/database";

import type {
  InstagramAutomationRepository,
  InstagramAutomationWithActions,
  SaveInstagramAutomationInput,
} from "../../application/ports/instagram-automation-repository.js";

export class PrismaInstagramAutomationRepository implements InstagramAutomationRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async save(input: SaveInstagramAutomationInput): Promise<InstagramAutomationWithActions> {
    return this.map(
      await this.prisma.instagramAutomation.create({
        data: {
          ...input,
          keywords: input.keywords,
          excludedKeywords: input.excludedKeywords,
          publicReplyMessages: input.publicReplyMessages,
          triggerFrequency: input.triggerFrequency ?? "ONCE_PER_COMMENT",
          actions: {
            create: input.actions.map((action) => ({
              ...action,
              config: action.config as Prisma.InputJsonValue,
            })),
          },
        },
        include: { actions: true },
      }),
    );
  }
  async update(
    input: Partial<SaveInstagramAutomationInput> & { id: string; tenantId: string },
  ): Promise<InstagramAutomationWithActions> {
    const { id, tenantId, actions, ...data } = input;
    const current = await this.prisma.instagramAutomation.findFirstOrThrow({
      where: { id, tenantId },
    });
    return this.map(
      await this.prisma.$transaction(async (tx) => {
        if (actions) await tx.instagramAutomationAction.deleteMany({ where: { automationId: id } });
        const updateData: Prisma.InstagramAutomationUpdateInput = { ...data };
        if (actions) {
          updateData.actions = {
            create: actions.map((action) => ({
              ...action,
              config: action.config as Prisma.InputJsonValue,
            })),
          };
        }
        return tx.instagramAutomation.update({
          where: { id: current.id },
          data: updateData,
          include: { actions: true },
        });
      }),
    );
  }
  async findByIdForTenant(input: { id: string; tenantId: string }) {
    const value = await this.prisma.instagramAutomation.findFirst({
      where: input,
      include: { actions: true },
    });
    return value ? this.map(value) : null;
  }
  async listByTenant(input: { tenantId: string }) {
    const values = await this.prisma.instagramAutomation.findMany({
      where: { tenantId: input.tenantId, status: { not: "ARCHIVED" } },
      include: { actions: true },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
    return values.map((value) => this.map(value));
  }
  async findActiveCandidates(input: {
    tenantId: string;
    instagramConnectionId: string;
    mediaId: string | null;
  }) {
    const values = await this.prisma.instagramAutomation.findMany({
      where: {
        tenantId: input.tenantId,
        instagramConnectionId: input.instagramConnectionId,
        status: "ACTIVE",
        triggerType: "INSTAGRAM_COMMENT",
        OR: [
          { scopeType: "ALL_MEDIA" },
          { scopeType: "SPECIFIC_MEDIA", instagramMediaId: input.mediaId },
        ],
      },
      include: { actions: true },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });
    return values.map((value) => this.map(value));
  }
  async createExecution(input: {
    tenantId: string;
    automationId: string;
    commentId: string;
    externalCommentId: string;
    userId: string | null;
    mediaId: string | null;
    matchedKeyword: string | null;
    metadata: Record<string, unknown>;
  }) {
    try {
      const value = await this.prisma.instagramAutomationExecution.create({
        data: {
          tenantId: input.tenantId,
          automationId: input.automationId,
          triggerType: "INSTAGRAM_COMMENT",
          externalEventId: input.externalCommentId,
          instagramCommentId: input.commentId,
          instagramUserId: input.userId,
          instagramMediaId: input.mediaId,
          matchedKeyword: input.matchedKeyword,
          metadata: input.metadata as Prisma.InputJsonValue,
        },
      });
      return { id: value.id };
    } catch (error) {
      if (isUniqueError(error)) return null;
      throw error;
    }
  }
  async updateExecution(input: {
    id: string;
    status: "PROCESSING" | "COMPLETED" | "PARTIAL" | "FAILED" | "SKIPPED";
    errorMessage?: string;
  }) {
    const data: Prisma.InstagramAutomationExecutionUpdateInput = {
      status: input.status,
      ...(input.errorMessage !== undefined ? { errorMessage: input.errorMessage } : {}),
      ...(input.status === "PROCESSING" ? { startedAt: new Date() } : { completedAt: new Date() }),
    };
    await this.prisma.instagramAutomationExecution.update({
      where: { id: input.id },
      data,
    });
  }
  async createActionExecution(input: { executionId: string; actionId: string }) {
    await this.prisma.instagramAutomationActionExecution.upsert({
      where: { executionId_actionId: input },
      create: input,
      update: {},
    });
  }
  async updateActionExecution(input: {
    executionId: string;
    actionId: string;
    status: "COMPLETED" | "FAILED";
    externalId?: string;
    errorMessage?: string;
  }) {
    await this.prisma.instagramAutomationActionExecution.update({
      where: { executionId_actionId: { executionId: input.executionId, actionId: input.actionId } },
      data: {
        status: input.status,
        ...(input.externalId ? { externalId: input.externalId } : {}),
        ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
        completedAt: new Date(),
      },
    });
  }
  async listExecutions(input: { tenantId: string; automationId: string }) {
    const executions = await this.prisma.instagramAutomationExecution.findMany({
      where: { tenantId: input.tenantId, automationId: input.automationId },
      include: { actionExecutions: { include: { action: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return executions.map((execution) => ({
      id: execution.id,
      automationId: execution.automationId,
      instagramCommentId: execution.instagramCommentId,
      instagramUserId: execution.instagramUserId,
      instagramMediaId: execution.instagramMediaId,
      matchedKeyword: execution.matchedKeyword,
      status: execution.status,
      errorMessage: execution.errorMessage,
      createdAt: execution.createdAt,
      completedAt: execution.completedAt,
      actionExecutions: execution.actionExecutions.map((action) => ({
        actionId: action.actionId,
        type: action.action.type,
        status: action.status,
        errorMessage: action.errorMessage,
        externalId: action.externalId,
      })),
    }));
  }
  private map(value: {
    id: string;
    tenantId: string;
    instagramConnectionId: string;
    name: string;
    status: string;
    scopeType: string;
    instagramMediaId: string | null;
    matchType: string;
    keywords: unknown;
    excludedKeywords: unknown;
    publicReplyEnabled: boolean;
    publicReplyMessages: unknown;
    dmMessage: string;
    dmLink: string | null;
    priority: number;
    createdAt: Date;
    updatedAt: Date;
    actions: Array<{ id: string; type: string; position: number; config: unknown }>;
  }): InstagramAutomationWithActions {
    return {
      ...value,
      status: value.status as never,
      scopeType: value.scopeType as never,
      matchType: value.matchType as never,
      keywords: asStrings(value.keywords),
      excludedKeywords: asStrings(value.excludedKeywords),
      publicReplyMessages: asStrings(value.publicReplyMessages),
      actions: value.actions.map((action) => ({
        ...action,
        type: action.type as never,
        config: isRecord(action.config) ? action.config : {},
      })),
    };
  }
}
function asStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isUniqueError(error: unknown): boolean {
  return isRecord(error) && error.code === "P2002";
}
