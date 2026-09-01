"use client";

import { useSearchParams } from "next/navigation";
import { WorkoutEditor } from "@/components/domain/WorkoutEditor";
import type { DayOfWeek } from "@/lib/api/types";
import { DAY_ORDER } from "@/lib/days";

export function NovoTreinoContent({ planId }: { planId: number }) {
  const searchParams = useSearchParams();
  const dayParam = searchParams.get("dayOfWeek");
  const initialDayOfWeek = DAY_ORDER.includes(dayParam as DayOfWeek)
    ? (dayParam as DayOfWeek)
    : undefined;

  return <WorkoutEditor planId={planId} initialDayOfWeek={initialDayOfWeek} />;
}
