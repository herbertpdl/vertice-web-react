"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/ui";
import { Avatar } from "@/components/domain/Avatar";
import { fetchStudentOverview } from "@/lib/api/students";
import { fetchFeedback } from "@/lib/api/feedback";
import { planLevelLabels } from "@/lib/validation/trainingPlans";
import { formatRelativeTime, daysUntil } from "@/lib/format";
import { useRedirectOnError } from "@/lib/hooks/useRedirectOnError";
import { PlansTab } from "./PlansTab";
import { FeedbackTab } from "./FeedbackTab";
import { ProgressTab } from "./ProgressTab";

type Tab = "plans" | "feedback" | "progress";

export function StudentDetailContent({ studentId }: { studentId: number }) {
  const [tab, setTab] = useState<Tab>("plans");

  const { data, isPending, error } = useQuery({
    queryKey: ["student", studentId, "overview"],
    queryFn: () => fetchStudentOverview(studentId),
  });
  useRedirectOnError(error, "/alunos");

  const { data: feedback } = useQuery({
    queryKey: ["feedback"],
    queryFn: fetchFeedback,
  });
  const feedbackCount = (feedback ?? []).filter((f) => f.clientId === studentId).length;

  if (isPending || !data) {
    return (
      <div className="flex w-full flex-col gap-[var(--space-6)] px-[var(--space-8)] py-[var(--space-8)]">
        <div className="skeleton-shimmer h-[80px] w-full rounded-[var(--radius-lg)]" />
        <div className="flex w-full gap-[var(--space-4)]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[110px] flex-1 rounded-[var(--radius-lg)] skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const { student, activePlan, thisWeek, lastWorkoutAt, adherence4Weeks } = data;
  const daysUntilPlanEnd = activePlan ? daysUntil(activePlan.endDate) : null;

  return (
    <div className="flex w-full flex-col gap-[var(--space-8)] px-[var(--space-8)] py-[var(--space-8)]">
      <Link
        href="/alunos"
        className="flex w-fit items-center gap-1 text-[length:var(--text-sm)] font-semibold text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]"
      >
        <ChevronLeft width={16} height={16} />
        Alunos
      </Link>

      <div className="flex w-full items-center justify-between gap-[var(--space-6)]">
        <div className="flex items-center gap-[var(--space-4)]">
          <Avatar name={student.name} size={56} />
          <div className="flex flex-col gap-[4px]">
            <h1 className="font-heading text-[length:var(--text-2xl)] font-bold text-[color:var(--color-text-primary)]">
              {student.name}
            </h1>
            <div className="flex items-center gap-2 text-[length:var(--text-sm)] text-[color:var(--color-text-secondary)]">
              <span>{student.email}</span>
              <span className="text-[color:var(--color-text-tertiary)]">·</span>
              <span>{student.cpf}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full gap-[var(--space-4)]">
        <MetricCard
          className="flex-1"
          label="Plano ativo"
          value={activePlan?.name ?? "Sem plano"}
          delta={
            activePlan && daysUntilPlanEnd !== null
              ? `Termina em ${daysUntilPlanEnd} dias`
              : undefined
          }
          trend="neutral"
        />
        <MetricCard
          className="flex-1"
          label="Semana atual"
          value={activePlan ? `${thisWeek.completed} / ${thisWeek.total}` : "—"}
          delta={activePlan ? planLevelLabels[activePlan.level] : undefined}
          trend="neutral"
        />
        <MetricCard
          className="flex-1"
          label="Último treino"
          value={lastWorkoutAt ? formatRelativeTime(lastWorkoutAt) : "—"}
          trend="neutral"
        />
        <MetricCard
          className="flex-1"
          label="Adesão (4 semanas)"
          value={adherence4Weeks !== null ? `${adherence4Weeks}%` : "—"}
          trend={adherence4Weeks !== null && adherence4Weeks >= 70 ? "up" : "down"}
        />
      </div>

      <div className="flex w-full items-center gap-[var(--space-6)] border-b border-[var(--color-border)]">
        {(
          [
            ["plans", "Planos de treino"],
            ["feedback", `Feedbacks${feedbackCount ? ` (${feedbackCount})` : ""}`],
            ["progress", "Progresso de carga"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`border-b-2 px-[2px] pb-[var(--space-3)] text-[length:var(--text-base)] font-semibold transition-colors ${
              tab === key
                ? "border-[var(--color-primary)] text-[color:var(--color-primary)]"
                : "border-transparent text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "plans" && <PlansTab clientId={studentId} />}
      {tab === "feedback" && <FeedbackTab clientId={studentId} />}
      {tab === "progress" && <ProgressTab clientId={studentId} />}
    </div>
  );
}
