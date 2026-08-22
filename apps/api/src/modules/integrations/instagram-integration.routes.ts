import type {
  CompleteInstagramOAuthCallback,
  DisconnectInstagramConnection,
  ListInstagramAccounts,
  StartInstagramOAuthConnection
} from "@brm/review-monitoring";
import { GoogleBusinessProfileProviderError } from "@brm/review-monitoring";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AuthService } from "../auth/auth.service.js";
import type { InstagramConnectionRepository } from "@brm/review-monitoring";

const callbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().min(1).optional()
});

const accountsQuerySchema = z.object({
  pageToken: z.string().min(1).optional()
});

const instagramErrorResponseSchema = {
  type: "object",
  required: ["error", "requestId"],
  properties: {
    error: { type: "string" },
    code: { type: "string" },
    requestId: { type: "string" }
  }
};

const instagramConnectRouteSchema = {
  tags: ["Instagram Integration"],
  summary: "Start Instagram OAuth connection",
  description:
    "This endpoint returns an HTTP 302 redirect to the Instagram OAuth authorization URL. Swagger UI may show 'Failed to fetch' because the browser follows the redirect through fetch and blocks the cross-origin OAuth page. To test it manually, call this endpoint with a Bearer access token using curl or an HTTP client that does not auto-follow redirects, then open the Location header in the browser.",
  security: [{ bearerAuth: [] }],
  response: {
    302: {
      description: "Redirects to Instagram OAuth authorization URL",
      type: "string"
    },
    401: instagramErrorResponseSchema
  }
};

const instagramConnectUrlRouteSchema = {
  tags: ["Instagram Integration"],
  summary: "Build Instagram OAuth authorization URL",
  description:
    "Returns the Instagram OAuth authorization URL for browser clients that cannot send Authorization headers during a top-level redirect.",
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      properties: {
        authorizationUrl: { type: "string" }
      },
      required: ["authorizationUrl"],
      type: "object"
    },
    401: instagramErrorResponseSchema
  }
};

const instagramCallbackRouteSchema = {
  tags: ["Instagram Integration"],
  summary: "Complete Instagram OAuth callback",
  querystring: {
    type: "object",
    properties: {
      code: { type: "string" },
      state: { type: "string" },
      error: { type: "string" }
    }
  },
  response: {
    302: {
      description: "Redirects to the web integration settings page",
      type: "string"
    },
    400: instagramErrorResponseSchema,
    401: instagramErrorResponseSchema,
    403: instagramErrorResponseSchema,
    429: instagramErrorResponseSchema,
    502: instagramErrorResponseSchema
  }
};

const instagramAccountsRouteSchema = {
  tags: ["Instagram Integration"],
  summary: "List Instagram accounts",
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      pageToken: { type: "string" }
    }
  },
  response: {
    200: {
      type: "object",
      required: ["accounts"],
      properties: {
        accounts: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "username"],
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              username: { type: "string" }
            }
          }
        },
        nextPageToken: { type: "string" }
      }
    },
    400: instagramErrorResponseSchema,
    401: instagramErrorResponseSchema,
    403: instagramErrorResponseSchema,
    429: instagramErrorResponseSchema,
    502: instagramErrorResponseSchema
  }
};

const instagramDisconnectBodySchema = z.object({
  deleteData: z.boolean().default(false).optional()
});

const instagramDisconnectRouteSchema = {
  tags: ["Instagram Integration"],
  summary: "Disconnect Instagram integration",
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    properties: {
      deleteData: { type: "boolean", default: false }
    }
  },
  response: {
    200: {
      type: "object",
      required: ["disconnected"],
      properties: {
        disconnected: { type: "boolean" }
      }
    },
    400: instagramErrorResponseSchema,
    401: instagramErrorResponseSchema,
    403: instagramErrorResponseSchema,
    429: instagramErrorResponseSchema,
    502: instagramErrorResponseSchema
  }
};

export type RegisterInstagramIntegrationRoutesOptions = {
  authService: AuthService;
  startInstagramOAuthConnection: StartInstagramOAuthConnection;
  completeInstagramOAuthCallback: CompleteInstagramOAuthCallback;
  listInstagramAccounts: ListInstagramAccounts;
  disconnectInstagramConnection: DisconnectInstagramConnection;
  webUrl: string;
  instagramConnectionRepository: InstagramConnectionRepository;
};

