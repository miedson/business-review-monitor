import { z } from "zod";
import { clearStoredSession, storeSession } from "./auth-session";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3333";
export const getApiBaseUrl = (): string => apiBaseUrl;

const authUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

const authResponseSchema = z.object({
  accessToken: z.string(),
  user: authUserSchema,
});

let refreshInFlight: Promise<AuthResponse> | undefined;

const googleAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  accountName: z.string().nullable().optional(),
});

const googleAccountsResponseSchema = z.object({
  accounts: z.array(googleAccountSchema),
  nextPageToken: z.string().nullable().optional(),
});

const googleLocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  accountId: z.string().optional(),
  storeCode: z.string().nullable().optional(),
  isVerified: z.boolean().optional(),
  lastSyncedAt: z.string().datetime().nullable().optional(),
});

const googleLocationsResponseSchema = z.object({
  locations: z.array(googleLocationSchema),
  nextPageToken: z.string().nullable().optional(),
});

const googleReviewSchema = z.object({
  id: z.string(),
  reviewerName: z.string().nullable().optional(),
  starRating: z.enum([
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "STAR_RATING_UNSPECIFIED",
  ]),
  comment: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  reviewReply: z.object({ comment: z.string(), updatedAt: z.string().optional() }).nullable().optional(),
});

const googleReviewsResponseSchema = z.object({
  reviews: z.array(googleReviewSchema),
  averageRating: z.number().nullable().optional(),
  totalReviewCount: z.number().int().nonnegative().nullable().optional(),
  nextPageToken: z.string().nullable().optional(),
});

const googleSyncResponseSchema = z.object({
  jobId: z.string(),
});

const googleConnectUrlResponseSchema = z.object({
  authorizationUrl: z.string().url(),
});

const instagramConnectUrlResponseSchema = z.object({
  authorizationUrl: z.string().url(),
});

const instagramAccountSchema = z.object({
  id: z.string(),
  username: z.string(),
});

const instagramAccountsResponseSchema = z.object({
  accounts: z.array(instagramAccountSchema),
});

const instagramCommentAuthorSchema = z.object({
  id: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  profilePictureUrl: z.string().nullable().optional(),
  authorType: z.enum(["CUSTOMER", "BUSINESS"]),
});

const instagramCommentSchema = z.object({
  id: z.string(),
  provider: z.literal("instagram"),
  commentId: z.string(),
  mediaId: z.string().nullable().optional(),
  author: instagramCommentAuthorSchema,
  media: z.object({ id: z.string(), media_type: z.string().optional(), media_product_type: z.string().optional(), media_url: z.string().optional(), thumbnail_url: z.string().optional(), permalink: z.string().optional(), caption: z.string().optional(), timestamp: z.string().optional() }).nullable().optional(),
  text: z.string().nullable().optional(),
  createdAt: z.string(),
  status: z.enum(["NEW", "READ"]),
  authorType: z.enum(["CUSTOMER", "BUSINESS"]),
  repliedAt: z.string().nullable().optional(),
});

const instagramCommentsResponseSchema = z.object({
  comments: z.array(instagramCommentSchema),
  nextCursor: z.string().nullable().optional(),
});

type RequestOptions = {
  accessToken?: string;
  body?: unknown;
  method?: "GET" | "POST";
};

export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type GoogleAccount = z.infer<typeof googleAccountSchema>;
export type GoogleLocation = z.infer<typeof googleLocationSchema>;
export type GoogleReview = z.infer<typeof googleReviewSchema>;
export type GoogleReviewsResponse = z.infer<typeof googleReviewsResponseSchema>;
export type GoogleSyncResponse = z.infer<typeof googleSyncResponseSchema>;
export type InstagramAccount = z.infer<typeof instagramAccountSchema>;
export type InstagramCommentAuthor = z.infer<typeof instagramCommentAuthorSchema>;
export type InstagramComment = z.infer<typeof instagramCommentSchema>;
export type InstagramCommentsResponse = z.infer<typeof instagramCommentsResponseSchema>;

const attentionSummarySchema = z.object({ googleReviewsPendingReply: z.number().int(), instagramCommentsPendingReply: z.number().int(), total: z.number().int() });
export type AttentionSummary = z.infer<typeof attentionSummarySchema>;
export async function getAttentionSummary(accessToken: string): Promise<AttentionSummary> {
  return attentionSummarySchema.parse(await requestJson("/attention-summary", { accessToken }));
}

