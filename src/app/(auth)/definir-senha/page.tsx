import type { Metadata } from "next";
import { AuthScreenShell } from "@/components/layout/AuthScreenShell";
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
      <SetPasswordForm token={typeof token === "string" ? token : ""} />
    </AuthScreenShell>
  );
}