export function registerInstagramIntegrationRoutes(
  app: FastifyInstance,
  options: RegisterInstagramIntegrationRoutesOptions
): void {
  app.get("/integrations/instagram/connect", { schema: instagramConnectRouteSchema }, async (request, reply) => {
    const userId = await getAuthenticatedUserId(request);
    const session = await options.authService.getCurrentSession(userId);
    const result = await options.startInstagramOAuthConnection.execute({
      userId: session.user.id,
      tenantId: session.tenant.id
    });

    return reply.redirect(result.authorizationUrl);
  });

  app.get(
    "/integrations/instagram/connect-url",
    { schema: instagramConnectUrlRouteSchema },
    async (request) => {
      const userId = await getAuthenticatedUserId(request);
      const session = await options.authService.getCurrentSession(userId);
      const result = await options.startInstagramOAuthConnection.execute({
        userId: session.user.id,
        tenantId: session.tenant.id
      });

      return { authorizationUrl: result.authorizationUrl };
    }
  );

  app.get("/integrations/instagram/callback", { schema: instagramCallbackRouteSchema }, async (request, reply) => {
    const query = callbackQuerySchema.parse(request.query);

    request.log.info({
      provider: "instagram",
      operation: "oauth_callback_received",
      hasCode: !!query.code,
      hasState: !!query.state,
      hasError: !!query.error
    });

    if (query.error) {
      request.log.warn({
        provider: "instagram",
        operation: "oauth_callback_error_from_meta",
        metaError: query.error
      });
      return reply.redirect(buildInstagramRedirectUrl(options.webUrl, "error"));
    }

    if (!query.code || !query.state) {
      request.log.warn({
        provider: "instagram",
        operation: "oauth_callback_invalid_missing_params"
      });
      return reply.redirect(buildInstagramRedirectUrl(options.webUrl, "error"));
    }

    try {
      await options.completeInstagramOAuthCallback.execute({
        code: query.code,
        state: query.state
      });

      request.log.info({
        provider: "instagram",
        operation: "oauth_callback_completed_success"
      });
    } catch (error) {
      if (error instanceof GoogleBusinessProfileProviderError) {
        request.log.error({
          provider: "instagram",
          operation: "oauth_callback_provider_error",
          errorCode: error.code,
          errorMessage: error.message
        });

        const redirectOnError = [
          "INSTAGRAM_INVALID_STATE",
          "INSTAGRAM_TOKEN_REVOKED",
          "INSTAGRAM_TOKEN_EXCHANGE_FAILED",
          "INSTAGRAM_PERMISSION_DENIED",
          "INSTAGRAM_RATE_LIMITED",
          "INSTAGRAM_REFRESH_FAILED",
          "INSTAGRAM_API_UNAVAILABLE"
        ].includes(error.code);

        if (redirectOnError) {
          return reply.redirect(buildInstagramRedirectUrl(options.webUrl, "error"));
        }

        return reply.status(mapProviderErrorStatus(error)).send({
          error: error.message,
          code: error.code,
          requestId: request.id
        });
      }

      request.log.error({
        provider: "instagram",
        operation: "oauth_callback_unexpected_error",
        errorName: error instanceof Error ? error.name : "Unknown",
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }

    return reply.redirect(buildInstagramRedirectUrl(options.webUrl, "connected"));
  });

  app.get("/integrations/instagram/accounts", { schema: instagramAccountsRouteSchema }, async (request, reply) => {
    const userId = await getAuthenticatedUserId(request);
    const session = await options.authService.getCurrentSession(userId);
    const query = accountsQuerySchema.parse(request.query);

    try {
      const result = await options.listInstagramAccounts.execute({
        tenantId: session.tenant.id,
        ...(query.pageToken ? { pageToken: query.pageToken } : {})
      });

      return reply.send(result);
    } catch (error) {
      if (error instanceof GoogleBusinessProfileProviderError) {
        return reply.status(mapProviderErrorStatus(error)).send({
          error: error.message,
          code: error.code,
          requestId: request.id
        });
      }

      throw error;
    }
  });

  app.get("/integrations/instagram/status", { schema: { tags: ["Instagram Integration"], summary: "Get Instagram connection status", security: [{ bearerAuth: [] }], response: { 200: { type: "object", required: ["connected"], properties: { connected: { type: "boolean" }, username: { type: ["string", "null"] }, status: { type: "string" } } } } } }, async (request, reply) => {
    const userId = await getAuthenticatedUserId(request);
    const session = await options.authService.getCurrentSession(userId);
    const connection = await options.instagramConnectionRepository.findByTenantId(session.tenant.id);
    return reply.send({ connected: connection?.status === "CONNECTED" && Boolean(connection.encryptedAccessToken), username: connection?.username ?? null, status: connection?.status ?? "DISCONNECTED" });
  });

  app.post("/integrations/instagram/disconnect", { schema: instagramDisconnectRouteSchema }, async (request, reply) => {
    const userId = await getAuthenticatedUserId(request);
    const session = await options.authService.getCurrentSession(userId);
    const body = instagramDisconnectBodySchema.parse(request.body);

    try {
      const result = await options.disconnectInstagramConnection.execute({
        tenantId: session.tenant.id,
        deleteData: body.deleteData ?? false
      });

      return reply.send(result);
    } catch (error) {
      if (error instanceof GoogleBusinessProfileProviderError) {
        return reply.status(mapProviderErrorStatus(error)).send({
          error: error.message,
          code: error.code,
          requestId: request.id
        });
      }

      throw error;
    }
  });
}

function buildInstagramRedirectUrl(webUrl: string, status: "connected" | "error"): string {
  const url = new URL("/settings/integrations", webUrl);

  url.searchParams.set("instagram", status);

  return url.toString();
}

function getBearerToken(request: FastifyRequest): string {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    throw authenticationRequiredError();
  }

  return authorization.slice("Bearer ".length);
}

async function getAuthenticatedUserId(request: FastifyRequest): Promise<string> {
  try {
    getBearerToken(request);
    const payload = await request.jwtVerify<{ sub: string }>();
    return payload.sub;
  } catch {
    throw authenticationRequiredError();
  }
}

function authenticationRequiredError(): Error & { statusCode: number } {
  const error = new Error("Authentication required") as Error & {
    statusCode: number;
  };
  error.statusCode = 401;
  return error;
}

function mapProviderErrorStatus(error: GoogleBusinessProfileProviderError): 400 | 401 | 403 | 429 | 502 {
  if (
    error.code === "INSTAGRAM_INVALID_CALLBACK" ||
    error.code === "INSTAGRAM_INVALID_STATE"
  ) {
    return 400;
  }

  if (
    error.code === "INSTAGRAM_AUTH_REQUIRED" ||
    error.code === "INSTAGRAM_TOKEN_REVOKED"
  ) {
    return 401;
  }

  if (error.code === "INSTAGRAM_PERMISSION_DENIED") {
    return 403;
  }

  if (error.code === "INSTAGRAM_RATE_LIMITED") {
    return 429;
  }

  return 502;
}