const notificationSchema = z.object({
  id: z.string(),
  type: z.enum(["INSTAGRAM_COMMENT", "INSTAGRAM_DIRECT", "GOOGLE_REVIEW", "SYSTEM"]),
  title: z.string(),
  body: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime()
});
const notificationsResponseSchema = z.object({ notifications: z.array(notificationSchema), unreadCount: z.number().int() });
export type AppNotification = z.infer<typeof notificationSchema>;

export async function getNotifications(input: { accessToken: string; unreadOnly?: boolean; limit?: number }): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
  const params = new URLSearchParams();
  if (input.unreadOnly) params.set("unreadOnly", "true");
  if (input.limit) params.set("limit", String(input.limit));
  return notificationsResponseSchema.parse(await requestJson(`/notifications?${params.toString()}`, { accessToken: input.accessToken }));
}

export async function markNotificationRead(input: { accessToken: string; id: string }): Promise<void> {
  await requestJson(`/notifications/${encodeURIComponent(input.id)}/read`, { accessToken: input.accessToken, method: "POST" });
}

export async function markAllNotificationsRead(accessToken: string): Promise<void> {
  await requestJson("/notifications/read-all", { accessToken, method: "POST" });
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return authResponseSchema.parse(
    await requestJson("/auth/register", { body: input, method: "POST" })
  );
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return authResponseSchema.parse(
    await requestJson("/auth/login", { body: input, method: "POST" })
  );
}

export async function buildGoogleConnectUrl(accessToken: string): Promise<string> {
  const result = googleConnectUrlResponseSchema.parse(
    await requestJson("/integrations/google/connect-url", { accessToken })
  );
  return result.authorizationUrl;
}

export async function listGoogleAccounts(
  accessToken: string,
  pageToken?: string
): Promise<{ accounts: GoogleAccount[]; nextPageToken?: string | null | undefined }> {
  const params = new URLSearchParams();
  if (pageToken) params.set("pageToken", pageToken);
  const path = params.size
    ? `/integrations/google/accounts?${params.toString()}`
    : "/integrations/google/accounts";
  return googleAccountsResponseSchema.parse(
    await requestJson(path, { accessToken })
  );
}

export async function listGoogleLocations(input: {
  accessToken: string;
  accountId: string;
  pageToken?: string;
}): Promise<{ locations: GoogleLocation[]; nextPageToken?: string | null | undefined }> {
  const params = new URLSearchParams({ accountId: input.accountId });
  if (input.pageToken) params.set("pageToken", input.pageToken);
  return googleLocationsResponseSchema.parse(
    await requestJson(`/integrations/google/locations?${params.toString()}`, {
      accessToken: input.accessToken,
    })
  );
}

export async function listGoogleReviews(input: {
  accessToken: string;
  accountId: string;
  locationId: string;
}): Promise<GoogleReviewsResponse> {
  const params = new URLSearchParams({
    accountId: input.accountId,
    locationId: input.locationId,
  });
  return googleReviewsResponseSchema.parse(
    await requestJson(`/integrations/google/reviews?${params.toString()}`, {
      accessToken: input.accessToken,
    })
  );
}

export async function replyToGoogleReview(input: { accessToken: string; reviewId: string; accountId: string; locationId: string; message: string }): Promise<void> {
  await requestJson(`/reviews/${encodeURIComponent(input.reviewId)}/reply`, { accessToken: input.accessToken, method: "POST", body: { accountId: input.accountId, locationId: input.locationId, message: input.message } });
}

export async function requestGoogleReviewSync(input: {
  accessToken: string;
  accountId: string;
  locationId: string;
}): Promise<GoogleSyncResponse> {
  return googleSyncResponseSchema.parse(
    await requestJson("/integrations/google/reviews/cache", {
      accessToken: input.accessToken,
      body: {
        accountId: input.accountId,
        locationId: input.locationId,
      },
      method: "POST",
    })
  );
}

export async function selectBusinessLocation(input: {
  accessToken: string;
  businessLocationId: string;
}): Promise<void> {
  await requestJson("/business-locations/select", {
    accessToken: input.accessToken,
    body: {
      locationId: input.businessLocationId
    },
    method: "POST"
  });
}

