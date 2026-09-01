"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ListRowSkeleton } from "@/components/ui";
import { fetchFeedback } from "@/lib/api/feedback";
import { formatRelativeTime } from "@/lib/format";

export function FeedbackTab({ clientId }: { clientId: number }) {
  const { data, isPending } = useQuery({
    queryKey: ["feedback"],
    queryFn: fetchFeedback,
  });

  const clientFeedback = useMemo(
    () => (data ?? []).filter((item) => item.clientId === clientId),
    [data, clientId],
  );

  if (isPending) {
    return (
      <div className="flex flex-col gap-[var(--space-3)]">
        {[0, 1, 2].map((i) => (
          <ListRowSkeleton key={i} className="w-full" />
        ))}
      </div>
    );
  }

  if (clientFeedback.length === 0) {
    return (
      <div className="flex w-full flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-5)] py-[var(--space-12)] text-center">
        <p className="text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
          Nenhum feedback ainda
        </p>
        <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
          Os feedbacks enviados pelo aluno após os treinos aparecem aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      {clientFeedback.map((item) => (
        <div
          key={item.id}
          className="flex w-full flex-col gap-[var(--space-2)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-5)]"
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-[length:var(--text-base)] font-semibold text-[color:var(--color-text-primary)]">
              {item.workoutName}
            </span>
            <span className="text-[length:var(--text-xs)] text-[color:var(--color-text-tertiary)]">
              {formatRelativeTime(item.createdAt)}
            </span>
          </div>
          <p className="text-[length:var(--text-base)] leading-[1.5] text-[color:var(--color-text-secondary)]">
            &ldquo;{item.text}&rdquo;
          </p>
          <span className="w-fit rounded-[var(--radius-full)] bg-[var(--color-surface-active)] px-[10px] py-[4px] text-[length:var(--text-xs)] font-semibold text-[color:var(--color-text-secondary)]">
            {item.trainingPlanName}
          </span>
        </div>
      ))}
    </div>
  );
}
