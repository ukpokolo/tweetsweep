import { describe, expect, it } from "vitest";
import { checkCallback } from "./callback";

const q = (s: string) => new URLSearchParams(s);

describe("checkCallback", () => {
  it("accepts a matching state with a code", () => {
    expect(checkCallback(q("state=s1&code=abc"), "s1")).toEqual({ ok: true, code: "abc" });
  });
  it("reports the user denying access", () => {
    expect(checkCallback(q("error=access_denied&state=s1"), "s1")).toEqual({ ok: false, error: "denied" });
  });
  it("rejects a state mismatch", () => {
    expect(checkCallback(q("state=evil&code=abc"), "s1")).toEqual({ ok: false, error: "invalid_state" });
  });
  it("rejects when no login was started (no stored state)", () => {
    expect(checkCallback(q("state=s1&code=abc"), null)).toEqual({ ok: false, error: "invalid_state" });
  });
  it("rejects a missing state or code", () => {
    expect(checkCallback(q("code=abc"), "s1")).toEqual({ ok: false, error: "invalid_state" });
    expect(checkCallback(q("state=s1"), "s1")).toEqual({ ok: false, error: "missing_code" });
  });
});
