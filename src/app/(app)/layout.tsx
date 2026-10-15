import { DeletionNotice } from "@/components/DeletionNotice";
import { Header } from "@/components/Header";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
      <footer className="mx-auto w-full max-w-4xl px-4 pb-8">
        <DeletionNotice />
      </footer>
    </>
  );
}
