import type { PrismaClient } from "@brm/database";

import type {
  DisconnectGoogleConnectionInput,
  GoogleConnectionRepository,
  SaveConnectedGoogleConnectionInput,
  StoredGoogleConnection,
} from "../../application/ports/google-connection-repository.js";

export class PrismaGoogleConnectionRepository implements GoogleConnectionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByTenantId(tenantId: string): Promise<StoredGoogleConnection | null> {
    const connection = await this.prisma.googleConnection.findFirst({
      where: {
        tenantId,
      },
    });

    return connection;
  }

  async saveConnected(input: SaveConnectedGoogleConnectionInput): Promise<StoredGoogleConnection> {
    const existingConnection = await this.prisma.googleConnection.findFirst({
      where: {
        tenantId: input.tenantId,
      },
    });

    if (existingConnection) {
      return this.prisma.googleConnection.update({
        where: {
          id: existingConnection.id,
        },
        data: {
          encryptedRefreshToken: input.encryptedRefreshToken,
          scope: input.scope,
          status: "CONNECTED",
          connectedAt: input.connectedAt,
          disconnectedAt: null,
        },
      });
    }

    return this.prisma.googleConnection.create({
      data: {
        tenantId: input.tenantId,
        encryptedRefreshToken: input.encryptedRefreshToken,
        scope: input.scope,
        status: "CONNECTED",
        connectedAt: input.connectedAt,
      },
    });
  }

  async disconnectByTenantId(
    input: DisconnectGoogleConnectionInput,
  ): Promise<StoredGoogleConnection | null> {
    const connection = await this.findByTenantId(input.tenantId);

    await this.prisma.googleConnection.updateMany({
      data: {
        disconnectedAt: input.disconnectedAt,
        encryptedRefreshToken: null,
        status: "DISCONNECTED",
      },
      where: {
        tenantId: input.tenantId,
      },
    });

    return connection;
  }
}
