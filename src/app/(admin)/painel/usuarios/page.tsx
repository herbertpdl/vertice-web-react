import type { Metadata } from "next";
import { userFiltersFromParams } from "@/lib/admin/users";
import { UsersContent } from "./UsersContent";

export const metadata: Metadata = { title: "Usuários — Painel Vertice" };

/** The user directory (admin-panel spec §7; frames `ETgH1`, `i6hSFx`, `BVZe4`, `fXng6`). */
export default async function AdminUsersPage({ searchParams }: PageProps<"/painel/usuarios">) {
  return <UsersContent initialFilters={userFiltersFromParams(await searchParams)} />;
}
