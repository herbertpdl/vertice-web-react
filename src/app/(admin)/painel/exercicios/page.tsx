import type { Metadata } from "next";
import { catalogViewFromParams } from "@/lib/admin/catalog";
import { ExercisesContent } from "./ExercisesContent";

export const metadata: Metadata = { title: "Exercícios — Painel Vertice" };

/** Exercise curation (admin-panel spec §7; frames `c53jx`, `LWZZa`, `iiou2`, `D2koD`, `Ef6Bz`, `a5D2r`, `I6NIe`). */
export default async function AdminExercisesPage({ searchParams }: PageProps<"/painel/exercicios">) {
  return <ExercisesContent initialView={catalogViewFromParams(await searchParams)} />;
}
