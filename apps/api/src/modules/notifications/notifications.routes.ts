import type { FastifyInstance, FastifyRequest } from "fastify";

import type { PrismaClient } from "@brm/database";

const notificationResponseSchema = {
  type: "object",
  required: ["id", "type", "title", "body", "resourceType", "resourceId", "readAt", "createdAt"],
  properties: {
    id: { type: "string" },
    type: {
      type: "string",
      enum: ["INSTAGRAM_COMMENT", "INSTAGRAM_DIRECT", "GOOGLE_REVIEW", "SYSTEM"],
    },
    title: { type: "string" },
    body: { type: "string" },
    resourceType: { type: "string" },
    resourceId: { type: "string" },
    readAt: { type: ["string", "null"], format: "date-time" },
    createdAt: { type: "string", format: "date-time" },
  },
};

export function registerNotificationRoutes(
  app: FastifyInstance,
  input: {
    prisma: PrismaClient;
    authService: { getCurrentSession: (userId: string) => Promise<{ tenant: { id: string } }> };
  },
): void {
  app.get(
    "/notifications",
    {
      schema: {
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            unreadOnly: { type: "boolean" },
            limit: { type: "integer", minimum: 1, maximum: 100 },
          },
        },
        response: {
          200: {
            type: "object",
            required: ["notifications", "unreadCount"],
            properties: {
              notifications: { type: "array", items: notificationResponseSchema },
              unreadCount: { type: "integer" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = await getTenantId(request, input.authService);
      const query = request.query as { unreadOnly?: boolean; limit?: number };
      const notifications = await input.prisma.notification.findMany({
        where: { tenantId, ...(query.unreadOnly ? { readAt: null } : {}) },
        orderBy: { createdAt: "desc" },
        take: Math.min(Math.max(query.limit ?? 30, 1), 100),
      });
      const unreadCount = await input.prisma.notification.count({
        where: { tenantId, readAt: null },
      });
      return reply.send({ notifications, unreadCount });
    },
  );

  app.post(
    "/notifications/:id/read",
    {
      schema: {
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      },
    },
    async (request, reply) => {
      const tenantId = await getTenantId(request, input.authService);
      const params = request.params as { id: string };
      const notification = await input.prisma.notification.updateMany({
        where: { id: params.id, tenantId, readAt: null },
        data: { readAt: new Date() },
      });
      return reply.send({ id: params.id, updated: notification.count > 0 });
    },
  );

  app.post(
    "/notifications/read-all",
    { schema: { tags: ["Notifications"], security: [{ bearerAuth: [] }] } },
    async (request, reply) => {
      const tenantId = await getTenantId(request, input.authService);
      const result = await input.prisma.notification.updateMany({
        where: { tenantId, readAt: null },
        data: { readAt: new Date() },
      });
      return reply.send({ updated: result.count });
    },
  );
}

async function getTenantId(
  request: FastifyRequest,
  authService: { getCurrentSession: (userId: string) => Promise<{ tenant: { id: string } }> },
): Promise<string> {
  try {
    if (!request.headers.authorization?.startsWith("Bearer ")) throw new Error();
    const payload = await request.jwtVerify<{ sub: string }>();
    return (await authService.getCurrentSession(payload.sub)).tenant.id;
  } catch {
    const error = new Error("Authentication required") as Error & { statusCode: number };
    error.statusCode = 401;
    throw error;
  }
}
