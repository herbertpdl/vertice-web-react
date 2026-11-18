import type { Metadata } from "next";
import { headers } from "next/headers";
import { AuthScreenShell } from "@/components/layout/AuthScreenShell";
import { adminOrigin } from "@/lib/host";
import { SetPasswordForm } from "./SetPasswordForm";

// The URL carries a live setup token: don't leak it in a Referer header.
export const metadata: Metadata = { title: "Definir senha — Vertice", referrer: "no-referrer" };

// First access for a client created by their trainer: the trainer shares
// `/definir-senha?token=<token>`. Public (no session), see src/proxy.ts.
export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthScreenShell
      lines={["DEFINA.", "ENTRE.", "EVOLUA."]}
      footerText="Seu treinador criou sua conta. Escolha uma senha para acessar seus treinos."
    >
      <SetPasswordForm
        token={typeof token === "string" ? token : ""}
        adminLoginUrl={adminLoginUrl(await headers())}
      />
    </AuthScreenShell>
  );
}

/** The admin sign-in on the admin host, for an admin's first access (admin-panel spec §2). */
function adminLoginUrl(requestHeaders: Headers): string | undefined {
  const origin = adminOrigin(requestHeaders);
  return origin ? `${origin}/painel/entrar` : undefined;
}
