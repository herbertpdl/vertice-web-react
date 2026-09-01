"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ListRowSkeleton, Button } from "@/components/ui";
import { PlanDialog } from "@/components/domain/PlanDialog";
import { fetchTrainingPlans } from "@/lib/api/trainingPlans";
import { fetchWorkouts } from "@/lib/api/workouts";
import { formatDateRange } from "@/lib/format";
import { planLevelLabels } from "@/lib/validation/trainingPlans";

function planStatus(startDate: string, endDate: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (today < startDate) return { label: "Agendado", tone: "text-[color:var(--color-text-secondary)] bg-[var(--color-surface-hover)]" };
  if (today > endDate) return { label: "Concluído", tone: "text-[color:var(--color-text-tertiary)] bg-[var(--color-surface-hover)]" };
  return { label: "Ativo", tone: "text-[color:var(--color-primary)] bg-[#00e5ff26]" };
}

export function PlansTab({ clientId }: { clientId: number }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: plans, isPending } = useQuery({
    queryKey: ["trainingPlans", { clientId }],
    queryFn: () => fetchTrainingPlans(clientId),
  });

  const workoutCounts = useQueries({
    queries: (plans ?? []).map((plan) => ({
      queryKey: ["workouts", plan.id],
      queryFn: () => fetchWorkouts(plan.id),
      enabled: Boolean(plans),
    })),
  });

  return (
    <div className="flex w-full flex-col gap-[var(--space-4)]">
      <div className="flex w-full justify-end">
        <Button onClick={() => setDialogOpen(true)}>Novo plano</Button>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-[var(--space-3)]">
          {[0, 1].map((i) => (
            <ListRowSkeleton key={i} className="w-full" />
          ))}
        </div>
      ) : !plans || plans.length === 0 ? (
        <div className="flex w-full flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-5)] py-[var(--space-12)] text-center">
          <p className="text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
            Nenhum plano ainda
          </p>
          <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
            Crie o primeiro plano de treino para este aluno.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[var(--space-4)]">
          {plans.map((plan, i) => {
            const status = planStatus(plan.startDate, plan.endDate);
            const workoutCount = workoutCounts[i]?.data?.length;
            return (
              <Link
                key={plan.id}
                href={`/planos/${plan.id}`}
                className="flex w-full items-center gap-[var(--space-6)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-5)] transition-colors hover:border-[var(--color-border-strong)]"
              >
                <div className="flex flex-1 flex-col gap-[6px]">
                  <div className="flex items-center gap-[var(--space-3)]">
                    <span className="font-heading text-[length:var(--text-lg)] font-semibold text-[color:var(--color-text-primary)]">
                      {plan.name}
                    </span>
                    <span className="rounded-[var(--radius-full)] bg-[var(--color-surface-hover)] px-[10px] py-[4px] text-[11px] font-semibold text-[color:var(--color-text-secondary)]">
                      {planLevelLabels[plan.level]}
                    </span>
                  </div>
                  {plan.description && (
                    <span className="text-[length:var(--text-sm)] text-[color:var(--color-text-secondary)]">
                      {plan.description}
                    </span>
                  )}
                </div>
                <div className="flex w-[200px] flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-[0.8px] text-[color:var(--color-text-tertiary)]">
                    PERÍODO
                  </span>
                  <span className="text-[length:var(--text-base)] text-[color:var(--color-text-primary)]">
                    {formatDateRange(plan.startDate, plan.endDate)}
                  </span>
                </div>
                <div className="flex w-[110px] flex-col gap-1">
                  <span className="text-[11px] font-semibold tracking-[0.8px] text-[color:var(--color-text-tertiary)]">
                    TREINOS
                  </span>
                  <span className="text-[length:var(--text-base)] text-[color:var(--color-text-primary)]">
                    {workoutCount !== undefined ? `${workoutCount}` : "—"}
                  </span>
                </div>
                <span
                  className={`rounded-[var(--radius-full)] px-[10px] py-[4px] text-[11px] font-semibold ${status.tone}`}
                >
                  {status.label}
                </span>
                <ChevronRight width={20} height={20} className="text-[color:var(--color-text-tertiary)]" />
              </Link>
            );
          })}
        </div>
      )}

      {dialogOpen && (
        <PlanDialog clientId={clientId} onClose={() => setDialogOpen(false)} />
      )}
    </div>
  );
}
