import type { Metadata } from "next";
import { normalizeSearch } from "@/lib/admin/users";
import { FeatureFlagsContent } from "./FeatureFlagsContent";

export const metadata: Metadata = { title: "Feature flags — Painel Vertice" };

/** The feature flags (feature-flags spec §6.1; frames `ufeI3`, `tw3jw`, `A3vAb`, `pGJVX`, `vBk8U`, `q1Y3N`, `Xp9eO`). */
export default async function AdminFeatureFlagsPage({ searchParams }: PageProps<"/painel/flags">) {
  const { q } = await searchParams;
  return <FeatureFlagsContent initialQuery={normalizeSearch((Array.isArray(q) ? q[0] : q) ?? "")} />;
}
