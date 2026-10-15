import { NextResponse, type NextRequest } from "next/server";
import { destroySession } from "@/lib/session";

// POST only, so a stray link or image tag can't log someone out.
export async function POST(req: NextRequest) {
  await destroySession();
  // 303 makes the browser follow with GET.
  return NextResponse.redirect(new URL("/", req.url), 303);
}
