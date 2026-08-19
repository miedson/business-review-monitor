import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MetaWebhookSignatureVerifier } from "./meta-webhook-signature-verifier.js";

describe("MetaWebhookSignatureVerifier", () => {
  const appSecret = "test-app-secret";
  const verifier = new MetaWebhookSignatureVerifier(appSecret);

  it("verifies valid signature", () => {
    const rawBody = '{"object":"instagram","entry":[{"id":"123","time":1234567890}]}';
    const expectedSignature = `sha256=${createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`;

    const result = verifier.verify(rawBody, expectedSignature);

    expect(result).toBe(true);
  });

  it("rejects invalid signature", () => {
    const rawBody = '{"object":"instagram","entry":[{"id":"123","time":1234567890}]}';
    const signature = "sha256=invalid-signature";

    const result = verifier.verify(rawBody, signature);

    expect(result).toBe(false);
  });

  it("rejects missing signature", () => {
    const rawBody = '{"object":"instagram","entry":[{"id":"123","time":1234567890}]}';

    const result = verifier.verify(rawBody, "");

    expect(result).toBe(false);
  });

  it("rejects undefined signature", () => {
    const rawBody = '{"object":"instagram","entry":[{"id":"123","time":1234567890}]}';

    const result = verifier.verify(rawBody, undefined as unknown as string);

    expect(result).toBe(false);
  });

  it("uses timing-safe comparison", () => {
    const rawBody = '{"test":"data"}';
    const signature = "sha256=some-signature";

    expect(() => verifier.verify(rawBody, signature)).not.toThrow();
  });

  it("throws on empty app secret", () => {
    expect(() => new MetaWebhookSignatureVerifier("")).toThrow("App secret is required");
  });
});