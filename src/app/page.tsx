import Link from "next/link";
import { DeletionNotice } from "@/components/DeletionNotice";
import { Header } from "@/components/Header";

const steps = [
  ["Import", "Upload your X data archive, or connect your account for recent posts."],
  ["Find", "Filter by keyword, mention, hashtag or date, or describe a topic and let search find related posts."],
  ["Review", "Every match shows why it was flagged. You approve or skip each one."],
  ["Delete", "Preview with a dry run, download a backup, then delete at a safe pace."],
];

export default function Home() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-16">
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight">
          Clean up old posts, with you in control.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          tweetsweep helps you find posts that could come back to hurt you.
          Nothing is ever deleted on AI judgment alone: you review every match.
        </p>
        <Link
          href="/import"
          className="mt-8 inline-block rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90"
        >
          Get started
        </Link>
        <ol className="mt-14 grid gap-4 sm:grid-cols-2">
          {steps.map(([title, body], i) => (
            <li key={title} className="rounded-lg border border-black/10 p-4 dark:border-white/15">
              <span className="text-xs text-zinc-500">Step {i + 1}</span>
              <h2 className="font-medium">{title}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
            </li>
          ))}
        </ol>
        <DeletionNotice className="mt-10" />
      </main>
    </>
  );
}
