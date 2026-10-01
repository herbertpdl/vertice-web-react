import { Suspense } from "react";
import type { Metadata } from "next";
import { ExerciciosContent } from "./ExerciciosContent";

export const metadata: Metadata = { title: "Exercícios — Vertice" };

export default function ExerciciosPage() {
  return (
    <Suspense>
      <ExerciciosContent />
    </Suspense>
  );
}
