import type { FastifyInstance, FastifyRequest } from "fastify";

import {
  DisconnectGoogleConnection,
  GoogleBusinessProfileProviderError,
  SelectBusinessLocation,
} from "@brm/review-monitoring";

import type { AuthService } from "../auth/auth.service.js";

const errorResponseSchema = {
  properties: {
    code: { type: "string" },
    error: { type: "string" },
    requestId: { type: "string" },
  },
  required: ["error", "requestId"],
  type: "object",
};

export type RegisterMvpManagementRoutesOptions = {
  authService: AuthService;
  disconnectGoogleConnection: DisconnectGoogleConnection;
  selectBusinessLocation: SelectBusinessLocation;
};

export function registerMvpManagementRoutes(
  app: FastifyInstance,
  options: RegisterMvpManagementRoutesOptions,
): void {
  app.post(
    "/business-locations/select",
    {
      schema: {
        body: {
          properties: {
            locationId: { minLength: 1, type: "string" },
          },
          required: ["locationId"],
          type: "object",
        },
        response: {
          204: { description: "Business location selected" },
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
        summary: "Select business location to monitor",
        tags: ["Business Locations"],
      },
    },
    async (request, reply) => {
      try {
        const session = await getCurrentSession(request, options.authService);
        const body = request.body as { locationId: string };

        await options.selectBusinessLocation.execute({
          businessLocationId: body.locationId,
          tenantId: session.tenant.id,
        });

        return reply.status(204).send();
      } catch (error) {
        if (error instanceof GoogleBusinessProfileProviderError) {
          return reply.status(mapProviderErrorStatus(error)).send({
            code: error.code,
            error: error.message,
            requestId: request.id,
          });
        }

        throw error;
      }
    },
  );

  app.post(
    "/business-locations/:id/select",
    {
      schema: {
        params: {
          properties: {
            id: { minLength: 1, type: "string" },
          },
          required: ["id"],
          type: "object",
        },
        response: {
          204: { description: "Business location selected" },
          400: errorResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
        summary: "Select business location to monitor",
        tags: ["Business Locations"],
      },
    },
    async (request, reply) => {
      try {
        const session = await getCurrentSession(request, options.authService);
        const params = request.params as { id: string };

        await options.selectBusinessLocation.execute({
          businessLocationId: params.id,
          tenantId: session.tenant.id,
        });

        return reply.status(204).send();
      } catch (error) {
        if (error instanceof GoogleBusinessProfileProviderError) {
          return reply.status(mapProviderErrorStatus(error)).send({
            code: error.code,
            error: error.message,
            requestId: request.id,
          });
        }

        throw error;
      }
    },
  );

  app.post(
    "/integrations/google/disconnect",
    {
      schema: {
        response: {
          200: {
            properties: {
              disconnected: { type: "boolean" },
            },
            required: ["disconnected"],
            type: "object",
          },
          401: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
        summary: "Disconnect Google Business Profile",
        tags: ["Google Integration"],
      },
    },
    async (request) => {
      const session = await getCurrentSession(request, options.authService);

      return options.disconnectGoogleConnection.execute({
        tenantId: session.tenant.id,
      });
    },
  );
}

async function getCurrentSession(
  request: FastifyRequest,
  authService: AuthService,
): ReturnType<AuthService["getCurrentSession"]> {
  try {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      throw authenticationRequiredError();
    }

    const payload = await request.jwtVerify<{ sub: string }>();
    return authService.getCurrentSession(payload.sub);
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

function mapProviderErrorStatus(error: GoogleBusinessProfileProviderError): 400 | 404 {
  if (error.code === "GOOGLE_LOCATION_NOT_FOUND") {
    return 404;
  }

  return 400;
}
