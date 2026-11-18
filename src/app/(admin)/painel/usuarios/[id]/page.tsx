import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UserProfileContent } from "./UserProfileContent";

export const metadata: Metadata = { title: "Perfil — Painel Vertice" };

/** A trainer's or client's read-only profile (admin-panel spec §7, W16; frames `M3SiW`, `eUOyS`). */
export default async function AdminUserProfilePage({ params }: PageProps<"/painel/usuarios/[id]">) {
  const { id } = await params;
  // Only a positive integer id reaches the BFF (and so writes a history entry).
  if (!/^[1-9]\d{0,15}$/.test(id)) notFound();
  return <UserProfileContent userId={Number(id)} />;
}
