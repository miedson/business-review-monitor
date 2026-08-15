export interface TokenCipher {
  encrypt(value: string): string;
  decrypt(value: string): string;
}
