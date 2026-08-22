import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";

export async function registerDevSwagger(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Business Review Monitor API",
        description: "Development-only API documentation for local browser testing.",
        version: "0.1.0",
      },
      tags: [{ name: "Health" }, { name: "Auth" }, { name: "Google Integration" }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/dev/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });
}
