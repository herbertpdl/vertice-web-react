import { AppHeader } from "@/components/layout/AppHeader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--color-bg)]">
      <AppHeader />
      <main className="flex w-full flex-1 flex-col">{children}</main>
    </div>
  );
}
