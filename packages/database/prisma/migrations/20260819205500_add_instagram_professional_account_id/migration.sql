-- Add instagramProfessionalAccountId column to track Instagram Professional Account ID (webhook entry.id)
ALTER TABLE "instagram_connections" ADD COLUMN "instagramProfessionalAccountId" TEXT;

-- Create unique index for professional account ID lookup
CREATE UNIQUE INDEX "instagram_connections_instagramProfessionalAccountId_key" ON "instagram_connections"("instagramProfessionalAccountId");