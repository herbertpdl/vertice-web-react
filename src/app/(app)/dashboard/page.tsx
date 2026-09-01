"use client";

import Link from "next/link";
import { ChevronRight, CircleCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button, ListRowSkeleton, MetricCard } from "@/components/ui";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { fetchDashboard } from "@/lib/api/dashboard";
import { formatRelativeTime, daysLeftLabel } from "@/lib/format";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-[var(--space-2)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-6)] py-[var(--space-5)]">
      <div className="flex w-full items-center justify-between pb-[var(--space-3)]">
        <h2 className="font-heading text-[length:var(--text-lg)] font-semibold text-[color:var(--color-text-primary)]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-[var(--color-border)]" />;
}

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data, isPending } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="flex w-full flex-col gap-[var(--space-8)] px-[var(--space-8)] py-[var(--space-8)]">
      <div className="flex w-full items-center justify-between gap-[var(--space-6)]">
        <div className="flex flex-col gap-[6px]">
          <h1 className="font-heading text-[length:var(--text-3xl)] font-bold text-[color:var(--color-text-primary)]">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          {data && (
            <p className="text-[length:var(--text-md)] text-[color:var(--color-text-secondary)]">
              Você tem {data.stats.recentFeedbackCount} feedbacks novos e{" "}
              {data.stats.expiringPlansCount} planos terminando esta semana.
            </p>
          )}
        </div>
        <div className="flex items-center gap-[var(--space-3)]">
          <Link href="/alunos?new=true">
            <Button variant="outline">Novo aluno</Button>
          </Link>
          <Link href="/alunos">
            <Button>Novo treino</Button>
          </Link>
        </div>
      </div>

      <div className="flex w-full gap-[var(--space-4)]">
        <MetricCard
          className="flex-1"
          label="Alunos ativos"
          value={String(data?.stats.activeClients ?? "")}
          trend="up"
          loading={isPending}
        />
        <MetricCard
          className="flex-1"
          label="Planos ativos"
          value={String(data?.stats.activePlans ?? "")}
          trend="neutral"
          loading={isPending}
        />
        <MetricCard
          className="flex-1"
          label="Feedbacks novos"
          value={String(data?.stats.recentFeedbackCount ?? "")}
          trend="neutral"
          loading={isPending}
        />
        <MetricCard
          className="flex-1"
          label="Planos vencendo"
          value={String(data?.stats.expiringPlansCount ?? "")}
          trend="down"
          loading={isPending}
        />
      </div>

      <div className="flex w-full items-start gap-[var(--space-6)]">
        <div className="flex-1">
          <SectionCard title="Feedbacks recentes">
            {isPending ? (
              <div className="flex flex-col">
                {[0, 1, 2].map((i) => (
                  <ListRowSkeleton key={i} className="w-full" />
                ))}
              </div>
            ) : data && data.recentFeedback.length > 0 ? (
              <div className="flex flex-col">
                {data.recentFeedback.map((item, i) => (
                  <div key={item.id}>
                    {i > 0 && <Divider />}
                    <div className="flex w-full flex-col gap-[var(--space-2)] py-[var(--space-4)]">
                      <div className="flex w-full items-center justify-between gap-[var(--space-3)]">
                        <div className="flex items-center gap-2">
                          <span className="text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
                            {item.clientName}
                          </span>
                          <span className="text-[length:var(--text-md)] text-[color:var(--color-text-tertiary)]">
                            ·
                          </span>
                          <span className="text-[length:var(--text-base)] text-[color:var(--color-text-secondary)]">
                            {item.workoutName}
                          </span>
                        </div>
                        <span className="text-[length:var(--text-xs)] text-[color:var(--color-text-tertiary)]">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-[length:var(--text-base)] leading-[1.5] text-[color:var(--color-text-secondary)]">
                        &ldquo;{item.text}&rdquo;
                      </p>
                      <div className="flex w-full items-center justify-between">
                        <span className="rounded-[var(--radius-full)] bg-[var(--color-surface-active)] px-[10px] py-[4px] text-[length:var(--text-xs)] font-semibold text-[color:var(--color-text-secondary)]">
                          {item.trainingPlanName}
                        </span>
                        <Link
                          href={`/alunos/${item.clientId}`}
                          className="flex items-center gap-1 text-[length:var(--text-sm)] font-semibold text-[color:var(--color-primary)]"
                        >
                          Ver aluno
                          <ChevronRight width={14} height={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-[var(--space-4)] text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
                Nenhum feedback recente.
              </p>
            )}
          </SectionCard>
        </div>

        <div className="flex w-[460px] shrink-0 flex-col gap-[var(--space-6)]">
          <SectionCard title="Planos perto do fim">
            {isPending ? (
              <ListRowSkeleton className="w-full" />
            ) : data && data.expiringPlans.length > 0 ? (
              <div className="flex flex-col">
                {data.expiringPlans.map((plan, i) => (
                  <div key={`${plan.student}-${plan.name}-${i}`}>
                    {i > 0 && <Divider />}
                    <div className="flex w-full items-center justify-between gap-[var(--space-3)] py-[var(--space-3)]">
                      <div className="flex flex-col gap-[2px]">
                        <span className="text-[length:var(--text-base)] font-semibold text-[color:var(--color-text-primary)]">
                          {plan.student}
                        </span>
                        <span className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
                          {plan.name} · termina{" "}
                          {new Date(plan.end).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <span className="rounded-[var(--radius-full)] bg-[var(--color-surface-active)] px-[10px] py-[4px] text-[length:var(--text-xs)] font-semibold text-[color:var(--color-warning)]">
                        {daysLeftLabel(plan.daysLeft)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-[var(--space-3)] text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
                Nenhum plano vencendo em breve.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Treinos concluídos hoje">
            {isPending ? (
              <ListRowSkeleton className="w-full" />
            ) : data && data.completedToday.length > 0 ? (
              <div className="flex flex-col">
                {data.completedToday.map((item, i) => (
                  <div key={`${item.student}-${item.workout}-${i}`}>
                    {i > 0 && <Divider />}
                    <div className="flex w-full items-center justify-between gap-[var(--space-3)] py-[var(--space-3)]">
                      <div className="flex items-center gap-[var(--space-3)]">
                        <CircleCheck
                          width={18}
                          height={18}
                          className="text-[color:var(--color-success)]"
                        />
                        <div className="flex flex-col gap-[2px]">
                          <span className="text-[length:var(--text-base)] font-semibold text-[color:var(--color-text-primary)]">
                            {item.student}
                          </span>
                          <span className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
                            {item.workout}
                          </span>
                        </div>
                      </div>
                      <span className="font-heading text-[length:var(--text-base)] font-semibold text-[color:var(--color-text-secondary)]">
                        {item.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-[var(--space-3)] text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
                Nenhum treino concluído ainda hoje.
              </p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
