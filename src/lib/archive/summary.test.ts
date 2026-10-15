import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseTweetsJs } from "./parse";
import { importableTweets, summarize } from "./summary";

const { tweets } = parseTweetsJs(
  readFileSync(join(__dirname, "../../../tests/fixtures/tweets.sample.js"), "utf8"),
);

describe("summarize", () => {
  const s = summarize(tweets);
  it("counts and excludes retweets", () => {
    expect(s.total).toBe(3);
    expect(s.retweets).toBe(1);
    expect(s.importable).toBe(2);
    expect(importableTweets(tweets).map((t) => t.xTweetId)).toEqual(["1001", "1002"]);
  });
  it("counts replies and quotes", () => {
    expect(s.replies).toBe(1);
    expect(s.quotes).toBe(1);
  });
  it("finds the date range and top tags", () => {
    expect(s.firstDate?.toISOString()).toBe("2018-10-10T20:19:24.000Z");
    expect(s.lastDate?.toISOString()).toBe("2021-03-06T08:00:00.000Z");
    expect(s.topHashtags).toEqual([{ tag: "lagos", count: 1 }]);
    expect(s.topMentions).toEqual([{ handle: "davido", count: 1 }]);
  });
  it("handles an empty archive", () => {
    const e = summarize([]);
    expect(e.importable).toBe(0);
    expect(e.firstDate).toBeNull();
  });
});
