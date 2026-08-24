export type AutomationStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
export type AutomationScopeType = "SPECIFIC_MEDIA" | "ALL_MEDIA" | "NEXT_MEDIA";
export type AutomationMatchType = "ANY_COMMENT" | "CONTAINS" | "EXACT_MATCH" | "FULL_WORD";
export type AutomationActionType = "PUBLIC_COMMENT_REPLY" | "SEND_INSTAGRAM_DM";

export type InstagramAutomationRecord = {
  id: string;
  tenantId: string;
  instagramConnectionId: string;
  name: string;
  status: AutomationStatus;
  scopeType: AutomationScopeType;
  instagramMediaId: string | null;
  matchType: AutomationMatchType;
  keywords: string[];
  excludedKeywords: string[];
  publicReplyEnabled: boolean;
  publicReplyMessages: string[];
  dmMessage: string;
  dmLink: string | null;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
};
export type InstagramAutomationActionRecord = {
  id: string;
  type: AutomationActionType;
  position: number;
  config: Record<string, unknown>;
};
export type InstagramAutomationWithActions = InstagramAutomationRecord & {
  actions: InstagramAutomationActionRecord[];
};
export type InstagramAutomationPage = {
  automations: InstagramAutomationWithActions[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export type SaveInstagramAutomationInput = Omit<
  InstagramAutomationRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  createdBy: string;
  triggerFrequency?: "ONCE_PER_COMMENT" | "ONCE_PER_USER_PER_POST" | "ONCE_PER_USER";
  actions: Array<{ type: AutomationActionType; position: number; config: Record<string, unknown> }>;
};
export type UpdateInstagramAutomationInput = {
  [Key in keyof SaveInstagramAutomationInput]?: SaveInstagramAutomationInput[Key] | undefined;
};
export type InstagramAutomationExecutionRecord = {
  id: string;
  automationId: string;
  instagramCommentId: string;
  instagramUserId: string | null;
  instagramMediaId: string | null;
  matchedKeyword: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
  actionExecutions: Array<{
    actionId: string;
    type: string;
    status: string;
    errorMessage: string | null;
    externalId: string | null;
  }>;
};

export interface InstagramAutomationRepository {
  save(input: SaveInstagramAutomationInput): Promise<InstagramAutomationWithActions>;
  update(
    input: UpdateInstagramAutomationInput & { id: string; tenantId: string },
  ): Promise<InstagramAutomationWithActions>;
  findByIdForTenant(input: {
    id: string;
    tenantId: string;
  }): Promise<InstagramAutomationWithActions | null>;
  listByTenant(input: {
    tenantId: string;
    page: number;
    pageSize: number;
  }): Promise<InstagramAutomationPage>;
  findActiveCandidates(input: {
    tenantId: string;
    instagramConnectionId: string;
    mediaId: string | null;
  }): Promise<InstagramAutomationWithActions[]>;
  createExecution(input: {
    tenantId: string;
    automationId: string;
    commentId: string;
    externalCommentId: string;
    userId: string | null;
    mediaId: string | null;
    matchedKeyword: string | null;
    metadata: Record<string, unknown>;
  }): Promise<{ id: string } | null>;
  updateExecution(input: {
    id: string;
    status: "PROCESSING" | "COMPLETED" | "PARTIAL" | "FAILED" | "SKIPPED";
    errorMessage?: string;
  }): Promise<void>;
  createActionExecution(input: { executionId: string; actionId: string }): Promise<void>;
  updateActionExecution(input: {
    executionId: string;
    actionId: string;
    status: "COMPLETED" | "FAILED";
    externalId?: string;
    errorMessage?: string;
  }): Promise<void>;
  listExecutions(input: {
    tenantId: string;
    automationId: string;
  }): Promise<InstagramAutomationExecutionRecord[]>;
}
