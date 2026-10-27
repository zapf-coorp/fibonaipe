import type { AppError, Result } from "@fibonaipe/domain";

export interface CryptoVault {
  encrypt(plaintext: string): Result<string, AppError>;
  decrypt(ciphertext: string): Result<string, AppError>;
}
