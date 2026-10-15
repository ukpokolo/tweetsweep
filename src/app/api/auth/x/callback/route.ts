import { NextResponse, type NextRequest } from "next/server";
import { saveLogin, xOAuthConfig } from "@/lib/auth";
import { createSession, takeOAuthFlow } from "@/lib/session";
import { checkCallback } from "@/lib/x/callback";
import { exchangeCode, fetchMe } from "@/lib/x/oauth";

export async function GET(req: NextRequest) {
  const back = (error?: string) =>
    NextResponse.redirect(new URL(error ? `/import?error=${error}` : "/import", req.url));

  const flow = await takeOAuthFlow();
  const outcome = checkCallback(req.nextUrl.searchParams, flow?.state ?? null);
  if (!outcome.ok || !flow) return back(outcome.ok ? "invalid_state" : outcome.error);

  try {
    const cfg = xOAuthConfig();
    const tokens = await exchangeCode(cfg, { code: outcome.code, verifier: flow.verifier });
    const me = await fetchMe(tokens.accessToken);
    await createSession(await saveLogin(me, tokens), me.username);
  } catch (e) {
    // Log the reason server-side; show the user a generic message.
    console.error("X login failed:", e instanceof Error ? e.message : e);
    return back("login_failed");
  }
  return back();
}
