import type { EncryptionService } from "@brm/shared";

import type { TokenCipher } from "../../application/ports/token-cipher.js";

export class EncryptionTokenCipher implements TokenCipher {
  constructor(private readonly encryptionService: EncryptionService) {}

  encrypt(value: string): string {
    return this.encryptionService.encrypt(value);
  }

  decrypt(value: string): string {
    return this.encryptionService.decrypt(value);
  }
}
