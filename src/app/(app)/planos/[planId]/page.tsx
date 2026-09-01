import { PlanDetailContent } from "./PlanDetailContent";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  return <PlanDetailContent planId={Number(planId)} />;
}
