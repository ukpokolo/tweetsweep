import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mergeResults, parseTweetsJs, parseXDate } from "./parse";

const sample = readFileSync(join(__dirname, "../../../tests/fixtures/tweets.sample.js"), "utf8");

describe("parseXDate", () => {
  it("parses UTC dates", () => {
    expect(parseXDate("Wed Oct 10 20:19:24 +0000 2018")?.toISOString()).toBe("2018-10-10T20:19:24.000Z");
  });
  it("applies timezone offsets", () => {
    expect(parseXDate("Sat Mar 06 09:00:00 +0100 2021")?.toISOString()).toBe("2021-03-06T08:00:00.000Z");
  });
  it("returns null for garbage", () => {
    expect(parseXDate("yesterday")).toBeNull();
  });
});

describe("parseTweetsJs", () => {
  const { tweets, skipped } = parseTweetsJs(sample);
  const byId = Object.fromEntries(tweets.map((t) => [t.xTweetId, t]));

  it("reads valid tweets and reports unreadable ones", () => {
    expect(tweets.map((t) => t.xTweetId)).toEqual(["1001", "1002", "1003"]);
    expect(skipped).toHaveLength(2);
  });
  it("extracts hashtags, mentions (lowercased) and reply parent", () => {
    expect(byId["1001"].hashtags).toEqual(["lagos"]);
    expect(byId["1001"].mentions).toEqual(["davido"]);
    expect(byId["1001"].inReplyToId).toBe("999");
  });
  it("finds the quoted tweet id from the URL when the archive omits it", () => {
    expect(byId["1002"].quotedId).toBe("555");
  });
  it("flags retweets and de-duplicates hashtags", () => {
    expect(byId["1003"].isRetweet).toBe(true);
    expect(byId["1003"].hashtags).toEqual(["a"]);
  });
  it("rejects files that are not tweets.js", () => {
    expect(() => parseTweetsJs("hello")).toThrow(/doesn't look like/);
    expect(() => parseTweetsJs("window.YTD.tweets.part0 = [ {oops ]")).toThrow(/corrupted/);
  });
});

describe("mergeResults", () => {
  it("merges parts, de-duplicates by id and sorts by date", () => {
    const a = parseTweetsJs(sample);
    const merged = mergeResults([a, a]);
    expect(merged.tweets.map((t) => t.xTweetId)).toEqual(["1003", "1001", "1002"]);
  });
});
