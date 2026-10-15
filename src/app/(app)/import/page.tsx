import { Suspense } from "react";
import { ArchiveImporter } from "@/components/ArchiveImporter";
import { getSession } from "@/lib/session";

export const metadata = { title: "Import" };

const ERRORS: Record<string, string> = {
  denied: "You declined access on X. Connect again when you're ready.",
  invalid_state: "That login attempt expired or didn't start here. Please try again.",
  missing_code: "X didn't return a login code. Please try again.",
  login_failed: "We couldn't complete the login with X. Please try again.",
};

// Session and search params are request-time data, so this part streams in
// behind Suspense while the page intro is prerendered.
async function ImportBody({
  searchParams,
}: {
  searchParams: PageProps<"/import">["searchParams"];
}) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;

  return (
    <>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </p>
      )}

      {!session && (
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
          <p className="text-sm">
            Connect your X account to save imported posts. We ask for permission to read your
            posts and, later, to delete the ones you approve.
          </p>
          <a
            href="/api/auth/x/login"
            className="mt-3 inline-block rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90"
          >
            Connect X
          </a>
        </div>
      )}

      <ArchiveImporter canSave={Boolean(session)} />
    </>
  );
}

export default function ImportPage({ searchParams }: PageProps<"/import">) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import your posts</h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
          The X API only returns your most recent ~3,200 posts. For your full
          history, request your archive in X under{" "}
          <em>Settings → Your account → Download an archive of your data</em>,
          unzip it, and upload <code className="font-mono text-sm">data/tweets.js</code>.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <ImportBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
