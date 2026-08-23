import type { FastifyInstance, FastifyRequest } from "fastify";

import type {
  ListGoogleAccounts,
  ListGoogleLocations,
  ListInstagramAccounts,
} from "@brm/review-monitoring";

import { AuthService } from "../auth/auth.service.js";

const integrationStatusRouteSchema = {
  tags: ["Integration Status"],
  summary: "Get integration statuses",
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      type: "object",
      required: ["google", "instagram"],
      properties: {
        google: {
          type: "object",
          required: ["connected", "accountName", "locationCount"],
          properties: {
            connected: { type: "boolean" },
            accountName: { type: ["string", "null"] },
            locationCount: { type: "integer" },
          },
        },
        instagram: {
          type: "object",
          required: ["connected", "username"],
          properties: {
            connected: { type: "boolean" },
            username: { type: ["string", "null"] },
          },
        },
      },
    },
  },
} as const;

type IntegrationStatusRouteOptions = {
  authService: AuthService;
  listGoogleAccounts: ListGoogleAccounts;
  listGoogleLocations: ListGoogleLocations;
  listInstagramAccounts: ListInstagramAccounts;
};

export function registerIntegrationStatusRoute(
  app: FastifyInstance,
  options: IntegrationStatusRouteOptions,
): void {
  app.get("/integrations/status", { schema: integrationStatusRouteSchema }, async (request) => {
    const userId = await getAuthenticatedUserId(request);
    const session = await options.authService.getCurrentSession(userId);

    const [google, instagram] = await Promise.all([
      getGoogleStatus(options, session.tenant.id),
      getInstagramStatus(options.listInstagramAccounts, session.tenant.id),
    ]);

    return { google, instagram };
  });
}

async function getGoogleStatus(
  options: Pick<IntegrationStatusRouteOptions, "listGoogleAccounts" | "listGoogleLocations">,
  tenantId: string,
): Promise<{ connected: boolean; accountName: string | null; locationCount: number }> {
  try {
    const result = await options.listGoogleAccounts.execute({ tenantId });
    const locations = await Promise.all(
      result.accounts.map((account) =>
        options.listGoogleLocations.execute({ tenantId, accountId: account.id }),
      ),
    );

    return {
      connected: result.accounts.length > 0,
      accountName: result.accounts[0]?.accountName ?? result.accounts[0]?.name ?? null,
      locationCount: locations.reduce((total, page) => total + page.locations.length, 0),
    };
  } catch {
    return { connected: false, accountName: null, locationCount: 0 };
  }
}

async function getInstagramStatus(
  listInstagramAccounts: ListInstagramAccounts,
  tenantId: string,
): Promise<{ connected: boolean; username: string | null }> {
  try {
    const result = await listInstagramAccounts.execute({ tenantId });
    return {
      connected: result.accounts.length > 0,
      username: result.accounts[0]?.username ?? null,
    };
  } catch {
    return { connected: false, username: null };
  }
}

async function getAuthenticatedUserId(request: FastifyRequest): Promise<string> {
  try {
    const payload = await request.jwtVerify<{ sub: string }>();
    return payload.sub;
  } catch {
    const error = new Error("Authentication required") as Error & { statusCode: number };
    error.statusCode = 401;
    throw error;
  }
}
