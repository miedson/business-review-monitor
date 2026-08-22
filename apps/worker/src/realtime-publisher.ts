import type { Redis } from "ioredis";

export type RealtimeEventPublisher = {
  publish(event: {
    tenantId: string;
    type: string;
    payload: Record<string, string>;
  }): Promise<void>;
};

export class RedisRealtimeEventPublisher implements RealtimeEventPublisher {
  constructor(private readonly redis: Redis) {}
  async publish(event: {
    tenantId: string;
    type: string;
    payload: Record<string, string>;
  }): Promise<void> {
    await this.redis.publish("brh:realtime", JSON.stringify(event));
  }
}
