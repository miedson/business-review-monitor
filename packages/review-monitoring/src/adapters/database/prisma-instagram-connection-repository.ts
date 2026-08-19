import type { PrismaClient } from "@brm/database";

import type {
  DisconnectInstagramConnectionInput,
  InstagramConnectionRepository,
  SaveConnectedInstagramConnectionInput,
  StoredInstagramConnection
} from "../../application/ports/instagram-connection-repository.js";

export class PrismaInstagramConnectionRepository
  implements InstagramConnectionRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async findByTenantId(tenantId: string): Promise<StoredInstagramConnection | null> {
    const connection = await this.prisma.instagramConnection.findFirst({
      where: {
        tenantId
      }
    });

    return connection;
  }

  async findByInstagramUserId(instagramUserId: string): Promise<{ tenantId: string; instagramUserId: string } | null> {
    const connection = await this.prisma.instagramConnection.findFirst({
      where: {
        instagramUserId
      },
      select: {
        tenantId: true,
        instagramUserId: true
      }
    });

    return connection;
  }

  async saveConnected(
    input: SaveConnectedInstagramConnectionInput
  ): Promise<StoredInstagramConnection> {
    const existingConnection = await this.prisma.instagramConnection.findFirst({
      where: {
        tenantId: input.tenantId
      }
    });

    if (existingConnection) {
      return this.prisma.instagramConnection.update({
        where: {
          id: existingConnection.id
        },
        data: {
          instagramUserId: input.instagramUserId,
          encryptedAccessToken: input.encryptedAccessToken,
          scope: input.scope,
          status: "CONNECTED",
          connectedAt: input.connectedAt,
          disconnectedAt: null,
          ...(input.username !== undefined && { username: input.username }),
          ...(input.accountType !== undefined && { accountType: input.accountType }),
          ...(input.tokenExpiresAt !== undefined && { tokenExpiresAt: input.tokenExpiresAt })
        }
      });
    }

    return this.prisma.instagramConnection.create({
      data: {
        tenantId: input.tenantId,
        instagramUserId: input.instagramUserId,
        encryptedAccessToken: input.encryptedAccessToken,
        scope: input.scope,
        status: "CONNECTED",
        connectedAt: input.connectedAt,
        ...(input.username !== undefined && { username: input.username }),
        ...(input.accountType !== undefined && { accountType: input.accountType }),
        ...(input.tokenExpiresAt !== undefined && { tokenExpiresAt: input.tokenExpiresAt })
      }
    });
  }

  async disconnectByTenantId(
    input: DisconnectInstagramConnectionInput
  ): Promise<StoredInstagramConnection | null> {
    const connection = await this.findByTenantId(input.tenantId);

    await this.prisma.instagramConnection.updateMany({
      data: {
        disconnectedAt: input.disconnectedAt,
        encryptedAccessToken: null,
        status: "DISCONNECTED"
      },
      where: {
        tenantId: input.tenantId
      }
    });

    return connection;
  }
}