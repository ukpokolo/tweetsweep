import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/env";
import { getDb } from "@/lib/db";
import { archiveBatchSchema, toTweetRows } from "@/lib/ingest/archive";
import { getSessionUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = archiveBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_batch" }, { status: 400 });
  }

  const env = getEnv();
  const rows = toTweetRows(userId, parsed.data, {
    encryptionKey: env.ENCRYPTION_KEY,
    retentionDays: env.TWEET_RETENTION_DAYS,
  });
  // skipDuplicates makes re-uploading the same archive safe.
  const { count } = await getDb().tweet.createMany({ data: rows, skipDuplicates: true });
  return NextResponse.json({ received: rows.length, inserted: count });
}
