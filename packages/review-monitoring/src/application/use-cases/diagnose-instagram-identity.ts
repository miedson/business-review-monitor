import type { InstagramReviewProvider } from "../ports/business-profile-review-provider.js";
import type { InstagramConnectionRepository } from "../ports/instagram-connection-repository.js";
import type { TokenCipher } from "../ports/token-cipher.js";
import { GoogleBusinessProfileProviderError } from "../ports/review-provider-error.js";

type Logger = {
  info: (meta: Record<string, unknown>, msg?: string) => void;
  warn: (meta: Record<string, unknown>, msg?: string) => void;
  error: (meta: Record<string, unknown>, msg?: string) => void;
};

export type InstagramIdentityDiagnosisResult = {
  username: string;
  oauthProfileId: string;
  webhookEntryId: string | undefined;
  profileEndpoint: {
    endpoint: string;
    httpStatus: number;
    responseKeys: string[];
    fields: Record<string, unknown>;
  };
  additionalEndpoints: Array<{
    endpoint: string;
    httpStatus: number;
    responseKeys: string[];
    fields: Record<string, unknown>;
  }>;
  tokenValid: boolean;
  apiVersion: string;
  graphApiHost: string;
};

export type DiagnoseInstagramIdentityDependencies = {
  instagramConnectionRepository: InstagramConnectionRepository;
  provider: InstagramReviewProvider;
  tokenCipher: TokenCipher;
  graphApiBase: string;
  graphApiVersion: string;
  logger?: Logger;
};

export class DiagnoseInstagramIdentity {
  constructor(
    private readonly dependencies: DiagnoseInstagramIdentityDependencies
  ) {}

  async execute(
    tenantId: string
  ): Promise<InstagramIdentityDiagnosisResult> {
    const logger = this.dependencies.logger ?? console;

    logger.info({
      operation: "instagram_identity_diagnosis_started",
      tenantId
    });

    const connection =
      await this.dependencies.instagramConnectionRepository.findByTenantId(
        tenantId
      );

    if (!connection) {
      throw new GoogleBusinessProfileProviderError(
        "INSTAGRAM_ACCOUNT_NOT_FOUND",
        "Instagram connection not found for tenant"
      );
    }

    if (!connection.encryptedAccessToken) {
      throw new GoogleBusinessProfileProviderError(
        "INSTAGRAM_AUTH_REQUIRED",
        "Instagram access token not available"
      );
    }

    const accessToken = this.dependencies.tokenCipher.decrypt(
      connection.encryptedAccessToken
    );

    logger.info({
      operation: "instagram_token_decrypted",
      hasToken: accessToken.length > 0
    });

    const apiVersion = this.dependencies.graphApiVersion;
    const graphApiBase = this.dependencies.graphApiBase;

    const profileResult = await this.callProfileEndpoint(
      accessToken,
      graphApiBase,
      apiVersion,
      logger
    );

    const additionalEndpoints = await this.callAdditionalEndpoints(
      accessToken,
      graphApiBase,
      apiVersion,
      logger
    );

    const result: InstagramIdentityDiagnosisResult = {
      username: connection.username ?? "unknown",
      oauthProfileId: connection.instagramUserId,
      webhookEntryId: connection.instagramProfessionalAccountId ?? undefined,
      profileEndpoint: profileResult,
      additionalEndpoints,
      tokenValid: true,
      apiVersion,
      graphApiHost: graphApiBase
    };

    logger.info({
      operation: "instagram_identity_diagnosis_completed",
      tenantId,
      oauthProfileId: result.oauthProfileId,
      webhookEntryId: result.webhookEntryId,
      profileEndpoint: {
        httpStatus: profileResult.httpStatus,
        responseKeys: profileResult.responseKeys
      },
      additionalEndpointsCount: additionalEndpoints.length
    });

    return result;
  }

  private async callProfileEndpoint(
    accessToken: string,
    graphApiBase: string,
    apiVersion: string,
    logger: Logger
  ): Promise<InstagramIdentityDiagnosisResult["profileEndpoint"]> {
    const url = new URL(`${graphApiBase}/${apiVersion}/me`);
    url.searchParams.set("fields", "id,username,account_type,media_count");
    url.searchParams.set("access_token", accessToken);

    logger.info({
      operation: "instagram_diagnose_call_started",
      endpoint: "/me",
      fields: "id,username,account_type,media_count"
    });

    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    const payload = (await response.json()) as Record<string, unknown>;

    const result = {
      endpoint: `/${apiVersion}/me?fields=id,username,account_type,media_count`,
      httpStatus: response.status,
      responseKeys: Object.keys(payload),
      fields: payload
    };

    logger.info({
      operation: "instagram_diagnose_call_completed",
      endpoint: "/me",
      httpStatus: response.status,
      responseKeys: result.responseKeys
    });

    return result;
  }

  private async callAdditionalEndpoints(
    accessToken: string,
    graphApiBase: string,
    apiVersion: string,
    logger: Logger
  ): Promise<InstagramIdentityDiagnosisResult["additionalEndpoints"]> {
    const endpoints: InstagramIdentityDiagnosisResult["additionalEndpoints"] = [];

    const endpointConfigs = [
      {
        path: "/me",
        fields: "id,username,account_type,media_count,ig_id"
      },
      {
        path: "/me",
        fields: "id,username,account_type,media_count,professional_account_id"
      },
      {
        path: "/me",
        fields: "id,username,account_type,media_count,business_discovery.username"
      }
    ];

    for (const config of endpointConfigs) {
      const url = new URL(`${graphApiBase}/${apiVersion}${config.path}`);
      url.searchParams.set("fields", config.fields);
      url.searchParams.set("access_token", accessToken);

      logger.info({
        operation: "instagram_diagnose_call_started",
        endpoint: config.path,
        fields: config.fields
      });

      const response = await fetch(url, {
        headers: {
          Accept: "application/json"
        }
      });

      const payload = (await response.json()) as Record<string, unknown>;

      const result = {
        endpoint: `${config.path}?fields=${config.fields}`,
        httpStatus: response.status,
        responseKeys: Object.keys(payload),
        fields: payload
      };

      logger.info({
        operation: "instagram_diagnose_call_completed",
        endpoint: config.path,
        httpStatus: response.status,
        responseKeys: result.responseKeys
      });

      endpoints.push(result);
    }

    return endpoints;
  }
}