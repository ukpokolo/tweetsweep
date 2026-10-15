export type CallbackOutcome =
  | { ok: true; code: string }
  | { ok: false; error: "denied" | "invalid_state" | "missing_code" };

/**
 * Validates the params X sends back to our callback against the state we
 * stored when login started. A mismatch means the request didn't come from a
 * login this browser started (possible CSRF), so we refuse it.
 */
export function checkCallback(
  params: URLSearchParams,
  expectedState: string | null,
): CallbackOutcome {
  if (params.get("error")) return { ok: false, error: "denied" };
  const state = params.get("state");
  if (!expectedState || !state || state !== expectedState) {
    return { ok: false, error: "invalid_state" };
  }
  const code = params.get("code");
  if (!code) return { ok: false, error: "missing_code" };
  return { ok: true, code };
}
