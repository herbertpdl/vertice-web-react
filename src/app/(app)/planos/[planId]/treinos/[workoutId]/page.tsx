import { WorkoutEditor } from "@/components/domain/WorkoutEditor";

export default async function TreinoPage({
  params,
}: {
  params: Promise<{ planId: string; workoutId: string }>;
}) {
  const { planId, workoutId } = await params;
  return <WorkoutEditor planId={Number(planId)} workoutId={Number(workoutId)} />;
}
