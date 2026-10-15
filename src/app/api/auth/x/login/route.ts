import { NextResponse } from "next/server";
import { xOAuthConfig } from "@/lib/auth";
import { saveOAuthFlow } from "@/lib/session";
import { buildAuthorizeUrl } from "@/lib/x/oauth";
import { challengeFor, generateState, generateVerifier } from "@/lib/x/pkce";

export async function GET() {
  const state = generateState();
  const verifier = generateVerifier();
  await saveOAuthFlow({ state, verifier });
  return NextResponse.redirect(
    buildAuthorizeUrl(xOAuthConfig(), { state, challenge: challengeFor(verifier) }),
  );
}
