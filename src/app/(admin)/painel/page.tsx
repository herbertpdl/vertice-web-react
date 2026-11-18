import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard — Painel Vertice" };

/** The admin dashboard. Its metrics and chart arrive in VRT-26. */
export default function AdminDashboardPage() {
  return (
    <main className="font-base flex w-full flex-col gap-[4px] p-[var(--space-8)]">
      <h1 className="font-heading text-[length:var(--text-2xl)] font-bold text-[color:var(--color-text-primary)]">
        Dashboard
      </h1>
    </main>
  );
}
