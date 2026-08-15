import type { StoredGoogleConnection } from "../ports/google-connection-repository.js";
import type { BusinessProfileReviewProvider } from "../ports/business-profile-review-provider.js";
import type { TokenCipher } from "../ports/token-cipher.js";

export type DisconnectGoogleConnectionInput = {
  tenantId: string;
};

export type DisconnectGoogleConnectionResult = {
  disconnected: boolean;
};

export type DisconnectGoogleConnectionDependencies = {
  businessLocationRepository: {
    deactivateForTenant(tenantId: string): Promise<void>;
  };
  googleConnectionRepository: {
    disconnectByTenantId(input: {
      disconnectedAt: Date;
      tenantId: string;
    }): Promise<StoredGoogleConnection | null>;
  };
  provider: BusinessProfileReviewProvider;
  reviewCacheRepository: {
    deleteByTenantId(tenantId: string): Promise<void>;
  };
  tokenCipher: TokenCipher;
};

export class DisconnectGoogleConnection {
  constructor(private readonly dependencies: DisconnectGoogleConnectionDependencies) {}

  async execute(
    input: DisconnectGoogleConnectionInput
  ): Promise<DisconnectGoogleConnectionResult> {
    const connection = await this.dependencies.googleConnectionRepository.disconnectByTenantId({
      disconnectedAt: new Date(),
      tenantId: input.tenantId
    });

    await this.dependencies.businessLocationRepository.deactivateForTenant(input.tenantId);
    await this.dependencies.reviewCacheRepository.deleteByTenantId(input.tenantId);

    if (!connection?.encryptedRefreshToken) {
      return { disconnected: false };
    }

    try {
      await this.dependencies.provider.revokeAuthorization({
        refreshToken: this.dependencies.tokenCipher.decrypt(connection.encryptedRefreshToken)
      });
    } catch {
      return { disconnected: true };
    }

    return { disconnected: true };
  }
}
