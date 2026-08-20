import type { StoredInstagramConnection } from "../ports/instagram-connection-repository.js";
import type { BusinessProfileReviewProvider } from "../ports/business-profile-review-provider.js";
import type { TokenCipher } from "../ports/token-cipher.js";

export type DisconnectInstagramConnectionInput = {
  tenantId: string;
  deleteData: boolean;
};

export type DisconnectInstagramConnectionResult = {
  disconnected: boolean;
};

export type DisconnectInstagramConnectionDependencies = {
  instagramConnectionRepository: {
    disconnectByTenantId(input: {
      disconnectedAt: Date;
      tenantId: string;
    }): Promise<StoredInstagramConnection | null>;
    deleteByTenantId(tenantId: string): Promise<void>;
  };
  instagramCommentRepository: {
    deleteByConnectionId(input: { connectionId: string }): Promise<void>;
  };
  provider: BusinessProfileReviewProvider;
  tokenCipher: TokenCipher;
};

export class DisconnectInstagramConnection {
  constructor(
    private readonly dependencies: DisconnectInstagramConnectionDependencies
  ) {}

  async execute(
    input: DisconnectInstagramConnectionInput
  ): Promise<DisconnectInstagramConnectionResult> {
    const connection = await this.dependencies.instagramConnectionRepository.disconnectByTenantId({
      disconnectedAt: new Date(),
      tenantId: input.tenantId
    });

    if (!connection) {
      return { disconnected: false };
    }

    if (input.deleteData) {
      await this.dependencies.instagramCommentRepository.deleteByConnectionId({ connectionId: connection.id });
      await this.dependencies.instagramConnectionRepository.deleteByTenantId(input.tenantId);
    }

    if (!connection.encryptedAccessToken) {
      return { disconnected: true };
    }

    try {
      await this.dependencies.provider.revokeAuthorization({
        refreshToken: this.dependencies.tokenCipher.decrypt(connection.encryptedAccessToken)
      });
    } catch {
      return { disconnected: true };
    }

    return { disconnected: true };
  }
}