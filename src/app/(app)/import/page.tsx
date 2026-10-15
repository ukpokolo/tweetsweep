import { ArchiveImporter } from "@/components/ArchiveImporter";

export const metadata = { title: "Import" };

export default function ImportPage() {
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
      <ArchiveImporter />
    </div>
  );
}
