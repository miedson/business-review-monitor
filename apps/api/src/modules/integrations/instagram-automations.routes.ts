import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";

import {
  matchesInstagramComment,
  type InstagramAutomationRepository,
  type InstagramAutomationWithActions,
  type InstagramConnectionRepository,
  type InstagramReviewProvider,
  type TokenCipher,
} from "@brm/review-monitoring";

import { AuthService } from "../auth/auth.service.js";

const automationInput = z.object({
  instagramConnectionId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).default("DRAFT"),
  scopeType: z.enum(["SPECIFIC_MEDIA", "ALL_MEDIA", "NEXT_MEDIA"]).default("SPECIFIC_MEDIA"),
  instagramMediaId: z.string().nullable().optional(),
  matchType: z.enum(["ANY_COMMENT", "CONTAINS", "EXACT_MATCH", "FULL_WORD"]).default("ANY_COMMENT"),
  keywords: z.array(z.string().trim().min(1)).default([]),
  excludedKeywords: z.array(z.string().trim().min(1)).default([]),
  publicReplyEnabled: z.boolean().default(false),
  publicReplyMessages: z.array(z.string().trim().min(1)).default([]),
  dmMessage: z.string().min(1).max(1000),
  dmLink: z.string().url().nullable().optional(),
  priority: z.number().int().min(0).max(1000).default(0),
  triggerFrequency: z
    .enum(["ONCE_PER_COMMENT", "ONCE_PER_USER_PER_POST", "ONCE_PER_USER"])
    .default("ONCE_PER_COMMENT"),
});
const routeSchema = { tags: ["Instagram Automations"], security: [{ bearerAuth: [] }] } as const;
type Options = {
  authService: AuthService;
  repository: InstagramAutomationRepository;
  connectionRepository: InstagramConnectionRepository;
  provider: InstagramReviewProvider;
  tokenCipher: TokenCipher;
};

export function registerInstagramAutomationRoutes(app: FastifyInstance, options: Options): void {
  app.get(
    "/automations",
    { schema: { ...routeSchema, summary: "List Instagram comment automations" } },
    async (request) => {
      const session = await sessionFor(request, options.authService);
      const query = z
        .object({
          page: z.coerce.number().int().min(1).default(1),
          pageSize: z.coerce.number().int().min(1).max(50).default(10),
        })
        .parse(request.query);
      return options.repository.listByTenant({ tenantId: session.tenant.id, ...query });
    },
  );
  app.get(
    "/automations/:id/executions",
    { schema: { ...routeSchema, summary: "List automation executions" } },
    async (request) => {
      const session = await sessionFor(request, options.authService);
      const params = z.object({ id: z.string() }).parse(request.params);
      const automation = await options.repository.findByIdForTenant({
        id: params.id,
        tenantId: session.tenant.id,
      });
      if (!automation) throw notFound();
      return {
        executions: await options.repository.listExecutions({
          tenantId: session.tenant.id,
          automationId: params.id,
        }),
      };
    },
  );
  app.get(
    "/automations/media",
    { schema: { ...routeSchema, summary: "List recent Instagram media for automation" } },
    async (request) => {
      const session = await sessionFor(request, options.authService);
      const connection = await options.connectionRepository.findByTenantId(session.tenant.id);
      if (
        !connection?.encryptedAccessToken ||
        !connection.instagramProfessionalAccountId ||
        connection.status !== "CONNECTED" ||
        !options.provider.listMedia
      )
        return { media: [] };
      return {
        media: await options.provider.listMedia({
          accessToken: options.tokenCipher.decrypt(connection.encryptedAccessToken),
          instagramAccountId: connection.instagramProfessionalAccountId,
          limit: 50,
        }),
      };
    },
  );
  app.post(
    "/automations",
    { schema: { ...routeSchema, summary: "Create Instagram comment automation" } },
    async (request) => {
      const session = await sessionFor(request, options.authService);
      const body = automationInput.parse(request.body);
      return options.repository.save({
        ...body,
        tenantId: session.tenant.id,
        createdBy: session.user.id,
        instagramMediaId: body.instagramMediaId ?? null,
        dmLink: body.dmLink ?? null,
        actions: [
          { type: "SEND_INSTAGRAM_DM", position: 0, config: {} },
          ...(body.publicReplyEnabled
            ? [{ type: "PUBLIC_COMMENT_REPLY" as const, position: 1, config: {} }]
            : []),
        ],
      });
    },
  );
  app.get(
    "/automations/:id",
    { schema: { ...routeSchema, summary: "Get automation" } },
    async (request) => {
      const session = await sessionFor(request, options.authService);
      const params = z.object({ id: z.string() }).parse(request.params);
      const automation = await options.repository.findByIdForTenant({
        id: params.id,
        tenantId: session.tenant.id,
      });
      if (!automation) throw notFound();
      return automation;
    },
  );
  app.patch(
    "/automations/:id",
    { schema: { ...routeSchema, summary: "Update automation" } },
    async (request) => {
      const session = await sessionFor(request, options.authService);
      const params = z.object({ id: z.string() }).parse(request.params);
      return options.repository.update({
        ...automationInput.partial().parse(request.body),
        id: params.id,
        tenantId: session.tenant.id,
        ...(typeof (request.body as Record<string, unknown>)?.publicReplyEnabled === "boolean"
          ? {
              actions: [
                { type: "SEND_INSTAGRAM_DM" as const, position: 0, config: {} },
                ...((request.body as Record<string, unknown>).publicReplyEnabled
                  ? [{ type: "PUBLIC_COMMENT_REPLY" as const, position: 1, config: {} }]
                  : []),
              ],
            }
          : {}),
      });
    },
  );
  app.post(
    "/automations/test",
    { schema: { ...routeSchema, summary: "Test an automation matcher" } },
    async (request) => {
      const body = z
        .object({
          text: z.string(),
          matchType: automationInput.shape.matchType,
          keywords: z.array(z.string()),
          excludedKeywords: z.array(z.string()).default([]),
        })
        .parse(request.body);
      return matchesInstagramComment(body);
    },
  );
}

async function sessionFor(request: FastifyRequest, authService: AuthService) {
  try {
    const payload = await request.jwtVerify<{ sub: string }>();
    return authService.getCurrentSession(payload.sub);
  } catch {
    throw notAuthorized();
  }
}
function notAuthorized() {
  const error = new Error("Authentication required") as Error & { statusCode: number };
  error.statusCode = 401;
  return error;
}
function notFound() {
  const error = new Error("Automation not found") as Error & { statusCode: number };
  error.statusCode = 404;
  return error;
}

export function automationResponse(automation: InstagramAutomationWithActions): Omit<
  InstagramAutomationWithActions,
  "actions"
> & {
  actions: Array<{ id: string; type: string; position: number }>;
} {
  return {
    ...automation,
    actions: automation.actions.map((action) => ({
      id: action.id,
      type: action.type,
      position: action.position,
    })),
  };
}
