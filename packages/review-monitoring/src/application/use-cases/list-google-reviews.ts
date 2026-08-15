import type {
  BusinessProfileReviewProvider,
  ListBusinessReviewsResult
} from "../ports/business-profile-review-provider.js";
import type { GoogleConnectionRepository } from "../ports/google-connection-repository.js";
import { GoogleBusinessProfileProviderError } from "../ports/review-provider-error.js";
import type { TokenCipher } from "../ports/token-cipher.js";

export type ListGoogleReviewsInput = {
  tenantId: string;
  accountId: string;
  locationId: string;
  pageToken?: string;
};

export type ListGoogleReviewsDependencies = {
  googleConnectionRepository: GoogleConnectionRepository;
  provider: BusinessProfileReviewProvider;
  tokenCipher: TokenCipher;
};

export class ListGoogleReviews {
  constructor(private readonly dependencies: ListGoogleReviewsDependencies) {}

  async execute(input: ListGoogleReviewsInput): Promise<ListBusinessReviewsResult> {
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
        "Google connection is required before listing reviews."
      );
    }

    const refreshToken = this.dependencies.tokenCipher.decrypt(
      connection.encryptedRefreshToken
    );
    const tokenSet = await this.dependencies.provider.refreshAccessToken({
      refreshToken
    });

    return this.dependencies.provider.listReviews({
      accessToken: tokenSet.accessToken,
      accountId: input.accountId,
      locationId: input.locationId,
      ...(input.pageToken ? { pageToken: input.pageToken } : {})
    });
  }
}
