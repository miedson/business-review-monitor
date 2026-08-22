-- Add reply state without changing existing comment meaning.
ALTER TABLE "instagram_comments"
  ADD COLUMN "readAt" TIMESTAMPTZ(3),
  ADD COLUMN "repliedAt" TIMESTAMPTZ(3);

ALTER TABLE "review_cache"
  ADD COLUMN "replyText" TEXT,
  ADD COLUMN "replyUpdatedAt" TIMESTAMPTZ(3);

CREATE TYPE "InstagramReplyAuthorType" AS ENUM ('CUSTOMER', 'BUSINESS');

CREATE TABLE "instagram_comment_replies" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "instagramCommentId" TEXT NOT NULL,
  "externalReplyId" TEXT,
  "authorType" "InstagramReplyAuthorType" NOT NULL,
  "text" TEXT NOT NULL,
  "createdAtExternal" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "instagram_comment_replies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instagram_media" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "instagramConnectionId" TEXT NOT NULL,
  "externalMediaId" TEXT NOT NULL,
  "mediaType" TEXT,
  "mediaProductType" TEXT,
  "caption" TEXT,
  "mediaUrl" TEXT,
  "thumbnailUrl" TEXT,
  "permalink" TEXT,
  "publishedAt" TIMESTAMPTZ(3),
  "lastSyncedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "instagram_media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "instagram_external_users" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "instagramConnectionId" TEXT NOT NULL,
  "externalUserId" TEXT NOT NULL,
  "username" TEXT,
  "name" TEXT,
  "profilePictureUrl" TEXT,
  "lastSyncedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "instagram_external_users_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "instagram_comment_replies_tenantId_idx" ON "instagram_comment_replies"("tenantId");
CREATE INDEX "instagram_comment_replies_instagramCommentId_idx" ON "instagram_comment_replies"("instagramCommentId");
CREATE UNIQUE INDEX "instagram_media_instagramConnectionId_externalMediaId_key" ON "instagram_media"("instagramConnectionId", "externalMediaId");
CREATE INDEX "instagram_media_tenantId_idx" ON "instagram_media"("tenantId");
CREATE UNIQUE INDEX "instagram_external_users_instagramConnectionId_externalUserId_key" ON "instagram_external_users"("instagramConnectionId", "externalUserId");
CREATE INDEX "instagram_external_users_tenantId_idx" ON "instagram_external_users"("tenantId");

ALTER TABLE "instagram_comment_replies" ADD CONSTRAINT "instagram_comment_replies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instagram_comment_replies" ADD CONSTRAINT "instagram_comment_replies_instagramCommentId_fkey" FOREIGN KEY ("instagramCommentId") REFERENCES "instagram_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instagram_media" ADD CONSTRAINT "instagram_media_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instagram_media" ADD CONSTRAINT "instagram_media_instagramConnectionId_fkey" FOREIGN KEY ("instagramConnectionId") REFERENCES "instagram_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instagram_external_users" ADD CONSTRAINT "instagram_external_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "instagram_external_users" ADD CONSTRAINT "instagram_external_users_instagramConnectionId_fkey" FOREIGN KEY ("instagramConnectionId") REFERENCES "instagram_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
