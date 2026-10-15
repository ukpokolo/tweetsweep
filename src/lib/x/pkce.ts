import { createHash, randomBytes } from "node:crypto";

// PKCE (RFC 7636): the app invents a secret (verifier), sends only its hash
// (challenge) when starting login, then proves it knows the secret when
// exchanging the code. An attacker who steals the code can't redeem it.

const b64url = (buf: Buffer) => buf.toString("base64url");

export function generateVerifier(): string {
  return b64url(randomBytes(32)); // 43 chars, within RFC 7636's 43-128
}

export function challengeFor(verifier: string): string {
  return b64url(createHash("sha256").update(verifier).digest());
}

/** Random value tying the callback to the browser that started login (CSRF defence). */
export function generateState(): string {
  return b64url(randomBytes(24));
}
