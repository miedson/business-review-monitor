import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type {
  ListInstagramComments,
  ListInstagramCommentsInput
} from "@brm/review-monitoring";

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
      }
    },
    text: { type: ["string", "null"] },
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

      const comments = result.comments.map((comment) => ({
        id: comment.id,
        provider: "instagram" as const,
        commentId: comment.externalCommentId,
        mediaId: comment.externalMediaId ?? undefined,
        author: {
          id: comment.authorExternalId ?? undefined,
          username: comment.authorUsername ?? undefined
        },
        text: comment.text ?? undefined,
        createdAt: comment.createdAtExternal?.toISOString() ?? comment.createdAt.toISOString(),
        status: comment.status
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