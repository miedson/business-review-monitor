import type { PrismaClient, Tenant, User } from "@brm/database";

export type PublicUser = Pick<User, "id" | "name" | "email" | "createdAt">;
export type PublicTenant = Pick<Tenant, "id" | "name">;
export type UserWithTenant = {
  user: User;
  tenant: Tenant;
};

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id }
    });
  }

  async createWithInitialTenant(input: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<UserWithTenant> {
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: input
      });
      const tenant = await transaction.tenant.create({
        data: {
          name: input.name
        }
      });

      await transaction.tenantUser.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: "OWNER"
        }
      });

      return { user, tenant };
    });
  }

  async findPrimaryTenantForUser(userId: string): Promise<Tenant | null> {
    const tenantUser = await this.prisma.tenantUser.findFirst({
      where: { userId },
      orderBy: {
        createdAt: "asc"
      },
      include: {
        tenant: true
      }
    });

    return tenantUser?.tenant ?? null;
  }
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

export function toPublicTenant(tenant: Tenant): PublicTenant {
  return {
    id: tenant.id,
    name: tenant.name
  };
}
