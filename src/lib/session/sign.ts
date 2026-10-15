import { createHmac, timingSafeEqual } from "node:crypto";

// Signed, expiring tokens: base64url(json) + "." + base64url(hmac).
// The payload is readable by the holder but cannot be altered without the secret.

type Payload = Record<string, unknown> & { exp: number }; // exp: unix seconds

const mac = (data: string, secret: string) =>
  createHmac("sha256", secret).update(data).digest("base64url");

export function signToken(
  data: Record<string, unknown>,
  secret: string,
  ttlSeconds: number,
  nowMs = Date.now(),
): string {
  const payload: Payload = { ...data, exp: Math.floor(nowMs / 1000) + ttlSeconds };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${mac(body, secret)}`;
}

/** Returns the payload, or null if malformed, tampered with, or expired. */
export function verifyToken(
  token: string,
  secret: string,
  nowMs = Date.now(),
): Payload | null {
  const [body, sig, ...rest] = token.split(".");
  if (!body || !sig || rest.length > 0) return null;
  const expected = Buffer.from(mac(body, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= nowMs) return null;
    return payload;
  } catch {
    return null;
  }
}
