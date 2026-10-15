import { getEnv } from "@/env";
import { encrypt } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import type { XOAuthConfig, XTokens, XUser } from "@/lib/x/oauth";

export function xOAuthConfig(): XOAuthConfig {
  const env = getEnv();
  return {
    clientId: env.X_CLIENT_ID,
    clientSecret: env.X_CLIENT_SECRET || undefined,
    redirectUri: env.X_REDIRECT_URI,
  };
}

/** Creates or updates the user and stores their tokens encrypted. Returns the user id. */
export async function saveLogin(me: XUser, tokens: XTokens): Promise<string> {
  const key = getEnv().ENCRYPTION_KEY;
  const data = {
    accessTokenEnc: new Uint8Array(encrypt(tokens.accessToken, key)),
    refreshTokenEnc: new Uint8Array(encrypt(tokens.refreshToken, key)),
    expiresAt: tokens.expiresAt,
    scopes: tokens.scopes,
  };
  const user = await getDb().user.upsert({
    where: { xUserId: me.id },
    create: { xUserId: me.id, handle: me.username, account: { create: data } },
    update: { handle: me.username, account: { upsert: { create: data, update: data } } },
    select: { id: true },
  });
  return user.id;
}
