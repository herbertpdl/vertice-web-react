import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthScreenShell } from "@/components/layout/AuthScreenShell";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar — Vertice" };

export default function LoginPage() {
  return (
    <AuthScreenShell
      lines={["TREINE.", "ACOMPANHE.", "EVOLUA."]}
      footerText="A plataforma completa para personal trainers organizarem alunos, planos e progresso — sem depender de planilhas."
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthScreenShell>
  );
}
