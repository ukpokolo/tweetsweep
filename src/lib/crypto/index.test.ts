import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from ".";

const key = randomBytes(32).toString("base64");

describe("crypto", () => {
  it("round-trips unicode text", () => {
    const text = "Wetin dey happen? 🔥 naija no dey carry last";
    expect(decrypt(encrypt(text, key), key)).toBe(text);
  });

  it("uses a fresh IV so equal plaintexts differ", () => {
    expect(encrypt("same", key).equals(encrypt("same", key))).toBe(false);
  });

  it("rejects the wrong key", () => {
    const other = randomBytes(32).toString("base64");
    expect(() => decrypt(encrypt("secret", key), other)).toThrow();
  });

  it("rejects tampered ciphertext", () => {
    const blob = encrypt("secret", key);
    blob[blob.length - 1] ^= 1;
    expect(() => decrypt(blob, key)).toThrow();
  });

  it("rejects a key of the wrong length", () => {
    expect(() => encrypt("x", Buffer.alloc(16).toString("base64"))).toThrow();
  });
});
