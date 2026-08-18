import type { BusinessProfileReviewProvider } from "../ports/business-profile-review-provider.js";
import type { InstagramConnectionRepository } from "../ports/instagram-connection-repository.js";
import type { OAuthStateStore } from "../ports/oauth-state-store.js";
import type { TokenCipher } from "../ports/token-cipher.js";
import { GoogleBusinessProfileProviderError } from "../ports/review-provider-error.js";

export type CompleteInstagramOAuthCallbackInput = {
  code: string;
  state: string;
};

export type CompleteInstagramOAuthCallbackResult = {
  tenantId: string;
  instagramConnectionId: string;
};

export type CompleteInstagramOAuthCallbackDependencies = {
  provider: BusinessProfileReviewProvider;
  stateStore: OAuthStateStore;
  tokenCipher: TokenCipher;
  instagramConnectionRepository: InstagramConnectionRepository;
  now: () => Date;
};

export class CompleteInstagramOAuthCallback {
  constructor(
    private readonly dependencies: CompleteInstagramOAuthCallbackDependencies
  ) {}

  async execute(
    input: CompleteInstagramOAuthCallbackInput
  ): Promise<CompleteInstagramOAuthCallbackResult> {
    const stateData = await this.dependencies.stateStore.consume(input.state);

    if (!stateData) {
      throw new GoogleBusinessProfileProviderError(
        "INSTAGRAM_INVALID_STATE",
        "Instagram OAuth state is invalid or expired"
      );
    }

    const tokenSet = await this.dependencies.provider.exchangeAuthorizationCode({
      code: input.code
    });

    await this.dependencies.instagramConnectionRepository.findByTenantId(
      stateData.tenantId
    );

    const encryptedAccessToken = this.dependencies.tokenCipher.encrypt(
      tokenSet.accessToken
    );

    const tokenExpiresAt = tokenSet.expiresInSeconds
      ? new Date(Date.now() + tokenSet.expiresInSeconds * 1000)
      : undefined;

    let profile: { id: string; username: string; account_type: string } | null = null;

    if (this.dependencies.provider instanceof InstagramApiProvider) {
      profile = await this.dependencies.provider.getUserProfile(tokenSet.accessToken);
    }

    const instagramConnection =
      await this.dependencies.instagramConnectionRepository.saveConnected({
        tenantId: stateData.tenantId,
        instagramUserId: profile?.id ?? "unknown",
        username: profile?.username,
        accountType: profile?.account_type,
        encryptedAccessToken,
        scope: tokenSet.scope,
        connectedAt: this.dependencies.now(),
        tokenExpiresAt
      });

    return {
      tenantId: stateData.tenantId,
      instagramConnectionId: instagramConnection.id
    };
  }
}

import { InstagramApiProvider } from "../../adapters/meta/instagram-api-provider.js";