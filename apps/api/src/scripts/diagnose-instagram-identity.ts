#!/usr/bin/env tsx

import { loadConfig } from "@brm/config";
import { prisma } from "@brm/database";
import {
  DiagnoseInstagramIdentity,
  PrismaInstagramConnectionRepository,
  InstagramApiProvider,
  EncryptionTokenCipher
} from "@brm/review-monitoring";
import { createEncryptionServiceFromBase64Key } from "@brm/shared";

async function main() {
  const config = loadConfig();

  console.log("=== Instagram Identity Diagnosis ===");
  console.log("Config:", {
    metaProvider: config.META_PROVIDER,
    metaAppId: config.META_APP_ID,
    graphApiVersion: config.META_GRAPH_API_VERSION,
    graphApiBase: "https://graph.instagram.com"
  });

  const tokenCipher = new EncryptionTokenCipher(
    createEncryptionServiceFromBase64Key(config.TOKEN_ENCRYPTION_KEY)
  );

  const instagramConnectionRepository = new PrismaInstagramConnectionRepository(
    prisma
  );

  const instagramProvider = new InstagramApiProvider({
    appId: config.META_APP_ID,
    appSecret: config.META_APP_SECRET,
    redirectUri: config.META_INSTAGRAM_REDIRECT_URI,
    graphApiVersion: config.META_GRAPH_API_VERSION,
    logger: console
  });

  const diagnoseUseCase = new DiagnoseInstagramIdentity({
    instagramConnectionRepository,
    provider: instagramProvider,
    tokenCipher,
    graphApiBase: "https://graph.instagram.com",
    graphApiVersion: config.META_GRAPH_API_VERSION,
    logger: console
  });

  const tenantId = process.argv[2];

  if (!tenantId) {
    console.error("Usage: tsx diagnose-instagram-identity.ts <tenantId>");
    console.error("Example: tsx diagnose-instagram-identity.ts <tenant-uuid>");
    process.exit(1);
  }

  try {
    const result = await diagnoseUseCase.execute(tenantId);

    console.log("\n=== DIAGNOSIS RESULT ===");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("\n=== ERROR ===");
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else {
      console.error(String(error));
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();