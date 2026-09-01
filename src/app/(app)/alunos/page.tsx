import { Suspense } from "react";
import type { Metadata } from "next";
import { AlunosContent } from "./AlunosContent";

export const metadata: Metadata = { title: "Alunos — Vertice" };

export default function AlunosPage() {
  return (
    <Suspense>
      <AlunosContent />
    </Suspense>
  );
}
