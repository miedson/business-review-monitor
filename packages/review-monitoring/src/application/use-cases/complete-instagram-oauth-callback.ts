import type { InstagramReviewProvider } from "../ports/business-profile-review-provider.js";
import type { InstagramConnectionRepository } from "../ports/instagram-connection-repository.js";
import type { OAuthStateStore } from "../ports/oauth-state-store.js";
import type { TokenCipher } from "../ports/token-cipher.js";
import { GoogleBusinessProfileProviderError } from "../ports/review-provider-error.js";

type Logger = {
  info: (meta: Record<string, unknown>, msg?: string) => void;
  warn: (meta: Record<string, unknown>, msg?: string) => void;
  error: (meta: Record<string, unknown>, msg?: string) => void;
};

export type CompleteInstagramOAuthCallbackInput = {
  code: string;
  state: string;
};

export type CompleteInstagramOAuthCallbackResult = {
  tenantId: string;
  instagramConnectionId: string;
};

export type CompleteInstagramOAuthCallbackDependencies = {
  provider: InstagramReviewProvider;
  stateStore: OAuthStateStore;
  tokenCipher: TokenCipher;
  instagramConnectionRepository: InstagramConnectionRepository;
  now: () => Date;
  logger?: Logger;
};

export class CompleteInstagramOAuthCallback {
  constructor(
    private readonly dependencies: CompleteInstagramOAuthCallbackDependencies
  ) {}

  async execute(
    input: CompleteInstagramOAuthCallbackInput
  ): Promise<CompleteInstagramOAuthCallbackResult> {
    const logger = this.dependencies.logger ?? console;

    logger.info({
      provider: "instagram",
      operation: "oauth_callback_started"
    });

    const stateData = await this.dependencies.stateStore.consume(input.state);

    if (!stateData) {
      logger.warn({
        provider: "instagram",
        operation: "oauth_state_invalid_or_expired"
      });
      throw new GoogleBusinessProfileProviderError(
        "INSTAGRAM_INVALID_STATE",
        "Instagram OAuth state is invalid or expired"
      );
    }

    logger.info({
      provider: "instagram",
      operation: "oauth_state_validated",
      tenantId: stateData.tenantId
    });

    const tokenSet = await this.dependencies.provider.exchangeAuthorizationCode({
      code: input.code
    });

    logger.info({
      provider: "instagram",
      operation: "authorization_code_exchange_completed"
    });

    await this.dependencies.instagramConnectionRepository.findByTenantId(
      stateData.tenantId
    );

    const encryptedAccessToken = this.dependencies.tokenCipher.encrypt(
      tokenSet.accessToken
    );

    logger.info({
      provider: "instagram",
      operation: "token_encrypted"
    });

    const tokenExpiresAt = tokenSet.expiresInSeconds
      ? new Date(Date.now() + tokenSet.expiresInSeconds * 1000)
      : undefined;

    logger.info({
      provider: "instagram",
      operation: "instagram_profile_resolution_started"
    });

    const profile = await this.dependencies.provider.getUserProfile(tokenSet.accessToken);

    logger.info({
      provider: "instagram",
      operation: "instagram_profile_resolved",
      instagramUserId: profile.id,
      username: profile.username,
      accountType: profile.account_type
    });

    const existingConnection =
      await this.dependencies.instagramConnectionRepository.findByTenantId(
        stateData.tenantId
      );

    let instagramProfessionalAccountId: string | null = null;

    if (existingConnection) {
      if (existingConnection.instagramUserId === profile.id) {
        instagramProfessionalAccountId = existingConnection.instagramProfessionalAccountId;
      }
    }

    logger.info({
      provider: "instagram",
      operation: "instagram_connection_identity_initialized",
      instagramUserId: profile.id,
      hasWebhookAccountMapping: instagramProfessionalAccountId !== null
    });

    const instagramConnection =
      await this.dependencies.instagramConnectionRepository.saveConnected({
        tenantId: stateData.tenantId,
        instagramUserId: profile.id,
        instagramProfessionalAccountId: instagramProfessionalAccountId ?? undefined,
        username: profile.username,
        accountType: profile.account_type,
        encryptedAccessToken,
        scope: tokenSet.scope,
        connectedAt: this.dependencies.now(),
        tokenExpiresAt
      });

    logger.info({
      provider: "instagram",
      operation: "instagram_connection_persisted",
      instagramUserId: profile.id,
      instagramProfessionalAccountId,
      instagramConnectionId: instagramConnection.id,
      tenantId: stateData.tenantId
    });

    return {
      tenantId: stateData.tenantId,
      instagramConnectionId: instagramConnection.id
    };
  }
}