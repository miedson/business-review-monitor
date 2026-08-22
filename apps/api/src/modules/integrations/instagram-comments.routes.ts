import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type {
  ListInstagramComments,
  ListInstagramCommentsInput
} from "@brm/review-monitoring";
import type { InstagramReviewProvider, InstagramConnectionRepository, TokenCipher } from "@brm/review-monitoring";
import type { RealtimeGateway } from "./realtime-gateway.js";

const listInstagramCommentsQuerySchema = z.object({
  instagramConnectionId: z.string().optional(),
  status: z.enum(["NEW", "READ"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
  cursor: z.string().optional()
});

const instagramCommentResponseSchema = {
  type: "object",
  required: ["id", "provider", "commentId", "mediaId", "author", "text", "createdAt", "status"],
  properties: {
    id: { type: "string" },
    provider: { type: "string", enum: ["instagram"] },
    commentId: { type: "string" },
    mediaId: { type: ["string", "null"] },
    author: {
      type: "object",
      properties: {
        id: { type: ["string", "null"] },
        username: { type: ["string", "null"] }
        ,profilePictureUrl: { type: ["string", "null"] }
      }
    },
    text: { type: ["string", "null"] },
    media: { type: ["object", "null"] },
    createdAt: { type: "string", format: "date-time" },
    status: { type: "string", enum: ["NEW", "READ"] }
  }
};

const listInstagramCommentsRouteSchema = {
  tags: ["Instagram Comments"],
  summary: "List Instagram comments",
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      instagramConnectionId: { type: "string" },
      status: { type: "string", enum: ["NEW", "READ"] },
      limit: { type: "integer", minimum: 1, maximum: 100 },
      cursor: { type: "string" }
    }
  },
  response: {
    200: {
      type: "object",
      required: ["comments", "nextCursor"],
      properties: {
        comments: {
          type: "array",
          items: instagramCommentResponseSchema
        },
        nextCursor: { type: ["string", "null"] }
      }
    },
    401: {
      type: "object",
      required: ["error", "requestId"],
      properties: {
        error: { type: "string" },
        requestId: { type: "string" }
      }
    }
  }
};

export type RegisterInstagramCommentsRoutesOptions = {
  authService: {
    getCurrentSession: (userId: string) => Promise<{ user: { id: string }; tenant: { id: string } }>;
  };
  listInstagramComments: ListInstagramComments;
  instagramCommentRepository: import("@brm/review-monitoring").InstagramCommentRepository;
  instagramConnectionRepository: InstagramConnectionRepository;
  instagramProvider: InstagramReviewProvider;
  tokenCipher: TokenCipher;
  realtimeGateway: RealtimeGateway;
};

export function registerInstagramCommentsRoutes(
  app: FastifyInstance,
  options: RegisterInstagramCommentsRoutesOptions
): void {
  app.get<{ 
    Querystring: ListInstagramCommentsInput;
  }>("/instagram/comments", { schema: listInstagramCommentsRouteSchema }, async (request, reply) => {
    const userId = await getAuthenticatedUserId(request);
    const session = await options.authService.getCurrentSession(userId);
    const query = listInstagramCommentsQuerySchema.parse(request.query);

    try {
      const executeInput: ListInstagramCommentsInput = {
        tenantId: session.tenant.id
      };
      if (query.instagramConnectionId) executeInput.instagramConnectionId = query.instagramConnectionId;
      if (query.status) executeInput.status = query.status;
      if (query.limit) executeInput.limit = query.limit;
      if (query.cursor) executeInput.cursor = query.cursor;

      const result = await options.listInstagramComments.execute(executeInput);
      const connection = await options.instagramConnectionRepository.findByTenantId(session.tenant.id);
      const accessToken = connection?.encryptedAccessToken ? options.tokenCipher.decrypt(connection.encryptedAccessToken) : null;
      const mediaIds = [...new Set(result.comments.map((comment) => comment.externalMediaId).filter((id): id is string => Boolean(id)))];
      const authorIds = [...new Set(result.comments.map((comment) => comment.authorExternalId).filter((id): id is string => Boolean(id)))];
      const [mediaEntries, userEntries] = accessToken ? await Promise.all([
        Promise.all(mediaIds.map(async (id) => [id, await options.instagramProvider.getMediaMetadata(accessToken, id).catch(() => null)] as const)),
        Promise.all(authorIds.map(async (id) => [id, await options.instagramProvider.getExternalUserProfile(accessToken, id).catch(() => null)] as const))
      ]) : [[], []];
      const mediaById = new Map(mediaEntries); const userById = new Map(userEntries);

      const comments = result.comments.map((comment) => ({
        id: comment.id,
        provider: "instagram" as const,
        commentId: comment.externalCommentId,
        mediaId: comment.externalMediaId ?? undefined,
        author: {
          id: comment.authorExternalId ?? undefined,
          username: comment.authorUsername ?? undefined
          ,profilePictureUrl: comment.authorExternalId ? userById.get(comment.authorExternalId)?.profile_pic ?? null : null
        },
        text: comment.text ?? undefined,
        createdAt: comment.createdAtExternal?.toISOString() ?? comment.createdAt.toISOString(),
        status: comment.status
        ,repliedAt: comment.repliedAt?.toISOString() ?? null
        ,media: comment.externalMediaId ? mediaById.get(comment.externalMediaId) ?? null : null
      }));

      return reply.send({
        comments,
        nextCursor: result.nextCursor
      });
    } catch (error) {
      request.log.error({
        provider: "instagram",
        operation: "list_comments_failed",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  });

  app.post<{ Params: { id: string }; Body: { message: string } }>("/instagram/comments/:id/reply", {
    schema: { tags: ["Instagram Comments"], summary: "Reply to an Instagram comment", security: [{ bearerAuth: [] }], params: { type: "object", required: ["id"], properties: { id: { type: "string" } } }, body: { type: "object", required: ["message"], properties: { message: { type: "string", minLength: 1, maxLength: 2200 } } } }
  }, async (request, reply) => {
    const userId = await getAuthenticatedUserId(request);
    const session = await options.authService.getCurrentSession(userId);
    const body = z.object({ message: z.string().trim().min(1).max(2200) }).parse(request.body);
    const comment = await options.instagramCommentRepository.findByIdForTenant({ id: request.params.id, tenantId: session.tenant.id });
    if (!comment) return reply.status(404).send({ error: "Comment not found", requestId: request.id });
    const connection = await options.instagramConnectionRepository.findByTenantId(session.tenant.id);
    if (!connection?.encryptedAccessToken || connection.status !== "CONNECTED") return reply.status(401).send({ error: "Instagram connection is required", requestId: request.id });
    const accessToken = options.tokenCipher.decrypt(connection.encryptedAccessToken);
    const result = await options.instagramProvider.replyToComment({ accessToken, commentId: comment.externalCommentId, message: body.message });
    await options.instagramCommentRepository.saveReply({ tenantId: session.tenant.id, instagramCommentId: comment.id, externalReplyId: result.id, text: body.message, createdAt: new Date() });
    await options.instagramCommentRepository.markReplied({ id: comment.id, tenantId: session.tenant.id, repliedAt: new Date() });
    await options.realtimeGateway.publish({ tenantId: session.tenant.id, type: "instagram.comment.replied", payload: { commentId: comment.id } });
    return reply.send({ id: comment.id, externalReplyId: result.id, replied: true });
  });
}

async function getAuthenticatedUserId(
  request: import("fastify").FastifyRequest
): Promise<string> {
  try {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      throw authenticationRequiredError();
    }
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
