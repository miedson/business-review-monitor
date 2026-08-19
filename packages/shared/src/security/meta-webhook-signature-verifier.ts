import { createHmac, timingSafeEqual } from "node:crypto";

export class MetaWebhookSignatureVerifierError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetaWebhookSignatureVerifierError";
  }
}

export class MetaWebhookSignatureVerifier {
  constructor(private readonly appSecret: string) {
    if (!appSecret || appSecret.length === 0) {
      throw new MetaWebhookSignatureVerifierError("App secret is required");
    }
  }

  verify(rawBody: string, signature: string): boolean {
    if (!signature) {
      return false;
    }

    const expectedSignature = this.computeSignature(rawBody);

    return this.timingSafeCompare(signature, expectedSignature);
  }

  private computeSignature(rawBody: string): string {
    const hmac = createHmac("sha256", this.appSecret);
    hmac.update(rawBody, "utf8");
    return `sha256=${hmac.digest("hex")}`;
  }

  private timingSafeCompare(a: string, b: string): boolean {
    const bufferA = Buffer.from(a, "utf8");
    const bufferB = Buffer.from(b, "utf8");

    if (bufferA.length !== bufferB.length) {
      return false;
    }

    return timingSafeEqual(bufferA, bufferB);
  }
}