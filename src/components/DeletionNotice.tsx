export function DeletionNotice({ className = "" }: { className?: string }) {
  return (
    <p
      role="note"
      className={`rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200 ${className}`}
    >
      <strong>Deleting a post does not erase it from the internet.</strong> Copies
      may still exist in web archives, screenshots, search caches and other
      people&apos;s data exports.
    </p>
  );
}
