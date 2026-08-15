import type {
  CompleteGoogleOAuthCallback,
  ListGoogleAccounts,
  ListGoogleLocations,
  ListGoogleReviews,
  RequestGoogleReviewSync,
  StartGoogleOAuthConnection
} from "@brm/review-monitoring";
import { GoogleBusinessProfileProviderError } from "@brm/review-monitoring";
import {
  DisconnectGoogleConnection,
  SelectBusinessLocation
} from "@brm/review-monitoring";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { AuthService } from "../auth/auth.service.js";

const callbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().min(1).optional()
});

const accountsQuerySchema = z.object({
  pageToken: z.string().min(1).optional()
});

const locationsQuerySchema = z.object({
  accountId: z.string().min(1),
  pageToken: z.string().min(1).optional()
});

const reviewsQuerySchema = z.object({
  accountId: z.string().min(1),
  locationId: z.string().min(1),
  pageToken: z.string().min(1).optional()
});

const reviewCacheBodySchema = z.object({
  accountId: z.string().min(1),
  locationId: z.string().min(1),
  pageToken: z.string().min(1).optional()
});

const googleErrorResponseSchema = {
  type: "object",
  required: ["error", "requestId"],
  properties: {
    error: { type: "string" },
    code: { type: "string" },
    requestId: { type: "string" }
  }
};

const googleConnectRouteSchema = {
  tags: ["Google Integration"],
  summary: "Start Google OAuth connection",
  description:
    "This endpoint returns an HTTP 302 redirect to the Google OAuth authorization URL. Swagger UI may show 'Failed to fetch' because the browser follows the redirect through fetch and blocks the cross-origin OAuth page. To test it manually, call this endpoint with a Bearer access token using curl or an HTTP client that does not auto-follow redirects, then open the Location header in the browser.",
  security: [{ bearerAuth: [] }],
  response: {
    302: {
      description: "Redirects to Google OAuth authorization URL",
      type: "string"
    },
    401: googleErrorResponseSchema
  }
};

const googleConnectUrlRouteSchema = {
  tags: ["Google Integration"],
  summary: "Build Google OAuth authorization URL",
  description:
    "Returns the Google OAuth authorization URL for browser clients that cannot send Authorization headers during a top-level redirect.",
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      properties: {
        authorizationUrl: { type: "string" }
      },
      required: ["authorizationUrl"],
      type: "object"
    },
    401: googleErrorResponseSchema
  }
};

const googleCallbackRouteSchema = {
  tags: ["Google Integration"],
  summary: "Complete Google OAuth callback",
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
    400: googleErrorResponseSchema,
    401: googleErrorResponseSchema,
    403: googleErrorResponseSchema,
    429: googleErrorResponseSchema,
    502: googleErrorResponseSchema
  }
};

const googleAccountsRouteSchema = {
  tags: ["Google Integration"],
  summary: "List Google Business Profile accounts",
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
            required: ["id", "name"],
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              accountName: { type: "string" }
            }
          }
        },
        nextPageToken: { type: "string" }
      }
    },
    400: googleErrorResponseSchema,
    401: googleErrorResponseSchema,
    403: googleErrorResponseSchema,
    429: googleErrorResponseSchema,
    502: googleErrorResponseSchema
  }
};

const googleLocationsRouteSchema = {
  tags: ["Google Integration"],
  summary: "List Google Business Profile locations",
  description:
    "Lists Google Business Profile locations accessible for a connected account.",
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    required: ["accountId"],
    properties: {
      accountId: {
        type: "string",
        examples: ["accounts/1001"]
      },
      pageToken: {
        type: "string"
      }
    }
  },
  response: {
    200: {
      type: "object",
      required: ["locations"],
      properties: {
        locations: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "accountId", "name"],
            properties: {
              id: { type: "string" },
              accountId: { type: "string" },
              name: { type: "string" },
              storeCode: { type: "string" },
              isVerified: { type: "boolean" }
            }
          }
        },
        nextPageToken: { type: "string" }
      }
    },
    400: googleErrorResponseSchema,
    401: googleErrorResponseSchema,
    403: googleErrorResponseSchema,
    429: googleErrorResponseSchema,
    502: googleErrorResponseSchema
  }
} as const;

const googleReviewsRouteSchema = {
  tags: ["Google Integration"],
  summary: "List Google Business Profile reviews",
  description:
    "Lists paginated Google Business Profile reviews for a connected and verified location.",
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    required: ["accountId", "locationId"],
    properties: {
      accountId: {
        type: "string",
        examples: ["accounts/1001"]
      },
      locationId: {
        type: "string",
        examples: ["locations/2001"]
      },
      pageToken: {
        type: "string"
      }
    }
  },
  response: {
    200: {
      type: "object",
      required: ["reviews", "averageRating", "totalReviewCount"],
      properties: {
        reviews: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "starRating", "createdAt", "updatedAt"],
            properties: {
              id: { type: "string" },
              reviewerName: { type: "string" },
              starRating: {
                type: "string",
                enum: ["ONE", "TWO", "THREE", "FOUR", "FIVE"]
              },
              comment: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" }
            }
          }
        },
        averageRating: { type: "number" },
        totalReviewCount: { type: "number" },
        nextPageToken: { type: "string" }
      }
    },
    400: googleErrorResponseSchema,
    401: googleErrorResponseSchema,
    403: googleErrorResponseSchema,
    429: googleErrorResponseSchema,
    502: googleErrorResponseSchema
  }
} as const;

