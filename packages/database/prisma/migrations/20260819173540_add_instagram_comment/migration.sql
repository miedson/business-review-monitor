-- CreateEnum
CREATE TYPE "InstagramCommentStatus" AS ENUM ('NEW', 'READ');

-- AlterTable
ALTER TABLE "instagram_connections" ALTER COLUMN "connectedAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "disconnectedAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "tokenExpiresAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "instagram_comments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instagramConnectionId" TEXT NOT NULL,
    "externalCommentId" TEXT NOT NULL,
    "externalMediaId" TEXT,
    "authorExternalId" TEXT,
    "authorUsername" TEXT,
    "text" TEXT,
    "createdAtExternal" TIMESTAMPTZ(3),
    "status" "InstagramCommentStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "instagram_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "instagram_comments_tenantId_idx" ON "instagram_comments"("tenantId");

-- CreateIndex
CREATE INDEX "instagram_comments_instagramConnectionId_idx" ON "instagram_comments"("instagramConnectionId");

-- CreateIndex
CREATE INDEX "instagram_comments_createdAtExternal_idx" ON "instagram_comments"("createdAtExternal");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_comments_instagramConnectionId_externalCommentId_key" ON "instagram_comments"("instagramConnectionId", "externalCommentId");

-- AddForeignKey
ALTER TABLE "instagram_comments" ADD CONSTRAINT "instagram_comments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_comments" ADD CONSTRAINT "instagram_comments_instagramConnectionId_fkey" FOREIGN KEY ("instagramConnectionId") REFERENCES "instagram_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
