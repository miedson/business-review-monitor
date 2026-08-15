import type {
  BusinessProfileReviewProvider,
  ListBusinessProfileLocationsResult
} from "../ports/business-profile-review-provider.js";
import type { GoogleConnectionRepository } from "../ports/google-connection-repository.js";
import { GoogleBusinessProfileProviderError } from "../ports/review-provider-error.js";
import type { TokenCipher } from "../ports/token-cipher.js";

export type ListGoogleLocationsInput = {
  tenantId: string;
  accountId: string;
  pageToken?: string;
};

export type ListGoogleLocationsDependencies = {
  googleConnectionRepository: GoogleConnectionRepository;
  provider: BusinessProfileReviewProvider;
  tokenCipher: TokenCipher;
};

export class ListGoogleLocations {
  constructor(private readonly dependencies: ListGoogleLocationsDependencies) {}

  async execute(
    input: ListGoogleLocationsInput
  ): Promise<ListBusinessProfileLocationsResult> {
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
        "Google connection is required before listing business locations."
      );
    }

    const refreshToken = this.dependencies.tokenCipher.decrypt(
      connection.encryptedRefreshToken
    );
    const tokenSet = await this.dependencies.provider.refreshAccessToken({
      refreshToken
    });

    return this.dependencies.provider.listLocations({
      accessToken: tokenSet.accessToken,
      accountId: input.accountId,
      ...(input.pageToken ? { pageToken: input.pageToken } : {})
    });
  }
}
