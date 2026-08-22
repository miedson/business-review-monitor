import type { BusinessProfileReviewProvider } from "../ports/business-profile-review-provider.js";
import type { GoogleConnectionRepository } from "../ports/google-connection-repository.js";
import type { OAuthStateStore } from "../ports/oauth-state-store.js";
import { GoogleBusinessProfileProviderError } from "../ports/review-provider-error.js";
import type { TokenCipher } from "../ports/token-cipher.js";

export type CompleteGoogleOAuthCallbackInput = {
  code: string;
  state: string;
};

export type CompleteGoogleOAuthCallbackResult = {
  tenantId: string;
  googleConnectionId: string;
};

export type CompleteGoogleOAuthCallbackDependencies = {
  provider: BusinessProfileReviewProvider;
  stateStore: OAuthStateStore;
  tokenCipher: TokenCipher;
  googleConnectionRepository: GoogleConnectionRepository;
  now: () => Date;
};

export class CompleteGoogleOAuthCallback {
  constructor(private readonly dependencies: CompleteGoogleOAuthCallbackDependencies) {}

  async execute(
    input: CompleteGoogleOAuthCallbackInput,
  ): Promise<CompleteGoogleOAuthCallbackResult> {
    const stateData = await this.dependencies.stateStore.consume(input.state);

    if (!stateData) {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_INVALID_STATE",
        "Google OAuth state is invalid or expired",
      );
    }

    const tokenSet = await this.dependencies.provider.exchangeAuthorizationCode({
      code: input.code,
    });
    const existingConnection = await this.dependencies.googleConnectionRepository.findByTenantId(
      stateData.tenantId,
    );
    const encryptedRefreshToken =
      tokenSet.refreshToken === undefined
        ? existingConnection?.encryptedRefreshToken
        : this.dependencies.tokenCipher.encrypt(tokenSet.refreshToken);

    if (!encryptedRefreshToken) {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_AUTH_REQUIRED",
        "Google did not return a refresh token",
      );
    }

    const googleConnection = await this.dependencies.googleConnectionRepository.saveConnected({
      tenantId: stateData.tenantId,
      encryptedRefreshToken,
      scope: tokenSet.scope,
      connectedAt: this.dependencies.now(),
    });

    return {
      tenantId: stateData.tenantId,
      googleConnectionId: googleConnection.id,
    };
  }
}
