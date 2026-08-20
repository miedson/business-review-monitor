-- CreateEnum
CREATE TYPE "TenantUserRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "GoogleConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'REAUTH_REQUIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "InstagramConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'REAUTH_REQUIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "InstagramCommentStatus" AS ENUM ('NEW', 'READ');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TenantUserRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_connections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "googleAccountEmail" TEXT,
    "googleAccountId" TEXT,
    "encryptedRefreshToken" TEXT,
    "scope" TEXT NOT NULL,
    "status" "GoogleConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "connectedAt" TIMESTAMPTZ(3),
    "disconnectedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "google_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_connections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "instagramProfessionalAccountId" TEXT,
    "username" TEXT,
    "accountType" TEXT,
    "encryptedAccessToken" TEXT,
    "scope" TEXT NOT NULL,
    "status" "InstagramConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "connectedAt" TIMESTAMPTZ(3),
    "disconnectedAt" TIMESTAMPTZ(3),
    "tokenExpiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "instagram_connections_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "business_locations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "googleConnectionId" TEXT NOT NULL,
    "googleAccountId" TEXT NOT NULL,
    "googleLocationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storeCode" TEXT,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "business_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_cache" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "businessLocationId" TEXT NOT NULL,
    "googleReviewId" TEXT NOT NULL,
    "reviewerName" TEXT,
    "starRating" INTEGER NOT NULL,
    "comment" TEXT,
    "reviewCreatedAt" TIMESTAMPTZ(3) NOT NULL,
    "reviewUpdatedAt" TIMESTAMPTZ(3) NOT NULL,
    "cachedAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "review_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "tenant_users_tenantId_idx" ON "tenant_users"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_users_userId_idx" ON "tenant_users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_users_tenantId_userId_key" ON "tenant_users"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "google_connections_tenantId_idx" ON "google_connections"("tenantId");

-- CreateIndex
CREATE INDEX "google_connections_status_idx" ON "google_connections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_connections_tenantId_key" ON "instagram_connections"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_connections_instagramProfessionalAccountId_key" ON "instagram_connections"("instagramProfessionalAccountId");

-- CreateIndex
CREATE INDEX "instagram_connections_tenantId_idx" ON "instagram_connections"("tenantId");

-- CreateIndex
CREATE INDEX "instagram_connections_status_idx" ON "instagram_connections"("status");

-- CreateIndex
CREATE INDEX "instagram_connections_instagramProfessionalAccountId_idx" ON "instagram_connections"("instagramProfessionalAccountId");

-- CreateIndex
CREATE INDEX "instagram_comments_tenantId_idx" ON "instagram_comments"("tenantId");

-- CreateIndex
CREATE INDEX "instagram_comments_instagramConnectionId_idx" ON "instagram_comments"("instagramConnectionId");

-- CreateIndex
CREATE INDEX "instagram_comments_createdAtExternal_idx" ON "instagram_comments"("createdAtExternal");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_comments_instagramConnectionId_externalCommentId_key" ON "instagram_comments"("instagramConnectionId", "externalCommentId");

-- CreateIndex
CREATE INDEX "business_locations_tenantId_idx" ON "business_locations"("tenantId");

-- CreateIndex
CREATE INDEX "business_locations_googleConnectionId_idx" ON "business_locations"("googleConnectionId");

-- CreateIndex
CREATE INDEX "business_locations_isSelected_idx" ON "business_locations"("isSelected");

-- CreateIndex
CREATE UNIQUE INDEX "business_locations_googleConnectionId_googleLocationId_key" ON "business_locations"("googleConnectionId", "googleLocationId");

-- CreateIndex
CREATE INDEX "review_cache_tenantId_idx" ON "review_cache"("tenantId");

-- CreateIndex
CREATE INDEX "review_cache_businessLocationId_idx" ON "review_cache"("businessLocationId");

-- CreateIndex
CREATE INDEX "review_cache_expiresAt_idx" ON "review_cache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "review_cache_businessLocationId_googleReviewId_key" ON "review_cache"("businessLocationId", "googleReviewId");

-- AddForeignKey
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_connections" ADD CONSTRAINT "google_connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_connections" ADD CONSTRAINT "instagram_connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_comments" ADD CONSTRAINT "instagram_comments_instagramConnectionId_fkey" FOREIGN KEY ("instagramConnectionId") REFERENCES "instagram_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_comments" ADD CONSTRAINT "instagram_comments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_googleConnectionId_fkey" FOREIGN KEY ("googleConnectionId") REFERENCES "google_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_cache" ADD CONSTRAINT "review_cache_businessLocationId_fkey" FOREIGN KEY ("businessLocationId") REFERENCES "business_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_cache" ADD CONSTRAINT "review_cache_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
