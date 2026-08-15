import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTE_LENGTH = 32;
const IV_BYTE_LENGTH = 12;
const AUTH_TAG_BYTE_LENGTH = 16;

type EncryptedPayload = {
  version: "v1";
  algorithm: typeof ALGORITHM;
  iv: string;
  authTag: string;
  ciphertext: string;
};

export class EncryptionError extends Error {
  constructor(message = "Encryption operation failed") {
    super(message);
    this.name = "EncryptionError";
  }
}

export class EncryptionService {
  constructor(private readonly key: Buffer) {
    if (key.length !== KEY_BYTE_LENGTH) {
      throw new EncryptionError("TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
    }
  }

  encrypt(value: string): string {
    try {
      const iv = randomBytes(IV_BYTE_LENGTH);
      const cipher = createCipheriv(ALGORITHM, this.key, iv);
      const ciphertext = Buffer.concat([
        cipher.update(value, "utf8"),
        cipher.final()
      ]);
      const authTag = cipher.getAuthTag();

      const payload: EncryptedPayload = {
        version: "v1",
        algorithm: ALGORITHM,
        iv: iv.toString("base64"),
        authTag: authTag.toString("base64"),
        ciphertext: ciphertext.toString("base64")
      };

      return JSON.stringify(payload);
    } catch (error) {
      if (error instanceof EncryptionError) {
        throw error;
      }

      throw new EncryptionError();
    }
  }

  decrypt(value: string): string {
    try {
      const payload = parseEncryptedPayload(value);
      const iv = decodeBase64(payload.iv);
      const authTag = decodeBase64(payload.authTag);
      const ciphertext = decodeBase64(payload.ciphertext);

      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);

      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]).toString("utf8");
    } catch (error) {
      if (error instanceof EncryptionError) {
        throw error;
      }

      throw new EncryptionError();
    }
  }
}

export function createEncryptionServiceFromBase64Key(
  base64Key: string
): EncryptionService {
  return new EncryptionService(decodeBase64(base64Key));
}

function parseEncryptedPayload(value: string): EncryptedPayload {
  try {
    const payload = JSON.parse(value) as Partial<EncryptedPayload>;

    if (
      payload.version !== "v1" ||
      payload.algorithm !== ALGORITHM ||
      typeof payload.iv !== "string" ||
      typeof payload.authTag !== "string" ||
      typeof payload.ciphertext !== "string"
    ) {
      throw new Error("Invalid encrypted payload shape");
    }

    const iv = decodeBase64(payload.iv);
    const authTag = decodeBase64(payload.authTag);
    const ciphertext = decodeBase64(payload.ciphertext);

    if (
      iv.length !== IV_BYTE_LENGTH ||
      authTag.length !== AUTH_TAG_BYTE_LENGTH ||
      ciphertext.length === 0
    ) {
      throw new Error("Invalid encrypted payload encoding");
    }

    return {
      version: payload.version,
      algorithm: payload.algorithm,
      iv: payload.iv,
      authTag: payload.authTag,
      ciphertext: payload.ciphertext
    };
  } catch {
    throw new EncryptionError("Invalid encrypted payload");
  }
}

function decodeBase64(value: string): Buffer {
  if (value.length === 0) {
    throw new Error("Invalid base64 value");
  }

  const decoded = Buffer.from(value, "base64");

  if (decoded.toString("base64") !== value) {
    throw new Error("Invalid base64 value");
  }

  return decoded;
}
