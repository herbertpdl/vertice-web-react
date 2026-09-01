"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button, TableRowSkeleton, TextField } from "@/components/ui";
import { Avatar } from "@/components/domain/Avatar";
import { WeeklyActivityDots } from "@/components/domain/WeeklyActivityDots";
import { NewStudentDialog } from "@/components/domain/NewStudentDialog";
import { fetchStudents } from "@/lib/api/students";
import { formatRelativeTime } from "@/lib/format";

type Filter = "all" | "active" | "none";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "active", label: "Com plano ativo" },
  { key: "none", label: "Sem plano" },
];

const COLUMN_WIDTHS = {
  student: 280,
  plan: 220,
  lastWorkout: 140,
  adherence: 160,
  link: 80,
};

export function AlunosContent() {
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(searchParams.get("new") === "true");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const { data, isPending } = useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data
      .filter((student) => {
        if (filter === "active") return student.currentPlan !== null;
        if (filter === "none") return student.currentPlan === null;
        return true;
      })
      .filter((student) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          student.name.toLowerCase().includes(q) ||
          student.email.toLowerCase().includes(q)
        );
      });
  }, [data, filter, search]);

  return (
    <div className="flex w-full flex-col gap-[var(--space-6)] px-[var(--space-8)] py-[var(--space-8)]">
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col gap-[6px]">
          <h1 className="font-heading text-[length:var(--text-2xl)] font-bold text-[color:var(--color-text-primary)]">
            Alunos
          </h1>
          <p className="text-[length:var(--text-base)] text-[color:var(--color-text-secondary)]">
            {data ? `${data.length} alunos cadastrados` : " "}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>Novo aluno</Button>
      </div>

      <div className="flex w-full items-center justify-between">
        <div className="relative w-[340px]">
          <Search
            width={15}
            height={15}
            className="pointer-events-none absolute top-1/2 left-[14px] -translate-y-1/2 text-[color:var(--color-text-tertiary)]"
          />
          <TextField
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="[&_input]:pl-[22px]"
          />
        </div>
        <div className="flex items-center gap-[2px] rounded-[var(--radius-md)] bg-[var(--color-surface)] p-[3px]">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded-[var(--radius-sm)] px-[14px] py-[7px] text-[length:var(--text-sm)] font-semibold transition-colors ${
                filter === item.key
                  ? "bg-[var(--color-surface-hover)] text-[color:var(--color-text-primary)]"
                  : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex w-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex w-full items-center gap-[var(--space-4)] px-[var(--space-5)] py-[var(--space-3)]">
          <span
            style={{ width: COLUMN_WIDTHS.student }}
            className="text-[10px] font-semibold tracking-[0.6px] text-[color:var(--color-text-tertiary)]"
          >
            ALUNO
          </span>
          <span
            style={{ width: COLUMN_WIDTHS.plan }}
            className="text-[10px] font-semibold tracking-[0.6px] text-[color:var(--color-text-tertiary)]"
          >
            PLANO
          </span>
          <span
            style={{ width: COLUMN_WIDTHS.lastWorkout }}
            className="text-[10px] font-semibold tracking-[0.6px] text-[color:var(--color-text-tertiary)]"
          >
            ÚLTIMO TREINO
          </span>
          <span
            style={{ width: COLUMN_WIDTHS.adherence }}
            className="text-[10px] font-semibold tracking-[0.6px] text-[color:var(--color-text-tertiary)]"
          >
            ATIVIDADE DA SEMANA
          </span>
          <span style={{ width: COLUMN_WIDTHS.link }} />
        </div>

        {isPending ? (
          <div className="flex flex-col">
            {[0, 1, 2, 3, 4].map((i) => (
              <TableRowSkeleton key={i} className="border-t border-[var(--color-border)]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex w-full flex-col items-center gap-2 border-t border-[var(--color-border)] px-[var(--space-5)] py-[var(--space-12)] text-center">
            <p className="text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
              Nenhum aluno encontrado
            </p>
            <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
              Ajuste sua busca ou filtro para ver outros alunos.
            </p>
          </div>
        ) : (
          filtered.map((student) => (
            <Link
              key={student.id}
              href={`/alunos/${student.id}`}
              className="flex w-full items-center gap-[var(--space-4)] border-t border-[var(--color-border)] px-[var(--space-5)] py-[var(--space-4)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <div style={{ width: COLUMN_WIDTHS.student }} className="flex items-center gap-[10px]">
                <Avatar name={student.name} />
                <div className="flex flex-col gap-[1px]">
                  <span className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">
                    {student.name}
                  </span>
                  <span className="text-[11px] text-[color:var(--color-text-tertiary)]">
                    {student.email}
                  </span>
                </div>
              </div>
              <div style={{ width: COLUMN_WIDTHS.plan }} className="flex flex-col gap-[1px]">
                {student.currentPlan ? (
                  <>
                    <span className="text-[12px] font-semibold text-[color:var(--color-text-primary)]">
                      {student.currentPlan.name}
                    </span>
                    <span className="text-[11px] text-[color:var(--color-text-tertiary)]">
                      até {new Date(student.currentPlan.endDate).toLocaleDateString("pt-BR")}
                    </span>
                  </>
                ) : (
                  <span className="w-fit rounded-[var(--radius-full)] bg-[var(--color-surface-active)] px-[10px] py-[3px] text-[11px] font-semibold text-[color:var(--color-text-tertiary)]">
                    Sem plano
                  </span>
                )}
              </div>
              <span
                style={{ width: COLUMN_WIDTHS.lastWorkout }}
                className="text-[12px] text-[color:var(--color-text-secondary)]"
              >
                {student.lastWorkoutAt ? formatRelativeTime(student.lastWorkoutAt) : "—"}
              </span>
              <div style={{ width: COLUMN_WIDTHS.adherence }}>
                <WeeklyActivityDots days={student.weekActivity} />
              </div>
              <div
                style={{ width: COLUMN_WIDTHS.link }}
                className="flex items-center justify-end gap-1 text-[12px] font-semibold text-[color:var(--color-primary)]"
              >
                Ver perfil
                <ChevronRight width={13} height={13} />
              </div>
            </Link>
          ))
        )}
      </div>

      {dialogOpen && <NewStudentDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}
