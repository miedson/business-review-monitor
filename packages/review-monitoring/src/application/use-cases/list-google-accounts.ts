import type {
  BusinessProfileReviewProvider,
  ListBusinessProfileAccountsResult
} from "../ports/business-profile-review-provider.js";
import type { GoogleConnectionRepository } from "../ports/google-connection-repository.js";
import { GoogleBusinessProfileProviderError } from "../ports/review-provider-error.js";
import type { TokenCipher } from "../ports/token-cipher.js";

export type ListGoogleAccountsInput = {
  tenantId: string;
  pageToken?: string;
};

export type ListGoogleAccountsDependencies = {
  googleConnectionRepository: GoogleConnectionRepository;
  provider: BusinessProfileReviewProvider;
  tokenCipher: TokenCipher;
};

export class ListGoogleAccounts {
  constructor(private readonly dependencies: ListGoogleAccountsDependencies) {}

  async execute(
    input: ListGoogleAccountsInput
  ): Promise<ListBusinessProfileAccountsResult> {
    const connection =
      await this.dependencies.googleConnectionRepository.findByTenantId(
        input.tenantId
      );

    if (
      !connection ||
      connection.status !== "CONNECTED" ||
      !connection.encryptedRefreshToken
    ) {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_AUTH_REQUIRED",
        "Google authorization is required"
      );
    }

    const refreshToken = this.dependencies.tokenCipher.decrypt(
      connection.encryptedRefreshToken
    );
    const tokenSet = await this.dependencies.provider.refreshAccessToken({
      refreshToken
    });

    return this.dependencies.provider.listAccounts({
      accessToken: tokenSet.accessToken,
      ...(input.pageToken ? { pageToken: input.pageToken } : {})
    });
  }
}
