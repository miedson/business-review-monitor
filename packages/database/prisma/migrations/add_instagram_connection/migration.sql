-- CreateTable
CREATE TABLE "instagram_connections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "username" TEXT,
    "accountType" TEXT,
    "encryptedAccessToken" TEXT,
    "scope" TEXT NOT NULL,
    "status" "InstagramConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "tokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_connections_pkey" PRIMARY KEY ("id")
);

-- CreateEnum
CREATE TYPE "InstagramConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'REAUTH_REQUIRED', 'ERROR');

-- CreateIndex
CREATE UNIQUE INDEX "instagram_connections_tenantId_key" ON "instagram_connections"("tenantId");

-- CreateIndex
CREATE INDEX "instagram_connections_tenantId_idx" ON "instagram_connections"("tenantId");

-- CreateIndex
CREATE INDEX "instagram_connections_status_idx" ON "instagram_connections"("status");

-- AddForeignKey
ALTER TABLE "instagram_connections" ADD CONSTRAINT "instagram_connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;