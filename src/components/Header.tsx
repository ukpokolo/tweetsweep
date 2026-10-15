import Link from "next/link";
import { Suspense } from "react";
import { getSession } from "@/lib/session";

// Reading the session is request-time work, so it streams in behind Suspense
// while the rest of the header is prerendered.
async function UserMenu() {
  const session = await getSession();
  if (!session) return null;
  return (
    <form action="/api/auth/x/logout" method="post" className="flex items-center gap-3">
      <span>@{session.handle}</span>
      <button type="submit" className="underline hover:text-foreground">
        Sign out
      </button>
    </form>
  );
}

export function Header() {
  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          tweetsweep
        </Link>
        <nav className="flex items-center gap-5 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/import" className="hover:text-foreground">
            Import
          </Link>
          <Suspense fallback={null}>
            <UserMenu />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
