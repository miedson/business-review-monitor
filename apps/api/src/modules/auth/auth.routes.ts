import type { SwaggerTransform } from "@fastify/swagger";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { unauthorizedError } from "./auth.errors.js";
import { loginBodySchema, registerBodySchema } from "./auth.schemas.js";
import type { AuthService } from "./auth.service.js";

const registerRouteSchema = {
  tags: ["Auth"],
  summary: "Register SaaS user",
  description:
    "Body: { name: string, email: string, password: string }. Runtime validation is handled with Zod."
} as const;

const registerBodyDocumentationSchema = {
  type: "object",
  required: ["name", "email", "password"],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 120 },
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 8, maxLength: 200 }
  }
} as const;

const loginRouteSchema = {
  tags: ["Auth"],
  summary: "Login SaaS user",
  description:
    "Body: { email: string, password: string }. Runtime validation is handled with Zod."
} as const;

const loginBodyDocumentationSchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 1, maxLength: 200 }
  }
} as const;

const refreshRouteSchema = {
  tags: ["Auth"],
  summary: "Refresh SaaS access token"
} as const;

const logoutRouteSchema = {
  tags: ["Auth"],
  summary: "Logout SaaS user"
} as const;

const meRouteSchema = {
  tags: ["Auth"],
  summary: "Get current SaaS session",
  security: [{ bearerAuth: [] }]
} as const;

const registerSwaggerTransform: SwaggerTransform = ({ schema, url }) => ({
  schema: {
    ...schema,
    body: registerBodyDocumentationSchema
  },
  url
});

const loginSwaggerTransform: SwaggerTransform = ({ schema, url }) => ({
  schema: {
    ...schema,
    body: loginBodyDocumentationSchema
  },
  url
});

const registerRouteOptions = {
  schema: registerRouteSchema,
  config: {
    swaggerTransform: registerSwaggerTransform
  }
} as const;

const loginRouteOptions = {
  schema: loginRouteSchema,
  config: {
    swaggerTransform: loginSwaggerTransform
  }
} as const;

function getBearerToken(request: FastifyRequest): string {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    throw unauthorizedError();
  }

  return header.slice("Bearer ".length);
}

async function getAuthenticatedUserId(request: FastifyRequest): Promise<string> {
  try {
    const payload = await request.jwtVerify<{ sub: string; type?: string }>();

    if (payload.type !== "access") {
      throw unauthorizedError();
    }

    return payload.sub;
  } catch {
    throw unauthorizedError();
  }
}

export function registerAuthRoutes(app: FastifyInstance, authService: AuthService): void {
  app.post("/auth/register", registerRouteOptions, async (request, reply) => {
    const body = registerBodySchema.parse(request.body);
    const result = await authService.register(body);

    return reply
      .setCookie(
        authService.refreshCookieName,
        result.tokens.refreshToken,
        authService.refreshCookieOptions
      )
      .status(201)
      .send({
        user: result.user,
        tenant: result.tenant,
        accessToken: result.tokens.accessToken
      });
  });

  app.post("/auth/login", loginRouteOptions, async (request, reply) => {
    const body = loginBodySchema.parse(request.body);
    const result = await authService.login(body);

    return reply
      .setCookie(
        authService.refreshCookieName,
        result.tokens.refreshToken,
        authService.refreshCookieOptions
      )
      .send({
        user: result.user,
        tenant: result.tenant,
        accessToken: result.tokens.accessToken
      });
  });

  app.post("/auth/refresh", { schema: refreshRouteSchema }, async (request, reply) => {
    const result = await authService.refresh(request.cookies[authService.refreshCookieName]);

    return reply
      .setCookie(
        authService.refreshCookieName,
        result.tokens.refreshToken,
        authService.refreshCookieOptions
      )
      .send({
        user: result.user,
        tenant: result.tenant,
        accessToken: result.tokens.accessToken
      });
  });

  app.post("/auth/logout", { schema: logoutRouteSchema }, async (_request, reply) =>
    reply
      .clearCookie(authService.refreshCookieName, authService.clearRefreshCookieOptions)
      .status(204)
      .send()
  );

  app.get("/auth/me", { schema: meRouteSchema }, async (request) => {
    request.headers.authorization = `Bearer ${getBearerToken(request)}`;
    const userId = await getAuthenticatedUserId(request);
    const session = await authService.getCurrentSession(userId);

    return session;
  });
}
