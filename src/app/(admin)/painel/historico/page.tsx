import type { Metadata } from "next";
import { historyFiltersFromParams } from "@/lib/admin/history";
import { HistoryContent } from "./HistoryContent";

export const metadata: Metadata = { title: "Histórico — Painel Vertice" };

/** The admin action history (admin-panel spec §7; frames `TExWT`, `ZCKW9`). */
export default async function AdminHistoryPage({ searchParams }: PageProps<"/painel/historico">) {
  return <HistoryContent initialFilters={historyFiltersFromParams(await searchParams)} />;
}
