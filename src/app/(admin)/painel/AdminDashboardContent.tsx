"use client";

import { Activity, CircleAlert, CircleCheck, UserCheck, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button, DataTableMessage, MetricCard, SkeletonLine } from "@/components/ui";
import { MostUsedExercises } from "@/components/domain/MostUsedExercises";
import { WeeklySignupsChart } from "@/components/domain/WeeklySignupsChart";
import { adminKeys, fetchAdminDashboard } from "@/lib/api/admin";
import type { AdminDashboard } from "@/lib/api/types";
import { formatCount, formatTimeOfDay } from "@/lib/format";

/** One column of a split card: "7 dias", the number, and up to two detail lines. */
function SplitColumn({ label, value, details = [] }: { label: string; value: number; details?: string[] }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
      <span className="text-[11px] text-[color:var(--color-text-tertiary)]">{label}</span>
      <span className="font-heading text-[24px] font-bold text-[color:var(--color-text-primary)]">
        {formatCount(value)}
      </span>
      {details.map((detail) => (
        <span key={detail} className="text-[11px] text-[color:var(--color-text-secondary)]">
          {detail}
        </span>
      ))}
    </div>
  );
}

function activeDetails(trainers: number, clients: number) {
  return [`${formatCount(trainers)} treinadores`, `${formatCount(clients)} alunos`];
}

/** The phone's small card (`qzCk9`): label, number and one line under it. */
function CompactMetric({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[4px] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[14px]">
      <span className="text-[11px] text-[color:var(--color-text-secondary)]">{label}</span>
      <span className="font-heading text-[22px] font-bold text-[color:var(--color-text-primary)]">
        {formatCount(value)}
      </span>
      {detail && <span className="text-[10px] text-[color:var(--color-text-tertiary)]">{detail}</span>}
    </div>
  );
}

function CompactMetricSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[8px] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[14px]">
      <SkeletonLine width={70} height={10} />
      <SkeletonLine width={60} height={20} />
      <SkeletonLine width={90} height={8} />
    </div>
  );
}

function DesktopMetrics({ data }: { data: AdminDashboard | undefined }) {
  const loading = data === undefined;
  return (
    <div className="hidden w-full grid-cols-2 gap-[var(--space-4)] md:grid xl:grid-cols-4">
      <MetricCard
        className="w-full!"
        label="Treinadores"
        icon={UserCheck}
        value={data ? formatCount(data.totals.trainers) : ""}
        loading={loading}
      />
      <MetricCard
        className="w-full!"
        label="Alunos"
        icon={Users}
        value={data ? formatCount(data.totals.clients) : ""}
        loading={loading}
      />
      <MetricCard className="w-full!" label="Usuários ativos" icon={Activity} loading={loading}>
        {data && (
          <div className="flex w-full gap-[16px]">
            <SplitColumn
              label="7 dias"
              value={data.active.trainers7d + data.active.clients7d}
              details={activeDetails(data.active.trainers7d, data.active.clients7d)}
            />
            <SplitColumn
              label="30 dias"
              value={data.active.trainers30d + data.active.clients30d}
              details={activeDetails(data.active.trainers30d, data.active.clients30d)}
            />
          </div>
        )}
      </MetricCard>
      <MetricCard className="w-full!" label="Treinos concluídos" icon={CircleCheck} loading={loading}>
        {data && (
          <div className="flex w-full gap-[16px]">
            <SplitColumn label="7 dias" value={data.completedWorkouts.last7d} />
            <SplitColumn label="30 dias" value={data.completedWorkouts.last30d} />
          </div>
        )}
      </MetricCard>
    </div>
  );
}

function PhoneMetrics({ data }: { data: AdminDashboard | undefined }) {
  if (!data) {
    return (
      <div className="grid w-full grid-cols-2 gap-[12px] md:hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <CompactMetricSkeleton key={i} />
        ))}
      </div>
    );
  }
  const { totals, active, completedWorkouts } = data;
  return (
    <div className="grid w-full grid-cols-2 gap-[12px] md:hidden">
      <CompactMetric label="Treinadores" value={totals.trainers} />
      <CompactMetric label="Alunos" value={totals.clients} />
      <CompactMetric
        label="Ativos · 7 dias"
        value={active.trainers7d + active.clients7d}
        detail={activeDetails(active.trainers7d, active.clients7d).join(" · ")}
      />
      <CompactMetric
        label="Ativos · 30 dias"
        value={active.trainers30d + active.clients30d}
        detail={activeDetails(active.trainers30d, active.clients30d).join(" · ")}
      />
      <CompactMetric label="Treinos · 7 dias" value={completedWorkouts.last7d} detail="concluídos" />
      <CompactMetric label="Treinos · 30 dias" value={completedWorkouts.last30d} detail="concluídos" />
    </div>
  );
}

/**
 * The admin dashboard (admin-panel spec §7; pen.dev `En3Ju`, loading `rNMsp`, phone `qzCk9`):
 * totals, active users over 7 and 30 days, completed workouts and the weekly sign-ups chart, from
 * one `GET /admin/dashboard`, and the most-used exercises table below (its own query,
 * `MostUsedExercises`). The frame's "+6 nos últimos 7 dias" deltas are left out: the contract has
 * no such field (§7.1).
 */
export function AdminDashboardContent() {
  const { data, isError, isPending, dataUpdatedAt, refetch, isRefetching } = useQuery({
    queryKey: adminKeys.dashboard(),
    queryFn: fetchAdminDashboard,
  });

  const updatedAt = data ? formatTimeOfDay(new Date(dataUpdatedAt).toISOString()) : null;

  return (
    <main className="font-base flex w-full flex-col gap-[16px] p-[16px] md:gap-[var(--space-6)] md:p-[var(--space-8)]">
      <div className="flex flex-col gap-[2px] md:gap-[4px]">
        <h1 className="font-heading text-[length:var(--text-xl)] font-bold text-[color:var(--color-text-primary)] md:text-[length:var(--text-2xl)]">
          Dashboard
        </h1>
        <p className="text-[12px] text-[color:var(--color-text-secondary)] md:text-[length:var(--text-base)]">
          <span className="hidden md:inline">Visão geral da plataforma</span>
          {updatedAt && (
            <>
              <span className="hidden md:inline"> · atualizado às {updatedAt}</span>
              <span className="md:hidden">Atualizado às {updatedAt}</span>
            </>
          )}
        </p>
      </div>

      {isError && !data ? (
        <div className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <DataTableMessage
            role="alert"
            icon={CircleAlert}
            title="Não foi possível carregar o dashboard"
            description="Verifique sua conexão e tente novamente."
            action={
              <Button variant="outline" disabled={isRefetching} onClick={() => void refetch()}>
                Tentar novamente
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <DesktopMetrics data={data} />
          <PhoneMetrics data={data} />
          <WeeklySignupsChart weeks={data?.weeklySignups} loading={isPending} />
          <MostUsedExercises />
        </>
      )}
    </main>
  );
}
