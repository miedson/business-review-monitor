import type { FastifyInstance, FastifyRequest } from "fastify";
import { RealtimeGateway } from "./realtime-gateway.js";

export function registerRealtimeRoute(app: FastifyInstance, input: { gateway: RealtimeGateway; authService: { getCurrentSession: (userId: string) => Promise<{ tenant: { id: string } }> } }): void {
  app.get("/realtime", { schema: { tags: ["Realtime"], summary: "Open tenant realtime stream", security: [{ bearerAuth: [] }] } }, async (request, reply) => {
    const userId = await getAuthenticatedUserId(request); const session = await input.authService.getCurrentSession(userId);
    reply.hijack(); const response = reply.raw;
    response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive", "x-accel-buffering": "no" }); response.write(": connected\n\n");
    const remove = input.gateway.addListener(session.tenant.id, (event) => { response.write(`event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`); });
    const heartbeat = setInterval(() => response.write(": heartbeat\n\n"), 25000);
    request.raw.on("close", () => { clearInterval(heartbeat); remove(); });
  });
}
async function getAuthenticatedUserId(request: FastifyRequest): Promise<string> { try { if (!request.headers.authorization?.startsWith("Bearer ")) throw new Error(); return (await request.jwtVerify<{ sub: string }>()).sub; } catch { const error = new Error("Authentication required") as Error & { statusCode: number }; error.statusCode = 401; throw error; } }
