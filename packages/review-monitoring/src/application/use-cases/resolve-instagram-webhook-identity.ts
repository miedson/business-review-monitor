import type { InstagramReviewProvider } from "../ports/business-profile-review-provider.js";
import type {
  InstagramConnectionRepository,
  StoredInstagramConnection,
} from "../ports/instagram-connection-repository.js";
import type { TokenCipher } from "../ports/token-cipher.js";

type Logger = {
  info: (meta: Record<string, unknown>, msg?: string) => void;
  warn: (meta: Record<string, unknown>, msg?: string) => void;
  error: (meta: Record<string, unknown>, msg?: string) => void;
};

export type ResolveInstagramWebhookIdentityInput = {
  webhookAccountId: string;
};

export type ResolveInstagramWebhookIdentityResult = {
  connection: StoredInstagramConnection;
  resolvedInstagramUserId: string;
};

export type ResolveInstagramWebhookIdentityDependencies = {
  instagramConnectionRepository: InstagramConnectionRepository;
  provider: InstagramReviewProvider;
  tokenCipher: TokenCipher;
  logger?: Logger;
};

export class ResolveInstagramWebhookIdentity {
  constructor(private readonly dependencies: ResolveInstagramWebhookIdentityDependencies) {}

  async execute(
    input: ResolveInstagramWebhookIdentityInput,
  ): Promise<ResolveInstagramWebhookIdentityResult | null> {
    const logger = this.dependencies.logger ?? console;

    logger.info({
      operation: "instagram_webhook_identity_resolution_started",
      webhookAccountId: input.webhookAccountId,
    });

    const existingConnection =
      await this.dependencies.instagramConnectionRepository.findByProfessionalAccountId(
        input.webhookAccountId,
      );

    if (existingConnection) {
      logger.info({
        operation: "instagram_webhook_identity_fast_path_resolved",
        webhookAccountId: input.webhookAccountId,
        connectionId: existingConnection.id,
        tenantId: existingConnection.tenantId,
      });

      return {
        connection: existingConnection,
        resolvedInstagramUserId: existingConnection.instagramUserId,
      };
    }

    const candidates =
      await this.dependencies.instagramConnectionRepository.findConnectedWithoutProfessionalAccountId();

    logger.info({
      operation: "instagram_webhook_identity_discovery_started",
      webhookAccountId: input.webhookAccountId,
      candidateCount: candidates.length,
    });

    for (const candidate of candidates) {
      if (!candidate.encryptedAccessToken) {
        logger.warn({
          operation: "instagram_webhook_identity_candidate_skipped",
          webhookAccountId: input.webhookAccountId,
          connectionId: candidate.id,
          reason: "missing_encrypted_access_token",
        });
        continue;
      }

      const accessToken = this.dependencies.tokenCipher.decrypt(candidate.encryptedAccessToken);

      try {
        const resolved = await this.dependencies.provider.resolveWebhookAccountId({
          webhookAccountId: input.webhookAccountId,
          accessToken,
        });

        logger.info({
          operation: "instagram_webhook_identity_candidate_checked",
          webhookAccountId: input.webhookAccountId,
          candidateConnectionId: candidate.id,
          returnedInstagramUserId: resolved.id,
          matched: resolved.id === candidate.instagramUserId,
        });

        if (resolved.id === candidate.instagramUserId) {
          await this.dependencies.instagramConnectionRepository.setProfessionalAccountId({
            connectionId: candidate.id,
            professionalAccountId: input.webhookAccountId,
          });

          logger.info({
            operation: "instagram_webhook_identity_persisted",
            webhookAccountId: input.webhookAccountId,
            instagramUserId: candidate.instagramUserId,
            connectionId: candidate.id,
            tenantId: candidate.tenantId,
          });

          return {
            connection: {
              ...candidate,
              instagramProfessionalAccountId: input.webhookAccountId,
            },
            resolvedInstagramUserId: candidate.instagramUserId,
          };
        }
      } catch (error) {
        const isTransient = this.isTransientResolutionError(error);

        if (isTransient) {
          logger.error({
            operation: "instagram_webhook_identity_resolution_transient_error",
            webhookAccountId: input.webhookAccountId,
            candidateConnectionId: candidate.id,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }

        logger.warn({
          operation: "instagram_webhook_identity_candidate_rejected",
          webhookAccountId: input.webhookAccountId,
          candidateConnectionId: candidate.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info({
      operation: "instagram_webhook_identity_resolution_failed",
      webhookAccountId: input.webhookAccountId,
      reason: "no_matching_connection",
    });

    return null;
  }

  private isTransientResolutionError(error: unknown): boolean {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as Record<string, unknown>).code === "string"
    ) {
      const code = (error as Record<string, unknown>).code as string;
      return code === "INSTAGRAM_API_UNAVAILABLE" || code === "INSTAGRAM_RATE_LIMITED";
    }

    return false;
  }
}