const googleReviewCacheRouteSchema = {
  tags: ["Google Integration"],
  summary: "Enqueue manual Google review sync",
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["accountId", "locationId"],
    properties: {
      accountId: { type: "string", examples: ["accounts/1001"] },
      locationId: { type: "string", examples: ["locations/2001"] }
    }
  },
  response: {
    202: {
      type: "object",
      required: ["jobId"],
      properties: {
        jobId: { type: "string" }
      }
    },
    400: googleErrorResponseSchema,
    401: googleErrorResponseSchema,
    403: googleErrorResponseSchema,
    429: googleErrorResponseSchema,
    502: googleErrorResponseSchema
  }
} as const;

export type RegisterGoogleIntegrationRoutesOptions = {
  authService: AuthService;
  startGoogleOAuthConnection: StartGoogleOAuthConnection;
  completeGoogleOAuthCallback: CompleteGoogleOAuthCallback;
  listGoogleAccounts: ListGoogleAccounts;
  listGoogleLocations: ListGoogleLocations;
  listGoogleReviews: ListGoogleReviews;
  requestGoogleReviewSync: RequestGoogleReviewSync;
  selectBusinessLocation: SelectBusinessLocation;
  disconnectGoogleConnection: DisconnectGoogleConnection;
  webUrl: string;
};

export function registerGoogleIntegrationRoutes(
  app: FastifyInstance,
  options: RegisterGoogleIntegrationRoutesOptions
): void {
  app.get("/integrations/google/connect", { schema: googleConnectRouteSchema }, async (request, reply) => {
    const userId = await getAuthenticatedUserId(request);
    const session = await options.authService.getCurrentSession(userId);
    const result = await options.startGoogleOAuthConnection.execute({
      userId: session.user.id,
      tenantId: session.tenant.id
    });

    return reply.redirect(result.authorizationUrl);
  });

  app.get(
    "/integrations/google/connect-url",
    { schema: googleConnectUrlRouteSchema },
    async (request) => {
      const userId = await getAuthenticatedUserId(request);
      const session = await options.authService.getCurrentSession(userId);
      const result = await options.startGoogleOAuthConnection.execute({
        userId: session.user.id,
        tenantId: session.tenant.id
      });

      return { authorizationUrl: result.authorizationUrl };
    }
  );

  app.get("/integrations/google/callback", { schema: googleCallbackRouteSchema }, async (request, reply) => {
    const query = callbackQuerySchema.parse(request.query);

    if (query.error) {
      return reply.redirect(buildGoogleRedirectUrl(options.webUrl, "error"));
    }

    if (!query.code || !query.state) {
      throw new GoogleBusinessProfileProviderError(
        "GOOGLE_INVALID_CALLBACK",
        "Google OAuth callback is invalid"
      );
    }

    try {
      await options.completeGoogleOAuthCallback.execute({
        code: query.code,
        state: query.state
      });
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

    return reply.redirect(buildGoogleRedirectUrl(options.webUrl, "connected"));
  });

  app.get("/integrations/google/accounts", { schema: googleAccountsRouteSchema }, async (request, reply) => {
    const userId = await getAuthenticatedUserId(request);
    const session = await options.authService.getCurrentSession(userId);
    const query = accountsQuerySchema.parse(request.query);

    try {
      const result = await options.listGoogleAccounts.execute({
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

  app.get(
    "/integrations/google/locations",
    { schema: googleLocationsRouteSchema },
    async (request, reply) => {
      const userId = await getAuthenticatedUserId(request);
      const session = await options.authService.getCurrentSession(userId);
      const query = locationsQuerySchema.parse(request.query);

      try {
        const result = await options.listGoogleLocations.execute({
          tenantId: session.tenant.id,
          accountId: query.accountId,
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
    }
  );

  app.get(
    "/integrations/google/reviews",
    { schema: googleReviewsRouteSchema },
    async (request, reply) => {
      const userId = await getAuthenticatedUserId(request);
      const session = await options.authService.getCurrentSession(userId);
      const query = reviewsQuerySchema.parse(request.query);

      try {
        const result = await options.listGoogleReviews.execute({
          tenantId: session.tenant.id,
          accountId: query.accountId,
          locationId: query.locationId,
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
    }
  );

  app.post(
    "/integrations/google/reviews/cache",
    { schema: googleReviewCacheRouteSchema },
    async (request, reply) => {
      const userId = await getAuthenticatedUserId(request);
      const session = await options.authService.getCurrentSession(userId);
      const body = reviewCacheBodySchema.parse(request.body);

      try {
        const result = await options.requestGoogleReviewSync.execute({
          tenantId: session.tenant.id,
          accountId: body.accountId,
          locationId: body.locationId
        });

        return reply.status(202).send(result);
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
    }
  );
}
function buildGoogleRedirectUrl(webUrl: string, status: "connected" | "error"): string {
  const url = new URL("/settings/integrations", webUrl);

  url.searchParams.set("google", status);

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
    error.code === "GOOGLE_INVALID_CALLBACK" ||
    error.code === "GOOGLE_INVALID_STATE"
  ) {
    return 400;
  }

  if (
    error.code === "GOOGLE_AUTH_REQUIRED" ||
    error.code === "GOOGLE_TOKEN_REVOKED"
  ) {
    return 401;
  }

  if (error.code === "GOOGLE_PERMISSION_DENIED") {
    return 403;
  }

  if (error.code === "GOOGLE_RATE_LIMITED") {
    return 429;
  }

  return 502;
}
