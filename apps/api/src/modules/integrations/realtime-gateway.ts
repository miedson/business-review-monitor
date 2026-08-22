import type { Redis } from "ioredis";

export type RealtimeEvent = { tenantId: string; type: string; payload: Record<string, string> };

export class RealtimeGateway {
  private readonly listeners = new Map<string, Set<(event: RealtimeEvent) => void>>();
  private readonly subscriber: Redis;
  private readonly publisher: Redis;
  constructor(redis: Redis) {
    this.publisher = redis;
    this.subscriber = redis.duplicate();
    void this.subscriber.subscribe("brh:realtime");
    this.subscriber.on("message", (_channel, raw) => {
      try {
        const event = JSON.parse(raw) as RealtimeEvent;
        this.listeners.get(event.tenantId)?.forEach((listener) => listener(event));
      } catch {
        /* malformed pub/sub messages are ignored */
      }
    });
  }
  addListener(tenantId: string, listener: (event: RealtimeEvent) => void): () => void {
    const listeners = this.listeners.get(tenantId) ?? new Set();
    listeners.add(listener);
    this.listeners.set(tenantId, listeners);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) this.listeners.delete(tenantId);
    };
  }
  async publish(event: RealtimeEvent): Promise<void> {
    await this.publisher.publish("brh:realtime", JSON.stringify(event));
  }
  async close(): Promise<void> {
    await this.subscriber.quit();
  }
}
