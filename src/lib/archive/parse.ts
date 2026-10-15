/**
 * Parser for the `tweets.js` file in an X data archive.
 *
 * The file is not plain JSON. It is a JavaScript assignment:
 *   window.YTD.tweets.part0 = [ { "tweet": { ... } }, ... ]
 * Large archives are split across tweets.js, tweets-part1.js, ...
 *
 * This module is pure (no I/O, no Node APIs) so it runs in the browser: the
 * raw file never has to be uploaded to our server.
 */

export type ParsedTweet = {
  xTweetId: string;
  createdAt: Date;
  text: string;
  hashtags: string[]; // lowercase, without '#'
  mentions: string[]; // lowercase, without '@'
  inReplyToId: string | null;
  quotedId: string | null;
  isRetweet: boolean;
};

export type ParseResult = {
  tweets: ParsedTweet[];
  /** Entries that could not be read, with a reason. Never throws per-entry. */
  skipped: { index: number; reason: string }[];
};

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

// "Wed Oct 10 20:19:24 +0000 2018"
const DATE_RE =
  /^[A-Za-z]{3} ([A-Za-z]{3}) (\d{1,2}) (\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2}) (\d{4})$/;

/** Parses X's legacy date format explicitly rather than trusting Date.parse. */
export function parseXDate(value: string): Date | null {
  const m = DATE_RE.exec(value.trim());
  if (!m) return null;
  const month = MONTHS[m[1]];
  if (month === undefined) return null;
  const offsetMin =
    (m[6] === "-" ? -1 : 1) * (Number(m[7]) * 60 + Number(m[8]));
  const ms =
    Date.UTC(Number(m[9]), month, Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])) -
    offsetMin * 60_000;
  return new Date(ms);
}

const STATUS_URL_RE = /(?:twitter|x)\.com\/[^/\s]+\/status\/(\d+)/i;

type RawTweet = {
  id_str?: unknown;
  created_at?: unknown;
  full_text?: unknown;
  text?: unknown;
  in_reply_to_status_id_str?: unknown;
  quoted_status_id_str?: unknown;
  is_quote_status?: unknown;
  entities?: {
    hashtags?: { text?: unknown }[];
    user_mentions?: { screen_name?: unknown }[];
    urls?: { expanded_url?: unknown }[];
  };
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function quotedIdOf(raw: RawTweet): string | null {
  const direct = str(raw.quoted_status_id_str);
  if (direct) return direct;
  if (raw.is_quote_status !== true && raw.is_quote_status !== "true") return null;
  // Archives often omit quoted_status_id_str; the quoted tweet's URL is in entities.
  for (const u of raw.entities?.urls ?? []) {
    const url = str(u.expanded_url);
    const id = url ? STATUS_URL_RE.exec(url)?.[1] : undefined;
    if (id) return id;
  }
  return null;
}

function toParsed(raw: RawTweet): ParsedTweet | string {
  const id = str(raw.id_str);
  if (!id) return "missing id_str";
  const dateStr = str(raw.created_at);
  const createdAt = dateStr ? parseXDate(dateStr) : null;
  if (!createdAt) return "missing or unreadable created_at";
  const text = str(raw.full_text) ?? str(raw.text);
  if (text === null) return "missing text";

  const uniq = (xs: (string | null)[]) => [
    ...new Set(xs.filter((x): x is string => x !== null).map((x) => x.toLowerCase())),
  ];

  return {
    xTweetId: id,
    createdAt,
    text,
    hashtags: uniq((raw.entities?.hashtags ?? []).map((h) => str(h.text))),
    mentions: uniq((raw.entities?.user_mentions ?? []).map((u) => str(u.screen_name))),
    inReplyToId: str(raw.in_reply_to_status_id_str),
    quotedId: quotedIdOf(raw),
    isRetweet: text.startsWith("RT @"),
  };
}

/** Strips the `window.YTD.tweets.partN =` prefix and returns the JSON array text. */
function extractJsonArray(source: string): string {
  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");
  if (start === -1 || end < start) {
    throw new Error("This doesn't look like a tweets.js file (no tweet list found).");
  }
  return source.slice(start, end + 1);
}

export function parseTweetsJs(source: string): ParseResult {
  let entries: unknown;
  try {
    entries = JSON.parse(extractJsonArray(source));
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error("tweets.js could not be read: the file appears to be corrupted.");
    }
    throw e;
  }
  if (!Array.isArray(entries)) throw new Error("tweets.js does not contain a list of tweets.");

  const tweets: ParsedTweet[] = [];
  const skipped: ParseResult["skipped"] = [];
  entries.forEach((entry, index) => {
    const raw = (entry as { tweet?: RawTweet } | null)?.tweet;
    if (!raw || typeof raw !== "object") {
      skipped.push({ index, reason: "entry has no tweet object" });
      return;
    }
    const parsed = toParsed(raw);
    if (typeof parsed === "string") skipped.push({ index, reason: parsed });
    else tweets.push(parsed);
  });
  return { tweets, skipped };
}

/** Combines results from several files (tweets.js, tweets-part1.js, ...), de-duplicating by id. */
export function mergeResults(results: ParseResult[]): ParseResult {
  const byId = new Map<string, ParsedTweet>();
  const skipped: ParseResult["skipped"] = [];
  for (const r of results) {
    skipped.push(...r.skipped);
    for (const t of r.tweets) byId.set(t.xTweetId, t);
  }
  const tweets = [...byId.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return { tweets, skipped };
}
