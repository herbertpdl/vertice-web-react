import type { Metadata } from "next";
import { AuthScreenShell } from "@/components/layout/AuthScreenShell";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Criar conta — Vertice" };

export default function RegisterPage() {
  return (
    <AuthScreenShell
      lines={["CRIE.", "PLANEJE.", "CRESÇA."]}
      footerText="Comece a estruturar treinos profissionais e acompanhar cada aluno em minutos."
    >
      <RegisterForm />
    </AuthScreenShell>
  );
}