export async function disconnectGoogle(input: {
  accessToken: string;
}): Promise<{ disconnected: boolean }> {
  return z
    .object({ disconnected: z.boolean() })
    .parse(
      await requestJson("/integrations/google/disconnect", {
        accessToken: input.accessToken,
        method: "POST"
      })
    );
}

export async function buildInstagramConnectUrl(accessToken: string): Promise<string> {
  const result = instagramConnectUrlResponseSchema.parse(
    await requestJson("/integrations/instagram/connect-url", { accessToken })
  );
  return result.authorizationUrl;
}

export async function disconnectInstagram(input: {
  accessToken: string;
  deleteData?: boolean;
}): Promise<{ disconnected: boolean }> {
  return z
    .object({ disconnected: z.boolean() })
    .parse(
      await requestJson("/integrations/instagram/disconnect", {
        accessToken: input.accessToken,
        body: { deleteData: input.deleteData ?? false },
        method: "POST"
      })
    );
}

export async function listInstagramAccounts(
  accessToken: string
): Promise<{ accounts: InstagramAccount[] }> {
  return instagramAccountsResponseSchema.parse(
    await requestJson("/integrations/instagram/accounts", { accessToken })
  );
}

export async function listInstagramComments(input: {
  accessToken: string;
  instagramConnectionId?: string;
  status?: "NEW" | "READ";
  limit?: number;
  cursor?: string;
}): Promise<InstagramCommentsResponse> {
  const params = new URLSearchParams();
  if (input.instagramConnectionId) params.set("instagramConnectionId", input.instagramConnectionId);
  if (input.status) params.set("status", input.status);
  if (input.limit) params.set("limit", String(input.limit));
  if (input.cursor) params.set("cursor", input.cursor);

  return instagramCommentsResponseSchema.parse(
    await requestJson(`/instagram/comments?${params.toString()}`, {
      accessToken: input.accessToken,
    })
  );
}

export async function replyToInstagramComment(input: { accessToken: string; id: string; message: string }): Promise<void> {
  await requestJson(`/instagram/comments/${encodeURIComponent(input.id)}/reply`, { accessToken: input.accessToken, method: "POST", body: { message: input.message } });
}

export async function getInstagramConnectionStatus(accessToken: string): Promise<{ connected: boolean; username: string | null; status: string }> {
  return z.object({ connected: z.boolean(), username: z.string().nullable().optional(), status: z.string() }).parse(await requestJson("/integrations/instagram/status", { accessToken })) as { connected: boolean; username: string | null; status: string };
}

