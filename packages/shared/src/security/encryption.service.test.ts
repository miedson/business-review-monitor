import { describe, expect, it } from "vitest";

import {
  EncryptionError,
  EncryptionService,
  createEncryptionServiceFromBase64Key
} from "./encryption.service.js";

const key = Buffer.alloc(32, "a");

describe("EncryptionService", () => {
  it("encrypts and decrypts a value", () => {
    const service = new EncryptionService(key);

    const encrypted = service.encrypt("refresh-token-value");

    expect(encrypted).not.toContain("refresh-token-value");
    expect(service.decrypt(encrypted)).toBe("refresh-token-value");
  });

  it("uses a different IV for each encryption", () => {
    const service = new EncryptionService(key);

    expect(service.encrypt("same-value")).not.toBe(service.encrypt("same-value"));
  });

  it("rejects keys that are not 32 bytes", () => {
    expect(() => new EncryptionService(Buffer.alloc(31))).toThrow(EncryptionError);
  });

  it("rejects malformed payloads", () => {
    const service = new EncryptionService(key);

    expect(() => service.decrypt("not-json")).toThrow(EncryptionError);
  });

  it("rejects payloads with invalid encoding", () => {
    const service = new EncryptionService(key);
    const encrypted = service.encrypt("refresh-token-value");
    const payload = JSON.parse(encrypted) as {
      ciphertext: string;
    };

    payload.ciphertext = Buffer.from("tampered").toString("base64");

    expect(() => service.decrypt(JSON.stringify(payload))).toThrow(EncryptionError);
  });

  it("rejects payloads with invalid IV or auth tag sizes", () => {
    const service = new EncryptionService(key);
    const encrypted = service.encrypt("refresh-token-value");
    const payload = JSON.parse(encrypted) as {
      iv: string;
      authTag: string;
    };

    payload.iv = Buffer.alloc(11).toString("base64");
    expect(() => service.decrypt(JSON.stringify(payload))).toThrow(EncryptionError);

    payload.iv = Buffer.alloc(12).toString("base64");
    payload.authTag = Buffer.alloc(15).toString("base64");
    expect(() => service.decrypt(JSON.stringify(payload))).toThrow(EncryptionError);
  });

  it("rejects payloads with non-canonical base64", () => {
    const service = new EncryptionService(key);
    const encrypted = service.encrypt("refresh-token-value");
    const payload = JSON.parse(encrypted) as {
      iv: string;
    };

    payload.iv = "not-base64";

    expect(() => service.decrypt(JSON.stringify(payload))).toThrow(EncryptionError);
  });

  it("rejects decryption with a different key", () => {
    const service = new EncryptionService(key);
    const encrypted = service.encrypt("refresh-token-value");
    const otherKey = Buffer.alloc(32, "b");

    expect(() => new EncryptionService(otherKey).decrypt(encrypted)).toThrow(
      EncryptionError
    );
  });

  it("creates a service from a base64 encoded key", () => {
    const service = createEncryptionServiceFromBase64Key(key.toString("base64"));
    const encrypted = service.encrypt("refresh-token-value");

    expect(service.decrypt(encrypted)).toBe("refresh-token-value");
  });
});
