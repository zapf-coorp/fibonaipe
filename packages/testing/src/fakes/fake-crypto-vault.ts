import { createAppError, err, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { CryptoVault } from "@fibonaipe/application";

const PREFIX = "fake-vault:v1:";

export class FakeCryptoVault implements CryptoVault {
  encrypt(plaintext: string): Result<string, AppError> {
    return ok(`${PREFIX}${encodeHex(plaintext)}`);
  }

  decrypt(ciphertext: string): Result<string, AppError> {
    if (!ciphertext.startsWith(PREFIX) || (ciphertext.length - PREFIX.length) % 4 !== 0) {
      return err(createAppError("VALIDATION"));
    }
    return ok(decodeHex(ciphertext.slice(PREFIX.length)));
  }
}

function encodeHex(value: string): string {
  let encoded = "";
  for (const char of value) {
    encoded += char.charCodeAt(0).toString(16).padStart(4, "0");
  }
  return encoded;
}

function decodeHex(value: string): string {
  let decoded = "";
  for (let index = 0; index < value.length; index += 4) {
    decoded += String.fromCharCode(Number.parseInt(value.slice(index, index + 4), 16));
  }
  return decoded;
}
