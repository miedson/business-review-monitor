CREATE TYPE "InstagramAutomationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "InstagramAutomationTriggerType" AS ENUM ('INSTAGRAM_COMMENT');
CREATE TYPE "InstagramAutomationScopeType" AS ENUM ('SPECIFIC_MEDIA', 'ALL_MEDIA', 'NEXT_MEDIA');
CREATE TYPE "InstagramAutomationMatchType" AS ENUM ('ANY_COMMENT', 'CONTAINS', 'EXACT_MATCH', 'FULL_WORD');
CREATE TYPE "InstagramAutomationTriggerFrequency" AS ENUM ('ONCE_PER_COMMENT', 'ONCE_PER_USER_PER_POST', 'ONCE_PER_USER');
CREATE TYPE "InstagramAutomationActionType" AS ENUM ('PUBLIC_COMMENT_REPLY', 'SEND_INSTAGRAM_DM');
CREATE TYPE "InstagramAutomationExecutionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED', 'SKIPPED');

CREATE TABLE "instagram_automations" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "instagramConnectionId" TEXT NOT NULL, "createdBy" TEXT NOT NULL,
  "name" TEXT NOT NULL, "status" "InstagramAutomationStatus" NOT NULL DEFAULT 'DRAFT',
  "triggerType" "InstagramAutomationTriggerType" NOT NULL DEFAULT 'INSTAGRAM_COMMENT',
  "scopeType" "InstagramAutomationScopeType" NOT NULL DEFAULT 'SPECIFIC_MEDIA', "instagramMediaId" TEXT,
  "matchType" "InstagramAutomationMatchType" NOT NULL DEFAULT 'ANY_COMMENT', "keywords" JSONB NOT NULL,
  "excludedKeywords" JSONB NOT NULL, "triggerFrequency" "InstagramAutomationTriggerFrequency" NOT NULL DEFAULT 'ONCE_PER_COMMENT',
  "publicReplyEnabled" BOOLEAN NOT NULL DEFAULT false, "publicReplyMessages" JSONB NOT NULL,
  "dmMessage" TEXT NOT NULL, "dmLink" TEXT, "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "instagram_automations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "instagram_automation_actions" (
  "id" TEXT NOT NULL, "automationId" TEXT NOT NULL, "type" "InstagramAutomationActionType" NOT NULL,
  "position" INTEGER NOT NULL, "config" JSONB NOT NULL, CONSTRAINT "instagram_automation_actions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "instagram_automation_executions" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "automationId" TEXT NOT NULL,
  "triggerType" "InstagramAutomationTriggerType" NOT NULL, "externalEventId" TEXT,
  "instagramCommentId" TEXT NOT NULL, "instagramUserId" TEXT, "instagramMediaId" TEXT, "matchedKeyword" TEXT,
  "status" "InstagramAutomationExecutionStatus" NOT NULL DEFAULT 'PENDING', "startedAt" TIMESTAMPTZ(3), "completedAt" TIMESTAMPTZ(3),
  "errorCode" TEXT, "errorMessage" TEXT, "metadata" JSONB NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "instagram_automation_executions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "instagram_automation_action_executions" (
  "id" TEXT NOT NULL, "executionId" TEXT NOT NULL, "actionId" TEXT NOT NULL,
  "status" "InstagramAutomationExecutionStatus" NOT NULL DEFAULT 'PENDING', "externalId" TEXT, "errorCode" TEXT, "errorMessage" TEXT,
  "startedAt" TIMESTAMPTZ(3), "completedAt" TIMESTAMPTZ(3), CONSTRAINT "instagram_automation_action_executions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "instagram_automation_actions_automationId_position_key" ON "instagram_automation_actions"("automationId", "position");
CREATE UNIQUE INDEX "instagram_automation_executions_automationId_instagramCommentId_key" ON "instagram_automation_executions"("automationId", "instagramCommentId");
CREATE UNIQUE INDEX "instagram_automation_action_executions_executionId_actionId_key" ON "instagram_automation_action_executions"("executionId", "actionId");
CREATE INDEX "instagram_automations_candidate_idx" ON "instagram_automations"("instagramConnectionId", "status", "scopeType", "instagramMediaId");
CREATE INDEX "instagram_automations_tenant_idx" ON "instagram_automations"("tenantId", "status", "triggerType");
CREATE INDEX "instagram_automation_executions_tenant_created_idx" ON "instagram_automation_executions"("tenantId", "createdAt");
CREATE INDEX "instagram_automation_executions_automation_status_idx" ON "instagram_automation_executions"("automationId", "status", "createdAt");
ALTER TABLE "instagram_automations" ADD CONSTRAINT "instagram_automations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instagram_automations" ADD CONSTRAINT "instagram_automations_instagramConnectionId_fkey" FOREIGN KEY ("instagramConnectionId") REFERENCES "instagram_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instagram_automation_actions" ADD CONSTRAINT "instagram_automation_actions_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "instagram_automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instagram_automation_executions" ADD CONSTRAINT "instagram_automation_executions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instagram_automation_executions" ADD CONSTRAINT "instagram_automation_executions_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "instagram_automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instagram_automation_action_executions" ADD CONSTRAINT "instagram_automation_action_executions_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "instagram_automation_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instagram_automation_action_executions" ADD CONSTRAINT "instagram_automation_action_executions_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "instagram_automation_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
