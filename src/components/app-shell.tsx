import Link from "next/link";
import { Container, Pill } from "@/components/ui";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <Container className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              S
            </span>
            Split
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Pill tone="info">Secure pay</Pill>
            <Link href="/mock-pay" className="hidden text-slate-600 hover:text-slate-900 sm:inline">
              Test payment
            </Link>
          </div>
        </Container>
      </header>
      <main className="flex-1">
        <Container className="py-8 sm:py-10">{children}</Container>
      </main>
      <footer className="border-t border-slate-200/70 bg-white mt-auto">
        <Container className="flex flex-col items-center justify-between gap-2 py-6 text-xs text-slate-500 sm:flex-row">
          <span>Split by table. Pay in seconds.</span>
          <span>Need help? Ask your server.</span>
        </Container>
      </footer>
    </div>
  );
}
