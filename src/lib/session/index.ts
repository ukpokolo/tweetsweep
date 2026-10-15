import { cookies } from "next/headers";
import { getEnv } from "@/env";
import { decrypt, encrypt } from "@/lib/crypto";
import { signToken, verifyToken } from "./sign";

const SESSION_COOKIE = "ts_session";
const OAUTH_COOKIE = "ts_oauth";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days
const OAUTH_TTL = 60 * 10; // 10 minutes to finish logging in at X

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  // "lax" (not "strict") so the cookie is sent when X redirects back to us.
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

export async function createSession(userId: string, handle: string): Promise<void> {
  const token = signToken({ uid: userId, handle }, getEnv().SESSION_SECRET, SESSION_TTL);
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL));
}

export type Session = { userId: string; handle: string };

/** The signed-in user, or null. */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyToken(token, getEnv().SESSION_SECRET);
  if (typeof payload?.uid !== "string" || typeof payload.handle !== "string") return null;
  return { userId: payload.uid, handle: payload.handle };
}

export async function getSessionUserId(): Promise<string | null> {
  return (await getSession())?.userId ?? null;
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

// Holds the OAuth state and PKCE verifier between "start login" and "callback".
// Encrypted (not just signed) because the verifier must stay secret.
export type OAuthFlow = { state: string; verifier: string };

export async function saveOAuthFlow(flow: OAuthFlow): Promise<void> {
  const payload = JSON.stringify({ ...flow, exp: Math.floor(Date.now() / 1000) + OAUTH_TTL });
  const sealed = encrypt(payload, getEnv().ENCRYPTION_KEY).toString("base64url");
  (await cookies()).set(OAUTH_COOKIE, sealed, cookieOptions(OAUTH_TTL));
}

/** Reads and clears the flow cookie, so each login attempt can be used once. */
export async function takeOAuthFlow(): Promise<OAuthFlow | null> {
  const store = await cookies();
  const sealed = store.get(OAUTH_COOKIE)?.value;
  store.delete(OAUTH_COOKIE);
  if (!sealed) return null;
  try {
    const p = JSON.parse(decrypt(Buffer.from(sealed, "base64url"), getEnv().ENCRYPTION_KEY));
    if (typeof p.state !== "string" || typeof p.verifier !== "string") return null;
    if (typeof p.exp !== "number" || p.exp * 1000 <= Date.now()) return null;
    return { state: p.state, verifier: p.verifier };
  } catch {
    return null;
  }
}
