import type { PrismaClient } from "@brm/database";

import type {
  BusinessLocationRepository,
  FindBusinessLocationByGoogleIdsInput,
  MarkBusinessLocationSyncedInput,
  SelectBusinessLocationInput,
  StoredBusinessLocation
} from "../../application/ports/business-location-repository.js";

export class PrismaBusinessLocationRepository implements BusinessLocationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByGoogleIds(
    input: FindBusinessLocationByGoogleIdsInput
  ): Promise<StoredBusinessLocation | null> {
    const location = await this.prisma.businessLocation.findFirst({
      where: {
        googleAccountId: input.googleAccountId,
        googleLocationId: input.googleLocationId,
        tenantId: input.tenantId
      }
    });

    return location ? toStoredBusinessLocation(location) : null;
  }

  async markSynced(input: MarkBusinessLocationSyncedInput): Promise<void> {
    await this.prisma.businessLocation.updateMany({
      data: {
        lastSyncedAt: input.syncedAt
      },
      where: {
        id: input.businessLocationId
      }
    });
  }

  async selectForTenant(
    input: SelectBusinessLocationInput
  ): Promise<StoredBusinessLocation | null> {
    const location = await this.prisma.businessLocation.findFirst({
      where: {
        OR: [
          { id: input.businessLocationId },
          { googleLocationId: input.businessLocationId }
        ],
        tenantId: input.tenantId
      }
    });

    if (!location) {
      return null;
    }

    await this.prisma.$transaction([
      this.prisma.businessLocation.updateMany({
        data: { isSelected: false },
        where: { tenantId: input.tenantId }
      }),
      this.prisma.businessLocation.update({
        data: {
          isActive: true,
          isSelected: true
        },
        where: { id: location.id }
      })
    ]);

    return toStoredBusinessLocation({ ...location, isSelected: true });
  }

  async deactivateForTenant(tenantId: string): Promise<void> {
    await this.prisma.businessLocation.updateMany({
      data: {
        isActive: false,
        isSelected: false
      },
      where: { tenantId }
    });
  }

  async listSelectedActive(): Promise<StoredBusinessLocation[]> {
    const locations = await this.prisma.businessLocation.findMany({
      where: {
        isActive: true,
        isSelected: true
      }
    });

    return locations.map(toStoredBusinessLocation);
  }
}

type PrismaBusinessLocation = Awaited<
  ReturnType<PrismaClient["businessLocation"]["findFirst"]>
> extends infer Location
  ? NonNullable<Location>
  : never;

function toStoredBusinessLocation(
  location: PrismaBusinessLocation
): StoredBusinessLocation {
  return {
    googleAccountId: location.googleAccountId,
    googleLocationId: location.googleLocationId,
    id: location.id,
    isActive: location.isActive,
    name: location.name,
    tenantId: location.tenantId
  };
}
