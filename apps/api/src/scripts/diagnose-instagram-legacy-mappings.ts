#!/usr/bin/env tsx
import { prisma } from "@brm/database";

async function main() {
  console.log("=== Instagram Legacy Mapping Diagnosis ===");

  const suspectConnections = await prisma.instagramConnection.findMany({
    where: {
      instagramProfessionalAccountId: {
        not: null,
      },
    },
    select: {
      id: true,
      tenantId: true,
      instagramUserId: true,
      instagramProfessionalAccountId: true,
      username: true,
      status: true,
      connectedAt: true,
    },
  });

  const legacyRecords = suspectConnections.filter(
    (conn) => conn.instagramProfessionalAccountId === conn.instagramUserId,
  );

  console.log("\n=== SUSPECT LEGACY MAPPINGS ===");
  console.log(`Total connections with professionalAccountId: ${suspectConnections.length}`);
  console.log(`Legacy mappings (professionalAccountId == userId): ${legacyRecords.length}`);

  if (legacyRecords.length === 0) {
    console.log("\nNo legacy mappings found.");
  } else {
    console.log("\nLegacy records:");
    for (const record of legacyRecords) {
      console.log(JSON.stringify(record, null, 2));
    }
  }

  console.log("\n=== ALL CONNECTIONS WITH professionalAccountId ===");
  for (const record of suspectConnections) {
    const isLegacy = record.instagramProfessionalAccountId === record.instagramUserId;
    console.log(
      `  ${record.id} | tenant=${record.tenantId} | userId=${record.instagramUserId} | proId=${record.instagramProfessionalAccountId} | legacy=${isLegacy}`,
    );
  }

  await prisma.$disconnect();
}

main();
