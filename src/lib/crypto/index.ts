import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Layout of an encrypted blob: iv (12) | auth tag (16) | ciphertext.
// AES-256-GCM is authenticated: tampering makes decrypt() throw.
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function keyFromBase64(key: string): Buffer {
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) throw new Error("Encryption key must be 32 bytes");
  return buf;
}

export function encrypt(plaintext: string, key: string): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", keyFromBase64(key), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

export function decrypt(blob: Uint8Array, key: string): string {
  const buf = Buffer.from(blob);
  if (buf.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Encrypted blob is too short");
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", keyFromBase64(key), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8",
  );
}
