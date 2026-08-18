import type {
  BusinessProfileReviewProvider,
  ListBusinessProfileAccountsResult
} from "../ports/business-profile-review-provider.js";
import type { InstagramConnectionRepository } from "../ports/instagram-connection-repository.js";
import { GoogleBusinessProfileProviderError } from "../ports/review-provider-error.js";
import type { TokenCipher } from "../ports/token-cipher.js";

export type ListInstagramAccountsInput = {
  tenantId: string;
};

export type ListInstagramAccountsDependencies = {
  instagramConnectionRepository: InstagramConnectionRepository;
  provider: BusinessProfileReviewProvider;
  tokenCipher: TokenCipher;
};

export class ListInstagramAccounts {
  constructor(private readonly dependencies: ListInstagramAccountsDependencies) {}

  async execute(
    input: ListInstagramAccountsInput
  ): Promise<ListBusinessProfileAccountsResult> {
    const connection =
      await this.dependencies.instagramConnectionRepository.findByTenantId(
        input.tenantId
      );

    if (
      !connection ||
      connection.status !== "CONNECTED" ||
      !connection.encryptedAccessToken
    ) {
      throw new GoogleBusinessProfileProviderError(
        "INSTAGRAM_AUTH_REQUIRED",
        "Instagram authorization is required"
      );
    }

    const accessToken = this.dependencies.tokenCipher.decrypt(
      connection.encryptedAccessToken
    );

    return this.dependencies.provider.listAccounts({
      accessToken
    });
  }
}