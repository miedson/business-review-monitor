import { z } from "zod";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3333";

const authUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

const authResponseSchema = z.object({
  accessToken: z.string(),
  user: authUserSchema,
});

const googleAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  accountName: z.string().nullable().optional(),
});

const googleAccountsResponseSchema = z.object({
  accounts: z.array(googleAccountSchema),
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
  accessToken: string
): Promise<{ accounts: GoogleAccount[] }> {
  return googleAccountsResponseSchema.parse(
    await requestJson("/integrations/google/accounts", { accessToken })
  );
}

export async function listGoogleLocations(input: {
  accessToken: string;
  accountId: string;
}): Promise<{ locations: GoogleLocation[] }> {
  const params = new URLSearchParams({ accountId: input.accountId });
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
}): Promise<{ disconnected: boolean }> {
  return z
    .object({ disconnected: z.boolean() })
    .parse(
      await requestJson("/integrations/instagram/disconnect", {
        accessToken: input.accessToken,
        method: "POST"
      })
    );
}

async function requestJson(path: string, options: RequestOptions = {}): Promise<unknown> {
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  if (options.accessToken) {
    headers.authorization = `Bearer ${options.accessToken}`;
  }

  const requestInit: RequestInit = {
    headers,
    method: options.method ?? "GET",
  };

  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, requestInit);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

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
