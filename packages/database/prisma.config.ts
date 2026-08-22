import "dotenv/config";

import { defineConfig } from "prisma/config";

const defaultDevelopmentDatabaseUrl =
  "postgresql://brm:brm_dev_password@127.0.0.1:5432/business_review_monitor";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? defaultDevelopmentDatabaseUrl,
  },
});
