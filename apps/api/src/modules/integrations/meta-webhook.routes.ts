import { timingSafeEqual as cryptoTimingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";

import type {
  MetaWebhookPayload,
  MetaWebhookVerifyQuery,
  MetaWebhookVerifyResult,
} from "@brm/review-monitoring";
import { MetaWebhookError } from "@brm/review-monitoring";
import { MetaWebhookSignatureVerifier } from "@brm/shared";

const verifyQuerySchema = z.object({
  "hub.mode": z.string().min(1),
  "hub.verify_token": z.string().min(1),
  "hub.challenge": z.string().min(1),
});

const metaWebhookErrorResponseSchema = {
  type: "object",
  required: ["error", "requestId"],
  properties: {
    error: { type: "string" },
    code: { type: "string" },
    requestId: { type: "string" },
  },
};

const metaWebhookVerifyRouteSchema = {
  tags: ["Meta Webhook"],
  summary: "Verify Meta webhook subscription",
  description:
    "Handles the Meta webhook verification challenge. Meta calls this endpoint with hub.mode=subscribe, hub.verify_token, and hub.challenge. Returns the challenge as plain text if verification succeeds.",
  querystring: {
    type: "object",
    required: ["hub.mode", "hub.verify_token", "hub.challenge"],
    properties: {
      "hub.mode": { type: "string" },
      "hub.verify_token": { type: "string" },
      "hub.challenge": { type: "string" },
    },
  },
  response: {
    200: {
      description: "Challenge verification successful, returns challenge as plain text",
      type: "string",
      content: {
        "text/plain": {
          schema: { type: "string" },
        },
      },
    },
    403: metaWebhookErrorResponseSchema,
  },
};

const metaWebhookReceiveRouteSchema = {
  tags: ["Meta Webhook"],
  summary: "Receive Meta webhook events",
  description:
    "Receives real-time events from Meta (Instagram). Validates the X-Hub-Signature-256 header using the Meta App Secret.",
  security: [],
  response: {
    200: {
      type: "object",
      required: ["received"],
      properties: {
        received: { type: "boolean" },
      },
    },
    401: metaWebhookErrorResponseSchema,
    403: metaWebhookErrorResponseSchema,
    400: metaWebhookErrorResponseSchema,
  },
};

export type RegisterMetaWebhookRoutesOptions = {
  config: {
    metaWebhookVerifyToken: string;
    metaAppSecret: string;
  };
  metaWebhookQueue?: {
    add: (name: string, data: unknown) => Promise<{ id?: string | number }>;
  };
};

function createMetaWebhookError(code: MetaWebhookError["code"], message: string): MetaWebhookError {
  return new MetaWebhookError(code, message);
}

function verifyChallenge(
  query: MetaWebhookVerifyQuery,
  verifyToken: string,
): MetaWebhookVerifyResult {
  if (query["hub.mode"] !== "subscribe") {
    return {
      success: false,
      error: createMetaWebhookError("META_WEBHOOK_INVALID_VERIFY_TOKEN", "Invalid hub.mode"),
    };
  }

  const providedToken = query["hub.verify_token"];
  const expectedToken = verifyToken;

  if (!timingSafeEqual(providedToken, expectedToken)) {
    return {
      success: false,
      error: createMetaWebhookError("META_WEBHOOK_INVALID_VERIFY_TOKEN", "Invalid verify token"),
    };
  }

  return { success: true, challenge: query["hub.challenge"] };
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return cryptoTimingSafeEqual(bufferA, bufferB);
}

function getRawBody(request: FastifyRequest): string | undefined {
  return (request as unknown as Record<string, unknown>).rawBody as string | undefined;
}

export function registerMetaWebhookRoutes(
  app: FastifyInstance,
  options: RegisterMetaWebhookRoutesOptions,
): void {
  const verifyToken = options.config.metaWebhookVerifyToken;
  const appSecret = options.config.metaAppSecret;
  const signatureVerifier = new MetaWebhookSignatureVerifier(appSecret);

  app.get<{
    Querystring: MetaWebhookVerifyQuery;
  }>("/webhooks/meta", { schema: metaWebhookVerifyRouteSchema }, async (request, reply) => {
    const query = verifyQuerySchema.parse(request.query);

    request.log.info({
      provider: "meta",
      operation: "webhook_verify_received",
      mode: query["hub.mode"],
      hasVerifyToken: !!query["hub.verify_token"],
      hasChallenge: !!query["hub.challenge"],
    });

    const result = verifyChallenge(query, verifyToken);

    if (!result.success) {
      request.log.warn({
        provider: "meta",
        operation: "webhook_verify_failed",
        errorCode: result.error.code,
        errorMessage: result.error.message,
      });

      return reply.status(403).send({
        error: result.error.message,
        code: result.error.code,
        requestId: request.id,
      });
    }

    request.log.info({
      provider: "meta",
      operation: "webhook_verify_success",
    });

    return reply.type("text/plain").send(result.challenge);
  });

  app.post<{
    Body: MetaWebhookPayload;
  }>("/webhooks/meta", { schema: metaWebhookReceiveRouteSchema }, async (request, reply) => {
    const signature = request.headers["x-hub-signature-256"] as string | undefined;
    const rawBody = getRawBody(request);
    const body = request.body as MetaWebhookPayload | undefined;

    request.log.info({
      provider: "meta",
      operation: "webhook_received",
      hasSignature: !!signature,
      object: body?.object,
      entryCount: body?.entry?.length ?? 0,
      entryKeys: body?.entry?.[0] ? Object.keys(body.entry[0]) : [],
    });

    if (!signature) {
      request.log.warn({
        provider: "meta",
        operation: "webhook_signature_missing",
      });

      return reply.status(401).send({
        error: "Missing X-Hub-Signature-256 header",
        code: "META_WEBHOOK_INVALID_SIGNATURE",
        requestId: request.id,
      });
    }

    if (!rawBody) {
      request.log.warn({
        provider: "meta",
        operation: "webhook_raw_body_missing",
      });

      return reply.status(400).send({
        error: "Raw body required for signature verification",
        code: "META_WEBHOOK_INVALID_PAYLOAD",
        requestId: request.id,
      });
    }

    const isValidSignature = signatureVerifier.verify(rawBody, signature);

    if (!isValidSignature) {
      request.log.warn({
        provider: "meta",
        operation: "webhook_signature_invalid",
      });

      return reply.status(401).send({
        error: "Invalid signature",
        code: "META_WEBHOOK_INVALID_SIGNATURE",
        requestId: request.id,
      });
    }

    if (!body || typeof body !== "object" || !("object" in body) || !("entry" in body)) {
      request.log.warn({
        provider: "meta",
        operation: "webhook_payload_invalid",
      });

      return reply.status(400).send({
        error: "Invalid payload structure",
        code: "META_WEBHOOK_INVALID_PAYLOAD",
        requestId: request.id,
      });
    }

    if (options.metaWebhookQueue) {
      const job = await options.metaWebhookQueue.add("process-meta-webhook-event", {
        payload: body,
        receivedAt: new Date().toISOString(),
        requestId: request.id,
      });

      request.log.info({
        provider: "meta",
        operation: "webhook_enqueued",
        jobId: job.id ? String(job.id) : null,
        eventType: body.object,
        entryCount: body.entry.length,
      });
    } else {
      request.log.info({
        provider: "meta",
        operation: "webhook_received_no_queue",
        eventType: body.object,
        entryCount: body.entry.length,
      });
    }

    return reply.send({ received: true });
  });
}
