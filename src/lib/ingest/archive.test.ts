import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decrypt } from "@/lib/crypto";
import { archiveBatchSchema, MAX_BATCH, toTweetRows } from "./archive";

const tweet = {
  xTweetId: "1001",
  createdAt: "2018-10-10T20:19:24.000Z",
  text: "Wetin dey happen",
  hashtags: ["lagos"],
  mentions: [],
  inReplyToId: null,
  quotedId: "555",
};
const key = randomBytes(32).toString("base64");

describe("archiveBatchSchema", () => {
  it("accepts a valid batch and parses dates", () => {
    const r = archiveBatchSchema.parse({ tweets: [tweet] });
    expect(r.tweets[0].createdAt).toBeInstanceOf(Date);
  });
  it("rejects empty, oversized and malformed batches", () => {
    expect(archiveBatchSchema.safeParse({ tweets: [] }).success).toBe(false);
    expect(
      archiveBatchSchema.safeParse({ tweets: Array(MAX_BATCH + 1).fill(tweet) }).success,
    ).toBe(false);
    expect(archiveBatchSchema.safeParse({ tweets: [{ ...tweet, xTweetId: "abc" }] }).success).toBe(false);
    expect(archiveBatchSchema.safeParse({ tweets: [{ ...tweet, createdAt: "nope" }] }).success).toBe(false);
  });
});

describe("toTweetRows", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const [row] = toTweetRows("u1", archiveBatchSchema.parse({ tweets: [tweet] }), {
    encryptionKey: key,
    retentionDays: 30,
    now,
  });
  it("encrypts the text and sets the expiry", () => {
    expect(decrypt(row.textEnc, key)).toBe("Wetin dey happen");
    expect(row.contentExpiresAt.toISOString()).toBe("2026-01-31T00:00:00.000Z");
  });
  it("tags the owner and source", () => {
    expect(row.userId).toBe("u1");
    expect(row.source).toBe("ARCHIVE");
    expect(row).not.toHaveProperty("text");
  });
});
