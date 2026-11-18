import type { Metadata } from "next";
import { AdminAuthShell } from "@/components/layout/AdminAuthShell";
import { serverEnv } from "@/lib/env.server";
import { AdminLoginContent } from "./AdminLoginContent";

export const metadata: Metadata = { title: "Entrar — Painel Vertice" };

/**
 * The admin sign-in (admin-panel spec W7, §4). Served only on the admin host (`src/proxy.ts`), and
 * rendered with or without a session cookie, so a stale cookie can't loop.
 */
export default async function AdminSignInPage({ searchParams }: PageProps<"/painel/entrar">) {
  const params = await searchParams;
  const motivo = typeof params.motivo === "string" ? params.motivo : null;
  const redirect = typeof params.redirect === "string" ? params.redirect : null;
  return (
    <AdminAuthShell host={serverEnv().adminHost}>
      <AdminLoginContent expired={motivo === "expirou"} redirect={redirect} />
    </AdminAuthShell>
  );
}
