import type { ParsedTweet } from "./parse";

export type ArchiveSummary = {
  total: number;
  /** Tweets we would import: everything except retweets. */
  importable: number;
  retweets: number;
  replies: number;
  quotes: number;
  firstDate: Date | null;
  lastDate: Date | null;
  topHashtags: { tag: string; count: number }[];
  topMentions: { handle: string; count: number }[];
};

function top(counts: Map<string, number>, n: number) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n);
}

/** Retweets are not the user's own words, so they are excluded from import. */
export function importableTweets(tweets: ParsedTweet[]): ParsedTweet[] {
  return tweets.filter((t) => !t.isRetweet);
}

export function summarize(tweets: ParsedTweet[]): ArchiveSummary {
  const own = importableTweets(tweets);
  const hashtags = new Map<string, number>();
  const mentions = new Map<string, number>();
  let first: Date | null = null;
  let last: Date | null = null;

  for (const t of own) {
    for (const h of t.hashtags) hashtags.set(h, (hashtags.get(h) ?? 0) + 1);
    for (const m of t.mentions) mentions.set(m, (mentions.get(m) ?? 0) + 1);
    if (!first || t.createdAt < first) first = t.createdAt;
    if (!last || t.createdAt > last) last = t.createdAt;
  }

  return {
    total: tweets.length,
    importable: own.length,
    retweets: tweets.length - own.length,
    replies: own.filter((t) => t.inReplyToId).length,
    quotes: own.filter((t) => t.quotedId).length,
    firstDate: first,
    lastDate: last,
    topHashtags: top(hashtags, 5).map(([tag, count]) => ({ tag, count })),
    topMentions: top(mentions, 5).map(([handle, count]) => ({ handle, count })),
  };
}
