import { z } from "zod";

const base64EncodedBytes = (expectedBytes: number) =>
  z.string().refine(
    (value) => {
      try {
        return Buffer.from(value, "base64").byteLength === expectedBytes;
      } catch {
        return false;
      }
    },
    { message: `must be a base64-encoded ${expectedBytes}-byte value` }
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  BRM_QUEUE_PREFIX: z.string().min(1).default("brm"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  TOKEN_ENCRYPTION_KEY: base64EncodedBytes(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
  WEB_URL: z.string().url(),
  API_URL: z.string().url(),
  GOOGLE_PROVIDER: z.enum(["real", "mock"]).default("mock"),
  META_APP_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  META_INSTAGRAM_REDIRECT_URI: z.string().url(),
  META_WEBHOOK_VERIFY_TOKEN: z.string().min(1),
  META_GRAPH_API_VERSION: z.string().min(1).default("v21.0")
});

export type AppConfig = z.infer<typeof envSchema>;
export type NodeEnv = AppConfig["NODE_ENV"];
export type GoogleProvider = AppConfig["GOOGLE_PROVIDER"];

export class ConfigValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid environment configuration: ${issues.join(", ")}`);
    this.name = "ConfigValidationError";
    this.issues = issues;
  }
}

export function parseEnv(env: NodeJS.ProcessEnv): AppConfig {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => issue.path.join("."));
    throw new ConfigValidationError(issues);
  }

  return result.data;
}

export function loadConfig(): AppConfig {
  return parseEnv(process.env);
}
