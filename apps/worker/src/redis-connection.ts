import type { ConnectionOptions } from "bullmq";

export function createBullMqConnection(redisUrl: string): ConnectionOptions {
  const parsedUrl = new URL(redisUrl);

  if (parsedUrl.protocol !== "redis:" && parsedUrl.protocol !== "rediss:") {
    throw new Error("REDIS_URL must use redis:// or rediss://");
  }

  return {
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 6379),
    username: parsedUrl.username ? decodeURIComponent(parsedUrl.username) : undefined,
    password: parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined,
    db: parseRedisDatabase(parsedUrl.pathname),
    tls: parsedUrl.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null
  };
}

function parseRedisDatabase(pathname: string): number | undefined {
  const database = pathname.replace("/", "");

  if (!database) {
    return undefined;
  }

  const parsedDatabase = Number(database);

  if (!Number.isInteger(parsedDatabase) || parsedDatabase < 0) {
    throw new Error("REDIS_URL database must be a non-negative integer");
  }

  return parsedDatabase;
}
