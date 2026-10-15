import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          tweetsweep
        </Link>
        <nav className="flex gap-5 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/import" className="hover:text-foreground">
            Import
          </Link>
        </nav>
      </div>
    </header>
  );
}