export type InboxConversation = {
  id: string;
  provider: "instagram";
  participant: {
    externalId: string;
    username: string | null;
    name: string | null;
    profilePictureUrl: string | null;
  };
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export type InboxMessage = {
  id: string;
  provider: "instagram";
  direction: "INBOUND" | "OUTBOUND";
  sender: string;
  recipient: string;
  text: string | null;
  sentAt: string;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
};

export async function listInboxConversations(input: {
  accessToken: string;
  limit: number | undefined;
  cursor: string | undefined;
}): Promise<{ conversations: InboxConversation[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (input.limit) params.set("limit", String(input.limit));
  if (input.cursor) params.set("cursor", input.cursor);

  return z
    .object({
      conversations: z.array(
        z.object({
          id: z.string(),
          provider: z.literal("instagram"),
          participant: z.object({
            externalId: z.string(),
            username: z.string().nullable().optional(),
            name: z.string().nullable().optional(),
            profilePictureUrl: z.string().nullable().optional()
          }),
          lastMessagePreview: z.string().nullable().optional(),
          lastMessageAt: z.string().nullable().optional(),
          unreadCount: z.number()
        })
      ),
      nextCursor: z.string().nullable().optional()
    })
    .parse(
      await requestJson(`/inbox/conversations?${params.toString()}`, {
        accessToken: input.accessToken,
      })
    ) as { conversations: InboxConversation[]; nextCursor: string | null };
}

export async function listInboxConversationMessages(input: {
  accessToken: string;
  conversationId: string;
  limit: number | undefined;
  cursor: string | undefined;
}): Promise<{ messages: InboxMessage[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (input.limit) params.set("limit", String(input.limit));
  if (input.cursor) params.set("cursor", input.cursor);

  return z
    .object({
      messages: z.array(
        z.object({
          id: z.string(),
          provider: z.literal("instagram"),
          direction: z.enum(["INBOUND", "OUTBOUND"]),
          sender: z.string(),
          recipient: z.string(),
          text: z.string().nullable().optional(),
          sentAt: z.string(),
          status: z.enum(["SENT", "DELIVERED", "READ", "FAILED"])
        })
      ),
      nextCursor: z.string().nullable().optional()
    })
    .parse(
      await requestJson(`/inbox/conversations/${input.conversationId}/messages?${params.toString()}`, {
        accessToken: input.accessToken,
      })
    ) as { messages: InboxMessage[]; nextCursor: string | null };
}

export async function markInboxConversationAsRead(input: {
  accessToken: string;
  conversationId: string;
}): Promise<{ id: string; unreadCount: number }> {
  return z
    .object({
      id: z.string(),
      unreadCount: z.number()
    })
    .parse(
      await requestJson(`/inbox/conversations/${input.conversationId}/read`, {
        accessToken: input.accessToken,
        method: "POST"
      })
    );
}

export async function sendInstagramDirectMessage(input: {
  accessToken: string;
  conversationId: string;
  message: string;
}): Promise<{ id: string; externalMessageId: string }> {
  return z.object({ id: z.string(), externalMessageId: z.string() }).parse(
    await requestJson(`/inbox/conversations/${encodeURIComponent(input.conversationId)}/messages`, {
      accessToken: input.accessToken,
      method: "POST",
      body: { message: input.message }
    })
  );
}

async function requestJson(path: string, options: RequestOptions = {}): Promise<unknown> {
  const response = await sendRequest(path, options);

  if (response.status === 401 && options.accessToken && path !== "/auth/refresh") {
    let session: AuthResponse;

    try {
      session = await refreshSession();
    } catch {
      clearStoredSession();
      throw new Error("Authentication required");
    }

    const retriedResponse = await sendRequest(path, {
      ...options,
      accessToken: session.accessToken,
    });

    if (!retriedResponse.ok) {
      throw new Error(await readErrorMessage(retriedResponse));
    }

    return readResponseBody(retriedResponse);
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return readResponseBody(response);
}

async function refreshSession(): Promise<AuthResponse> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await sendRequest("/auth/refresh", { method: "POST" });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const session = authResponseSchema.parse(await readResponseBody(response));
      storeSession(session);
      return session;
    })().finally(() => {
      refreshInFlight = undefined;
    });
  }

  return refreshInFlight;
}

async function sendRequest(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  if (options.accessToken) {
    headers.authorization = `Bearer ${options.accessToken}`;
  }

  const requestInit: RequestInit = {
    credentials: "include",
    headers,
    method: options.method ?? "GET",
  };

  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
  }

  return fetch(`${apiBaseUrl}${path}`, requestInit);
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as unknown;
    const parsed = z
      .object({
        error: z.string().optional(),
        message: z.string().optional(),
        code: z.string().optional(),
      })
      .safeParse(body);

    if (parsed.success) {
      return (
        parsed.data.message ??
        parsed.data.error ??
        mapErrorCode(parsed.data.code) ??
        "Nao foi possivel concluir a operacao."
      );
    }
  } catch {
    return "Nao foi possivel concluir a operacao.";
  }

  return "Nao foi possivel concluir a operacao.";
}

function mapErrorCode(code: string | undefined): string | undefined {
  if (!code) {
    return undefined;
  }

  const messages: Record<string, string> = {
    GOOGLE_AUTH_REQUIRED:
      "Conecte sua conta Google Business Profile para continuar.",
    GOOGLE_INVALID_STATE:
      "A conexao com o Google expirou. Inicie a conexao novamente.",
    GOOGLE_PERMISSION_DENIED:
      "Sua conta Google nao tem permissao para acessar esta empresa.",
    GOOGLE_RATE_LIMITED:
      "O Google limitou temporariamente as requisicoes. Tente novamente em alguns minutos.",
    GOOGLE_TOKEN_REVOKED:
      "Sua conexao com o Google expirou ou foi revogada. Conecte sua conta novamente.",
  };

  return messages[code];
}
