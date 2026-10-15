// X OAuth 2.0 (authorization code + PKCE) client.
// NOTE: endpoint URLs below were written from memory of X's docs and could not
// be checked against docs.x.com from the build sandbox. Confirm on first login.
export const X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
export const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
export const X_ME_URL = "https://api.x.com/2/users/me";

// offline.access is required for X to issue a refresh token; without it the
// access token expires after ~2 hours and users would have to log in again.
export const X_SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];

export type XOAuthConfig = {
  clientId: string;
  /** Present for confidential clients (uses HTTP Basic auth at the token endpoint). */
  clientSecret?: string;
  redirectUri: string;
};

export type XTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
};

export type XUser = { id: string; username: string };

type Fetch = typeof fetch;

export class XOAuthError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "XOAuthError";
  }
}

export function buildAuthorizeUrl(
  cfg: XOAuthConfig,
  params: { state: string; challenge: string },
): string {
  const url = new URL(X_AUTHORIZE_URL);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: X_SCOPES.join(" "),
    state: params.state,
    code_challenge: params.challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

async function tokenRequest(
  cfg: XOAuthConfig,
  body: Record<string, string>,
  doFetch: Fetch,
  now: Date,
): Promise<XTokens> {
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const form = new URLSearchParams(body);
  if (cfg.clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64")}`;
  } else {
    form.set("client_id", cfg.clientId);
  }

  const res = await doFetch(X_TOKEN_URL, { method: "POST", headers, body: form });
  if (!res.ok) {
    // Never include the response body verbatim: it can echo credentials.
    throw new XOAuthError(`X token request failed (${res.status})`, res.status);
  }
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!json.access_token || !json.refresh_token || typeof json.expires_in !== "number") {
    throw new XOAuthError(
      "X did not return a refresh token. Check that the app allows offline.access.",
    );
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: new Date(now.getTime() + json.expires_in * 1000),
    scopes: (json.scope ?? "").split(" ").filter(Boolean),
  };
}

export function exchangeCode(
  cfg: XOAuthConfig,
  params: { code: string; verifier: string },
  doFetch: Fetch = fetch,
  now = new Date(),
): Promise<XTokens> {
  return tokenRequest(
    cfg,
    {
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: cfg.redirectUri,
      code_verifier: params.verifier,
    },
    doFetch,
    now,
  );
}

/** X rotates refresh tokens: the returned refreshToken replaces the old one. */
export function refreshTokens(
  cfg: XOAuthConfig,
  refreshToken: string,
  doFetch: Fetch = fetch,
  now = new Date(),
): Promise<XTokens> {
  return tokenRequest(
    cfg,
    { grant_type: "refresh_token", refresh_token: refreshToken },
    doFetch,
    now,
  );
}

export async function fetchMe(accessToken: string, doFetch: Fetch = fetch): Promise<XUser> {
  const res = await doFetch(X_ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new XOAuthError(`X users/me failed (${res.status})`, res.status);
  const json = (await res.json()) as { data?: { id?: string; username?: string } };
  if (!json.data?.id || !json.data.username) {
    throw new XOAuthError("X returned an unexpected users/me response.");
  }
  return { id: json.data.id, username: json.data.username };
}
