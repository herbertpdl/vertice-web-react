import { Suspense } from "react";
import { NovoTreinoContent } from "./NovoTreinoContent";

export default async function NovoTreinoPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  return (
    <Suspense>
      <NovoTreinoContent planId={Number(planId)} />
    </Suspense>
  );
}
