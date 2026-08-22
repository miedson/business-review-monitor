import { describe, expect, it } from "vitest";

import { createBullMqConnection } from "./redis-connection.js";

describe("createBullMqConnection", () => {
  it("creates BullMQ connection options from REDIS_URL", () => {
    expect(createBullMqConnection("redis://user:secret@localhost:6380/2")).toEqual({
      host: "localhost",
      port: 6380,
      username: "user",
      password: "secret",
      db: 2,
      tls: undefined,
      maxRetriesPerRequest: null,
    });
  });

  it("enables TLS for rediss URLs", () => {
    expect(createBullMqConnection("rediss://redis.example.com")).toMatchObject({
      host: "redis.example.com",
      port: 6379,
      tls: {},
    });
  });

  it("rejects unsupported URL protocols", () => {
    expect(() => createBullMqConnection("http://localhost:6379")).toThrow(
      "REDIS_URL must use redis:// or rediss://",
    );
  });
});
