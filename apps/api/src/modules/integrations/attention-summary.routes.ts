import type { PrismaClient } from "@brm/database";
import type { FastifyInstance, FastifyRequest } from "fastify";

const routeSchema = {
  tags: ["Attention"],
  summary: "Get tenant attention summary",
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      type: "object",
      required: ["googleReviewsPendingReply", "instagramCommentsPendingReply", "total"],
      properties: {
        googleReviewsPendingReply: { type: "integer" },
        instagramCommentsPendingReply: { type: "integer" },
        total: { type: "integer" }
      }
    }
  }
} as const;

export function registerAttentionSummaryRoute(
  app: FastifyInstance,
  input: { prisma: PrismaClient; authService: { getCurrentSession: (userId: string) => Promise<{ tenant: { id: string } }> } }
): void {
  app.get("/attention-summary", { schema: routeSchema }, async (request, reply) => {
    const userId = await getAuthenticatedUserId(request);
    const session = await input.authService.getCurrentSession(userId);
    const [googleReviewsPendingReply, instagramCommentsPendingReply] = await Promise.all([
      input.prisma.reviewCache.count({ where: { tenantId: session.tenant.id, replyText: null, expiresAt: { gt: new Date() }, businessLocation: { isActive: true } } }),
      input.prisma.instagramComment.count({ where: { tenantId: session.tenant.id, repliedAt: null } })
    ]);
    return reply.send({ googleReviewsPendingReply, instagramCommentsPendingReply, total: googleReviewsPendingReply + instagramCommentsPendingReply });
  });
}

async function getAuthenticatedUserId(request: FastifyRequest): Promise<string> {
  try { if (!request.headers.authorization?.startsWith("Bearer ")) throw new Error(); return (await request.jwtVerify<{ sub: string }>()).sub; } catch { const error = new Error("Authentication required") as Error & { statusCode: number }; error.statusCode = 401; throw error; }
}
