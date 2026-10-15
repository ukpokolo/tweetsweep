import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  buildAuthorizeUrl,
  exchangeCode,
  fetchMe,
  refreshTokens,
  X_SCOPES,
  XOAuthError,
} from "./oauth";
import { challengeFor, generateState, generateVerifier } from "./pkce";

const cfg = { clientId: "cid", redirectUri: "http://localhost:3000/cb" };
const now = new Date("2026-01-01T00:00:00Z");

const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe("pkce", () => {
  it("makes a valid verifier and an S256 challenge", () => {
    const v = generateVerifier();
    expect(v).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(challengeFor(v)).toBe(createHash("sha256").update(v).digest("base64url"));
  });
  it("matches the RFC 7636 test vector", () => {
    expect(challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });
  it("generates unique states", () => {
    expect(generateState()).not.toBe(generateState());
  });
});

describe("buildAuthorizeUrl", () => {
  it("includes PKCE, state and all scopes", () => {
    const u = new URL(buildAuthorizeUrl(cfg, { state: "s", challenge: "c" }));
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("state")).toBe("s");
    expect(u.searchParams.get("scope")).toBe(X_SCOPES.join(" "));
    expect(u.searchParams.get("scope")).toContain("offline.access");
  });
});

describe("exchangeCode / refreshTokens", () => {
  const ok = { access_token: "a", refresh_token: "r", expires_in: 7200, scope: "tweet.read users.read" };

  it("sends the verifier and computes expiry", async () => {
    const f = vi.fn().mockResolvedValue(jsonRes(ok));
    const t = await exchangeCode(cfg, { code: "code", verifier: "ver" }, f, now);
    const body = f.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("code_verifier")).toBe("ver");
    expect(body.get("client_id")).toBe("cid"); // public client: id in body
    expect(f.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(t.expiresAt.toISOString()).toBe("2026-01-01T02:00:00.000Z");
    expect(t.scopes).toEqual(["tweet.read", "users.read"]);
  });

  it("uses Basic auth for confidential clients", async () => {
    const f = vi.fn().mockResolvedValue(jsonRes(ok));
    await refreshTokens({ ...cfg, clientSecret: "sec" }, "old", f, now);
    expect(f.mock.calls[0][1].headers.Authorization).toBe(
      `Basic ${Buffer.from("cid:sec").toString("base64")}`,
    );
    expect((f.mock.calls[0][1].body as URLSearchParams).get("grant_type")).toBe("refresh_token");
  });

  it("fails without echoing the response body", async () => {
    const f = vi.fn().mockResolvedValue(jsonRes({ error: "secret-ish" }, 400));
    const p = exchangeCode(cfg, { code: "c", verifier: "v" }, f, now);
    await expect(p).rejects.toBeInstanceOf(XOAuthError);
    await expect(p).rejects.not.toThrow(/secret-ish/);
  });

  it("errors clearly when no refresh token is issued", async () => {
    const f = vi.fn().mockResolvedValue(jsonRes({ access_token: "a", expires_in: 1 }));
    await expect(exchangeCode(cfg, { code: "c", verifier: "v" }, f, now)).rejects.toThrow(/offline.access/);
  });
});

describe("fetchMe", () => {
  it("returns id and username", async () => {
    const f = vi.fn().mockResolvedValue(jsonRes({ data: { id: "1", username: "ada" } }));
    expect(await fetchMe("tok", f)).toEqual({ id: "1", username: "ada" });
    expect(f.mock.calls[0][1].headers.Authorization).toBe("Bearer tok");
  });
  it("rejects bad responses", async () => {
    await expect(fetchMe("t", vi.fn().mockResolvedValue(jsonRes({}, 401)))).rejects.toBeInstanceOf(XOAuthError);
  });
});
