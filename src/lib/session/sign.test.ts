import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./sign";

const secret = "x".repeat(40);
const t0 = Date.UTC(2026, 0, 1);

describe("signToken / verifyToken", () => {
  it("round-trips data", () => {
    const tok = signToken({ uid: "u1" }, secret, 60, t0);
    expect(verifyToken(tok, secret, t0 + 1000)?.uid).toBe("u1");
  });
  it("rejects expired tokens", () => {
    const tok = signToken({ uid: "u1" }, secret, 60, t0);
    expect(verifyToken(tok, secret, t0 + 61_000)).toBeNull();
  });
  it("rejects the wrong secret", () => {
    const tok = signToken({ uid: "u1" }, secret, 60, t0);
    expect(verifyToken(tok, "y".repeat(40), t0)).toBeNull();
  });
  it("rejects a tampered payload", () => {
    const tok = signToken({ uid: "u1" }, secret, 60, t0);
    const [, sig] = tok.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "admin", exp: 9e9 })).toString("base64url");
    expect(verifyToken(`${forged}.${sig}`, secret, t0)).toBeNull();
  });
  it("rejects garbage", () => {
    for (const bad of ["", "abc", "a.b.c", "."]) expect(verifyToken(bad, secret, t0)).toBeNull();
  });
});
