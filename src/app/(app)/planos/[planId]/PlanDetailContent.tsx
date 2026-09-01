"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui";
import { PlanDialog } from "@/components/domain/PlanDialog";
import { fetchTrainingPlan } from "@/lib/api/trainingPlans";
import { formatDateRange } from "@/lib/format";
import { planLevelLabels } from "@/lib/validation/trainingPlans";
import { DAY_ORDER, DAY_NAMES, DAY_ABBR } from "@/lib/days";
import { useRedirectOnError } from "@/lib/hooks/useRedirectOnError";

function planStatus(startDate: string, endDate: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (today < startDate) return "Agendado";
  if (today > endDate) return "Concluído";
  return "Ativo";
}

export function PlanDetailContent({ planId }: { planId: number }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const { data, isPending, error } = useQuery({
    queryKey: ["trainingPlan", planId],
    queryFn: () => fetchTrainingPlan(planId),
  });
  useRedirectOnError(error, "/alunos");

  if (isPending || !data) {
    return (
      <div className="flex w-full flex-col gap-[var(--space-6)] px-[var(--space-8)] py-[var(--space-8)]">
        <div className="skeleton-shimmer h-[120px] w-full rounded-[var(--radius-lg)]" />
        <div className="skeleton-shimmer h-[400px] w-full rounded-[var(--radius-lg)]" />
      </div>
    );
  }

  const status = planStatus(data.startDate, data.endDate);
  const workoutsByDay = new Map<string, typeof data.workouts>();
  for (const workout of data.workouts) {
    workoutsByDay.set(workout.dayOfWeek, [
      ...(workoutsByDay.get(workout.dayOfWeek) ?? []),
      workout,
    ]);
  }

  return (
    <div className="flex w-full flex-col gap-[var(--space-8)] px-[var(--space-8)] py-[var(--space-8)]">
      <Link
        href={`/alunos/${data.clientId}`}
        className="flex w-fit items-center gap-1 text-[length:var(--text-sm)] font-semibold text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]"
      >
        <ChevronLeft width={16} height={16} />
        Aluno
      </Link>

      <div className="flex w-full flex-col gap-[var(--space-5)]">
        <div className="flex w-full items-center justify-between gap-[var(--space-6)]">
          <div className="flex flex-col gap-[6px]">
            <div className="flex items-center gap-[var(--space-3)]">
              <h1 className="font-heading text-[length:var(--text-2xl)] font-bold text-[color:var(--color-text-primary)]">
                {data.name}
              </h1>
              <span className="rounded-[var(--radius-full)] bg-[#00e5ff26] px-[10px] py-[4px] text-[11px] font-semibold text-[color:var(--color-primary)]">
                {status}
              </span>
            </div>
            {data.description && (
              <p className="text-[length:var(--text-base)] text-[color:var(--color-text-secondary)]">
                {data.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-[var(--space-3)]">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Editar plano
            </Button>
            <Button onClick={() => router.push(`/planos/${planId}/treinos/novo`)}>
              Novo treino
            </Button>
          </div>
        </div>

        <div className="flex w-full gap-[var(--space-8)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-6)] py-[var(--space-4)]">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-[0.8px] text-[color:var(--color-text-tertiary)]">
              PERÍODO
            </span>
            <span className="text-[length:var(--text-base)] text-[color:var(--color-text-primary)]">
              {formatDateRange(data.startDate, data.endDate)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-[0.8px] text-[color:var(--color-text-tertiary)]">
              NÍVEL
            </span>
            <span className="text-[length:var(--text-base)] text-[color:var(--color-text-primary)]">
              {planLevelLabels[data.level]}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-[0.8px] text-[color:var(--color-text-tertiary)]">
              TREINOS
            </span>
            <span className="text-[length:var(--text-base)] text-[color:var(--color-text-primary)]">
              {data.workouts.length} treino{data.workouts.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-[var(--space-3)]">
        {DAY_ORDER.map((day) => {
          const workouts = workoutsByDay.get(day) ?? [];
          return (
            <div key={day} className="flex w-full items-center gap-[var(--space-4)]">
              <div className="flex w-[118px] shrink-0 items-center gap-[var(--space-3)]">
                <span
                  className={`h-2 w-2 rounded-full ${
                    workouts.length > 0
                      ? "bg-[var(--color-primary)]"
                      : "bg-[var(--color-border-strong)]"
                  }`}
                />
                <div className="flex flex-col gap-[2px]">
                  <span
                    className={`text-[length:var(--text-md)] font-semibold ${
                      workouts.length > 0
                        ? "text-[color:var(--color-text-primary)]"
                        : "text-[color:var(--color-text-tertiary)]"
                    }`}
                  >
                    {DAY_NAMES[day]}
                  </span>
                  <span className="text-[10px] font-semibold tracking-[1px] text-[color:var(--color-text-tertiary)]">
                    {DAY_ABBR[day]}
                  </span>
                </div>
              </div>

              {workouts.length > 0 ? (
                <div className="flex w-full flex-1 flex-col gap-[var(--space-3)]">
                  {workouts.map((workout) => (
                    <Link
                      key={workout.id}
                      href={`/planos/${planId}/treinos/${workout.id}`}
                      className="flex w-full items-center gap-[var(--space-5)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-5)] py-[var(--space-4)] transition-colors hover:border-[var(--color-border-strong)]"
                    >
                      <span className="flex-1 text-[length:var(--text-base)] font-semibold text-[color:var(--color-text-primary)]">
                        {workout.name}
                      </span>
                      <span className="flex items-center gap-1 text-[length:var(--text-sm)] font-semibold text-[color:var(--color-primary)]">
                        Abrir editor
                        <ChevronRight width={16} height={16} />
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  href={`/planos/${planId}/treinos/novo?dayOfWeek=${day}`}
                  className="flex w-full flex-1 items-center gap-[var(--space-3)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[#141a2280] px-[var(--space-5)] py-[var(--space-4)] transition-colors hover:border-[var(--color-border-strong)]"
                >
                  <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[var(--color-surface-hover)]">
                    <Plus width={14} height={14} className="text-[color:var(--color-primary)]" />
                  </div>
                  <span className="text-[length:var(--text-base)] font-semibold text-[color:var(--color-primary)]">
                    Adicionar treino
                  </span>
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {editOpen && (
        <PlanDialog clientId={data.clientId} plan={data} onClose={() => setEditOpen(false)} />
      )}
    </div>
  );
}
