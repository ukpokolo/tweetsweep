import { z } from "zod";
import { encrypt } from "@/lib/crypto";

export const MAX_BATCH = 500;

const tweetSchema = z.object({
  xTweetId: z.string().regex(/^\d{1,25}$/),
  createdAt: z.coerce.date(),
  text: z.string().max(25_000),
  hashtags: z.array(z.string().max(100)).max(100),
  mentions: z.array(z.string().max(50)).max(100),
  inReplyToId: z.string().regex(/^\d{1,25}$/).nullable(),
  quotedId: z.string().regex(/^\d{1,25}$/).nullable(),
});

export const archiveBatchSchema = z.object({
  tweets: z.array(tweetSchema).min(1).max(MAX_BATCH),
});

export type ArchiveBatch = z.infer<typeof archiveBatchSchema>;

/**
 * Builds DB rows from a validated batch. Tweet text is encrypted and given an
 * expiry date, after which it is purged (we keep as little content as possible).
 */
export function toTweetRows(
  userId: string,
  batch: ArchiveBatch,
  opts: { encryptionKey: string; retentionDays: number; now?: Date },
) {
  const now = opts.now ?? new Date();
  const contentExpiresAt = new Date(now.getTime() + opts.retentionDays * 86_400_000);
  return batch.tweets.map((t) => ({
    userId,
    xTweetId: t.xTweetId,
    source: "ARCHIVE" as const,
    createdAt: t.createdAt,
    hashtags: t.hashtags,
    mentions: t.mentions,
    inReplyToId: t.inReplyToId,
    quotedId: t.quotedId,
    textEnc: new Uint8Array(encrypt(t.text, opts.encryptionKey)),
    contentExpiresAt,
  }));
}
