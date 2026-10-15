"use client";

import { useCallback, useState } from "react";
import {
  mergeResults,
  parseTweetsJs,
  type ParseResult,
} from "@/lib/archive/parse";
import { importableTweets, summarize } from "@/lib/archive/summary";

type FileError = { name: string; message: string };

const dateFmt = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });
const fmt = (d: Date | null) => (d ? dateFmt.format(d) : "n/a");

const BATCH_SIZE = 500;

export function ArchiveImporter({ canSave }: { canSave: boolean }) {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [errors, setErrors] = useState<FileError[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [save, setSave] = useState<
    | { state: "idle" }
    | { state: "saving"; done: number; total: number }
    | { state: "done"; total: number }
    | { state: "error"; message: string; done: number; total: number }
  >({ state: "idle" });

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setBusy(true);
    const parsed: ParseResult[] = [];
    const failed: FileError[] = [];
    for (const file of Array.from(files)) {
      try {
        parsed.push(parseTweetsJs(await file.text()));
      } catch (e) {
        failed.push({
          name: file.name,
          message: e instanceof Error ? e.message : "Could not read this file.",
        });
      }
    }
    setErrors(failed);
    setResult(parsed.length ? mergeResults(parsed) : null);
    setBusy(false);
  }, []);

  const saveTweets = useCallback(async () => {
    if (!result) return;
    const tweets = importableTweets(result.tweets);
    setSave({ state: "saving", done: 0, total: tweets.length });
    for (let i = 0; i < tweets.length; i += BATCH_SIZE) {
      const batch = tweets.slice(i, i + BATCH_SIZE).map((t) => ({
        xTweetId: t.xTweetId,
        createdAt: t.createdAt.toISOString(),
        text: t.text,
        hashtags: t.hashtags,
        mentions: t.mentions,
        inReplyToId: t.inReplyToId,
        quotedId: t.quotedId,
      }));
      try {
        const res = await fetch("/api/ingest/archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tweets: batch }),
        });
        if (!res.ok) {
          const message =
            res.status === 401
              ? "Your session expired. Connect X again, then retry."
              : "Something went wrong while saving. You can retry safely: already-saved posts are skipped.";
          setSave({ state: "error", message, done: i, total: tweets.length });
          return;
        }
      } catch {
        setSave({ state: "error", message: "Network error. You can retry safely.", done: i, total: tweets.length });
        return;
      }
      setSave({ state: "saving", done: Math.min(i + BATCH_SIZE, tweets.length), total: tweets.length });
    }
    setSave({ state: "done", total: tweets.length });
  }, [result]);

  const summary = result ? summarize(result.tweets) : null;
  const preview = result ? importableTweets(result.tweets).slice(-8).reverse() : [];

  return (
    <div className="space-y-6">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging
            ? "border-foreground bg-black/5 dark:bg-white/10"
            : "border-black/20 hover:border-foreground dark:border-white/25"
        }`}
      >
        <span className="font-medium">
          {busy ? "Reading…" : "Drop tweets.js here, or click to choose"}
        </span>
        <span className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Large archives are split into several files (tweets.js, tweets-part1.js…). Select them all.
        </span>
        <input
          type="file"
          accept=".js,application/javascript,text/javascript"
          multiple
          className="sr-only"
          onChange={(e) => e.target.files && void handleFiles(e.target.files)}
        />
      </label>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Your file is read in this browser tab. Nothing is uploaded at this stage.
      </p>

      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {errors.map((er) => (
            <li key={er.name}>
              <strong>{er.name}:</strong> {er.message}
            </li>
          ))}
        </ul>
      )}

      {summary && result && (
        <section aria-labelledby="summary-heading" className="space-y-5">
          <h2 id="summary-heading" className="text-lg font-semibold">
            What we found
          </h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Your posts", summary.importable],
              ["Replies", summary.replies],
              ["Quote posts", summary.quotes],
              ["Retweets (skipped)", summary.retweets],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-black/10 p-3 dark:border-white/15">
                <dt className="text-xs text-zinc-500">{label}</dt>
                <dd className="text-2xl font-semibold">{Number(value).toLocaleString()}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm">
            Dates: {fmt(summary.firstDate)} to {fmt(summary.lastDate)}
          </p>
          {(summary.topHashtags.length > 0 || summary.topMentions.length > 0) && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {summary.topHashtags.length > 0 &&
                `Top hashtags: ${summary.topHashtags.map((h) => `#${h.tag} (${h.count})`).join(", ")}. `}
              {summary.topMentions.length > 0 &&
                `Most mentioned: ${summary.topMentions.map((m) => `@${m.handle} (${m.count})`).join(", ")}.`}
            </p>
          )}
          {result.skipped.length > 0 && (
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {result.skipped.length} entries could not be read and were left out.
            </p>
          )}

          <div>
            <h3 className="mb-2 text-sm font-medium">Preview (most recent first)</h3>
            <ul className="divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/15 dark:border-white/15">
              {preview.map((t) => (
                <li key={t.xTweetId} className="px-3 py-2 text-sm">
                  <span className="mr-2 text-xs text-zinc-500">{fmt(t.createdAt)}</span>
                  {t.text.length > 180 ? `${t.text.slice(0, 180)}…` : t.text}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <button
              type="button"
              disabled={!canSave || save.state === "saving" || save.state === "done"}
              onClick={() => void saveTweets()}
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-40"
            >
              {save.state === "saving"
                ? `Saving… ${save.done.toLocaleString()} / ${save.total.toLocaleString()}`
                : `Import ${summary.importable.toLocaleString()} posts`}
            </button>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
              {!canSave && "Connect your X account above to save these posts."}
              {canSave && save.state === "idle" &&
                "Post text is stored encrypted and removed automatically after the retention period."}
              {save.state === "done" && `Saved ${save.total.toLocaleString()} posts.`}
              {save.state === "error" && save.message}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
