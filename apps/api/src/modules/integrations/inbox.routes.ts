import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type {
  ListInstagramConversations,
  ListInstagramConversationsInput
} from "@brm/review-monitoring";
import type {
  ListInstagramConversationMessages,
  ListInstagramConversationMessagesInput
} from "@brm/review-monitoring";
import {
  MarkInstagramConversationAsRead
} from "@brm/review-monitoring";

const listConversationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
  cursor: z.string().optional()
});

const conversationResponseSchema = {
  type: "object",
  required: ["id", "provider", "participant", "lastMessagePreview", "lastMessageAt", "unreadCount"],
  properties: {
    id: { type: "string" },
    provider: { type: "string", enum: ["instagram"] },
    participant: {
      type: "object",
      properties: {
        externalId: { type: "string" },
        username: { type: ["string", "null"] },
        name: { type: ["string", "null"] },
        profilePictureUrl: { type: ["string", "null"] }
      }
    },
    lastMessagePreview: { type: ["string", "null"] },
    lastMessageAt: { type: "string", format: "date-time" },
    unreadCount: { type: "integer" }
  }
};

const listConversationsRouteSchema = {
  tags: ["Inbox"],
  summary: "List inbox conversations",
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      limit: { type: "integer", minimum: 1, maximum: 100 },
      cursor: { type: "string" }
    }
  },
  response: {
    200: {
      type: "object",
      required: ["conversations", "nextCursor"],
      properties: {
        conversations: {
          type: "array",
          items: conversationResponseSchema
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

const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
  cursor: z.string().optional()
});

const messageResponseSchema = {
  type: "object",
  required: ["id", "provider", "direction", "sender", "recipient", "text", "sentAt", "status"],
  properties: {
    id: { type: "string" },
    provider: { type: "string", enum: ["instagram"] },
    direction: { type: "string", enum: ["INBOUND", "OUTBOUND"] },
    sender: { type: "string" },
    recipient: { type: "string" },
    text: { type: ["string", "null"] },
    sentAt: { type: "string", format: "date-time" },
    status: { type: "string", enum: ["SENT", "DELIVERED", "READ", "FAILED"] }
  }
};

const listMessagesRouteSchema = {
  tags: ["Inbox"],
  summary: "List conversation messages",
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" }
    }
  },
  querystring: {
    type: "object",
    properties: {
      limit: { type: "integer", minimum: 1, maximum: 100 },
      cursor: { type: "string" }
    }
  },
  response: {
    200: {
      type: "object",
      required: ["messages", "nextCursor"],
      properties: {
        messages: {
          type: "array",
          items: messageResponseSchema
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
    },
    404: {
      type: "object",
      required: ["error", "requestId"],
      properties: {
        error: { type: "string" },
        requestId: { type: "string" }
      }
    }
  }
};

const markAsReadRouteSchema = {
  tags: ["Inbox"],
  summary: "Mark conversation as read",
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" }
    }
  },
  response: {
    200: {
      type: "object",
      required: ["id", "unreadCount"],
      properties: {
        id: { type: "string" },
        unreadCount: { type: "integer" }
      }
    },
    401: {
      type: "object",
      required: ["error", "requestId"],
      properties: {
        error: { type: "string" },
        requestId: { type: "string" }
      }
    },
    404: {
      type: "object",
      required: ["error", "requestId"],
      properties: {
        error: { type: "string" },
        requestId: { type: "string" }
      }
    }
  }
};

export type RegisterInboxRoutesOptions = {
  authService: {
    getCurrentSession: (userId: string) => Promise<{ user: { id: string }; tenant: { id: string } }>;
  };
  listInstagramConversations: ListInstagramConversations;
  listInstagramConversationMessages: ListInstagramConversationMessages;
  markInstagramConversationAsRead: MarkInstagramConversationAsRead;
};

export function registerInboxRoutes(
  app: FastifyInstance,
  options: RegisterInboxRoutesOptions
): void {
  app.get<{
    Querystring: ListInstagramConversationsInput;
  }>("/inbox/conversations", { schema: listConversationsRouteSchema }, async (request, reply) => {
    const userId = await getAuthenticatedUserId(request);
    const session = await options.authService.getCurrentSession(userId);
    const query = listConversationsQuerySchema.parse(request.query);

    const result = await options.listInstagramConversations.execute({
      tenantId: session.tenant.id,
      instagramConnectionId: undefined,
      limit: query.limit,
      cursor: query.cursor ?? undefined
    });

    const conversations = result.conversations.map((conversation) => ({
      id: conversation.id,
      provider: "instagram" as const,
      participant: {
        externalId: conversation.participantExternalId,
        username: conversation.participantUsername,
        name: conversation.participantName,
        profilePictureUrl: conversation.participantProfilePictureUrl
      },
      lastMessagePreview: conversation.lastMessagePreview,
      lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
      unreadCount: conversation.unreadCount
    }));

    return reply.send({
      conversations,
      nextCursor: result.nextCursor
    });
  });

  app.get<{
    Params: { id: string };
    Querystring: ListInstagramConversationMessagesInput;
  }>("/inbox/conversations/:id/messages", { schema: listMessagesRouteSchema }, async (request, reply) => {
    const userId = await getAuthenticatedUserId(request);
    const session = await options.authService.getCurrentSession(userId);
    const params = request.params as { id: string };
    const query = listMessagesQuerySchema.parse(request.query);

    const messages = await options.listInstagramConversationMessages.execute({
      tenantId: session.tenant.id,
      instagramConversationId: params.id,
      limit: query.limit,
      cursor: query.cursor
    });

    const mappedMessages = messages.messages.map((message) => ({
      id: message.id,
      provider: "instagram" as const,
      direction: message.direction,
      sender: message.senderExternalId,
      recipient: message.recipientExternalId,
      text: message.text,
      sentAt: message.sentAtExternal?.toISOString() ?? message.createdAt.toISOString(),
      status: message.status
    }));

    return reply.send({
      messages: mappedMessages,
      nextCursor: messages.nextCursor
    });
  });

  app.post<{
    Params: { id: string };
  }>("/inbox/conversations/:id/read", { schema: markAsReadRouteSchema }, async (request, reply) => {
    const userId = await getAuthenticatedUserId(request);
    const session = await options.authService.getCurrentSession(userId);
    const params = request.params as { id: string };

    const result = await options.markInstagramConversationAsRead.execute({
      conversationId: params.id,
      tenantId: session.tenant.id
    });

    return reply.send({
      id: result.conversation.id,
      unreadCount: result.conversation.unreadCount
    });
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
