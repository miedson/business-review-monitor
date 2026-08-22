import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const defaultDevelopmentDatabaseUrl =
  "postgresql://brm:brm_dev_password@127.0.0.1:5432/business_review_monitor";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? defaultDevelopmentDatabaseUrl,
});

export const prisma = new PrismaClient({
  adapter,
});

export { PrismaClient };
export * from "@prisma/client";
