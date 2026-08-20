-- CreateEnum
CREATE TYPE "InstagramMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "InstagramMessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "instagram_conversations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instagramConnectionId" TEXT NOT NULL,
    "participantExternalId" TEXT NOT NULL,
    "participantUsername" TEXT,
    "participantName" TEXT,
    "participantProfilePictureUrl" TEXT,
    "lastMessageAt" TIMESTAMPTZ(3),
    "lastMessagePreview" TEXT,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "instagram_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_messages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instagramConversationId" TEXT NOT NULL,
    "externalMessageId" TEXT NOT NULL,
    "senderExternalId" TEXT NOT NULL,
    "recipientExternalId" TEXT NOT NULL,
    "direction" "InstagramMessageDirection" NOT NULL,
    "text" TEXT,
    "sentAtExternal" TIMESTAMPTZ(3),
    "status" "InstagramMessageStatus" NOT NULL DEFAULT 'DELIVERED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "instagram_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "instagram_conversations_tenantId_idx" ON "instagram_conversations"("tenantId");

-- CreateIndex
CREATE INDEX "instagram_conversations_instagramConnectionId_idx" ON "instagram_conversations"("instagramConnectionId");

-- CreateIndex
CREATE INDEX "instagram_conversations_lastMessageAt_idx" ON "instagram_conversations"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_conversations_instagramConnectionId_participantEx_key" ON "instagram_conversations"("instagramConnectionId", "participantExternalId");

-- CreateIndex
CREATE INDEX "instagram_messages_tenantId_idx" ON "instagram_messages"("tenantId");

-- CreateIndex
CREATE INDEX "instagram_messages_instagramConversationId_idx" ON "instagram_messages"("instagramConversationId");

-- CreateIndex
CREATE INDEX "instagram_messages_sentAtExternal_idx" ON "instagram_messages"("sentAtExternal");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_messages_instagramConversationId_externalMessageI_key" ON "instagram_messages"("instagramConversationId", "externalMessageId");

-- AddForeignKey
ALTER TABLE "instagram_conversations" ADD CONSTRAINT "instagram_conversations_instagramConnectionId_fkey" FOREIGN KEY ("instagramConnectionId") REFERENCES "instagram_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_conversations" ADD CONSTRAINT "instagram_conversations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_messages" ADD CONSTRAINT "instagram_messages_instagramConversationId_fkey" FOREIGN KEY ("instagramConversationId") REFERENCES "instagram_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_messages" ADD CONSTRAINT "instagram_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
