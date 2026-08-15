import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { ConfigValidationError, parseEnv } from "./env.js";

const validEnv = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://brm:brm_dev_password@127.0.0.1:5432/business_review_monitor",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: "access-secret-with-at-least-32-chars",
  JWT_REFRESH_SECRET: "refresh-secret-with-at-least-32-chars",
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, "a").toString("base64"),
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  GOOGLE_REDIRECT_URI: "http://localhost:3333/integrations/google/callback",
  WEB_URL: "http://localhost:3000",
  API_URL: "http://localhost:3333",
  GOOGLE_PROVIDER: "mock"
};

describe("parseEnv", () => {
  it("parses a valid environment", () => {
    const config = parseEnv(validEnv);

    expect(config.NODE_ENV).toBe("development");
    expect(config.BRM_QUEUE_PREFIX).toBe("brm");
    expect(config.GOOGLE_PROVIDER).toBe("mock");
  });

  it("defaults NODE_ENV, BRM_QUEUE_PREFIX and GOOGLE_PROVIDER", () => {
    const envWithoutDefaults: Record<string, string> = { ...validEnv };
    delete envWithoutDefaults.NODE_ENV;
    delete envWithoutDefaults.BRM_QUEUE_PREFIX;
    delete envWithoutDefaults.GOOGLE_PROVIDER;

    const config = parseEnv(envWithoutDefaults);

    expect(config.NODE_ENV).toBe("development");
    expect(config.BRM_QUEUE_PREFIX).toBe("brm");
    expect(config.GOOGLE_PROVIDER).toBe("mock");
  });

  it("rejects an invalid encryption key", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        TOKEN_ENCRYPTION_KEY: "not-a-32-byte-key"
      })
    ).toThrow(ConfigValidationError);
  });

  it("reports invalid variable names without exposing values", () => {
    try {
      parseEnv({
        ...validEnv,
        JWT_ACCESS_SECRET: "short"
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect((error as ConfigValidationError).issues).toContain("JWT_ACCESS_SECRET");
      expect((error as Error).message).not.toContain("short");
    }
  });
});
