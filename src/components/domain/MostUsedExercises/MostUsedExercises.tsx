"use client";

import { useState } from "react";
import { CircleAlert, Dumbbell } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  DataTable,
  DataTableMessage,
  Dropdown,
  Pagination,
  type DataTableColumn,
} from "@/components/ui";
import { AdminExerciseDialog } from "../AdminExerciseDialog";
import { PromoteExerciseButton } from "../PromoteExerciseButton";
import {
  muscleGroupFilterOptions,
  muscleGroupNames,
  mostUsedRank,
  privateTagLabel,
  workoutCountLabel,
} from "@/lib/admin/catalog";
import { adminKeys } from "@/lib/api/admin";
import { fetchAdminMostUsed, type AdminMostUsedFilters } from "@/lib/api/adminCatalog";
import { MUSCLE_GROUPS_STALE_TIME, fetchMuscleGroups } from "@/lib/api/muscleGroups";
import type { AdminCatalogExercise, AdminMostUsedExercise } from "@/lib/api/types";
import { PAGE_SIZES, rowRange } from "@/lib/cursorPages";
import { formatCount } from "@/lib/format";
import { useCursorPages } from "@/lib/hooks/useCursorPages";

type RankedRow = AdminMostUsedExercise & { rank: number };

function PrivateTag({ exercise }: { exercise: AdminCatalogExercise }) {
  const label = privateTagLabel(exercise);
  return label ? <Badge variant="warning">{label}</Badge> : null;
}

function columns(promote: (exercise: AdminCatalogExercise) => void): DataTableColumn<RankedRow>[] {
  return [
    {
      key: "rank",
      header: "#",
      width: 32,
      cell: (row) => <span className="text-[13px] font-bold text-[color:var(--color-text-secondary)]">{row.rank}</span>,
    },
    {
      key: "name",
      header: "Exercício",
      minWidth: 160,
      cell: (row) => (
        <span className="truncate text-[13px] font-semibold text-[color:var(--color-text-primary)]">
          {row.exercise.name}
        </span>
      ),
    },
    {
      key: "groups",
      header: "Grupos musculares",
      width: 180,
      cell: (row) => (
        <span className="truncate text-[12px] text-[color:var(--color-text-secondary)]">
          {muscleGroupNames(row.exercise)}
        </span>
      ),
    },
    {
      key: "count",
      header: "Treinos",
      width: 72,
      cell: (row) => (
        <span className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">
          {formatCount(row.workoutCount)}
        </span>
      ),
    },
    {
      key: "private",
      header: "",
      width: 260,
      cell: (row) =>
        row.exercise.owner ? (
          <span className="flex min-w-0 items-center gap-[10px]">
            <PrivateTag exercise={row.exercise} />
            <PromoteExerciseButton
              exerciseName={row.exercise.name}
              label="Promover"
              onClick={() => promote(row.exercise)}
            />
          </span>
        ) : null,
    },
  ];
}

function mobileRow(promote: (exercise: AdminCatalogExercise) => void) {
  return function MobileRow(row: RankedRow) {
    return (
      <div className="flex w-full items-start gap-[12px] px-[14px] py-[12px]">
        <span className="text-[13px] font-bold text-[color:var(--color-text-secondary)]">{row.rank}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-[4px]">
          <span className="truncate text-[13px] font-semibold text-[color:var(--color-text-primary)]">
            {row.exercise.name}
          </span>
          <span className="text-[11px] text-[color:var(--color-text-secondary)]">
            {muscleGroupNames(row.exercise)} · {workoutCountLabel(row.workoutCount)}
          </span>
          {row.exercise.owner && (
            <span className="flex flex-wrap items-center gap-[8px] pt-[4px]">
              <PrivateTag exercise={row.exercise} />
              <PromoteExerciseButton
                exerciseName={row.exercise.name}
                label="Promover"
                variant="link"
                onClick={() => promote(row.exercise)}
              />
            </span>
          )}
        </span>
      </div>
    );
  };
}

/**
 * The dashboard's "Exercícios mais usados" (pen.dev `QdD67` in `En3Ju`, loading `rNMsp`, phone
 * `qzCk9`; PRD R23–R26): exercises by how many workouts contain them, filtered by muscle group,
 * paged by cursor (10 per page, as the frame shows). A trainer's private exercise is tagged
 * "Privado · <treinador>" and can be promoted from the row (the same prefilled dialog as the
 * catalog). The frame's "de 148" total is left out (cursor paging has no totals, §7.1).
 */
export function MostUsedExercises() {
  const [muscleGroupId, setMuscleGroupId] = useState<number | undefined>(undefined);
  const [promoting, setPromoting] = useState<AdminCatalogExercise | null>(null);
  const filters: AdminMostUsedFilters = muscleGroupId ? { muscleGroupId } : {};
  const pages = useCursorPages(JSON.stringify(filters), 10);

  const groups = useQuery({
    queryKey: adminKeys.muscleGroups(),
    queryFn: fetchMuscleGroups,
    staleTime: MUSCLE_GROUPS_STALE_TIME,
  });

  const page = { limit: pages.pageSize, cursor: pages.cursor };
  const { data, isPending, isError, isPlaceholderData, isFetching, refetch } = useQuery({
    queryKey: adminKeys.mostUsedPage(filters, page),
    queryFn: () => fetchAdminMostUsed(filters, page),
    placeholderData: keepPreviousData,
  });

  const rows = data?.exercises.map((row, index) => ({
    ...row,
    rank: mostUsedRank(pages.pageIndex, pages.pageSize, index),
  }));
  const range = rows ? rowRange(pages.pageIndex, pages.pageSize, rows.length) : null;

  return (
    <>
      <DataTable
        label="Exercícios mais usados"
        header={
          <div className="flex flex-col gap-[10px] p-[14px] md:flex-row md:items-end md:justify-between md:px-[var(--space-5)] md:py-[16px]">
            <div className="flex flex-col gap-[2px]">
              <h2 className="text-[length:var(--text-base)] font-semibold text-[color:var(--color-text-primary)] md:text-[length:var(--text-md)]">
                Exercícios mais usados
              </h2>
              <p className="hidden text-[12px] text-[color:var(--color-text-tertiary)] md:block">
                Quantidade de treinos que contêm cada exercício
              </p>
            </div>
            <Dropdown
              label="Grupo muscular"
              className="w-full md:w-[220px] max-md:[&>label]:sr-only"
              options={muscleGroupFilterOptions(groups.data)}
              value={muscleGroupId ? String(muscleGroupId) : ""}
              onChange={(value) => setMuscleGroupId(value ? Number(value) : undefined)}
            />
          </div>
        }
        columns={columns(setPromoting)}
        rows={rows}
        rowKey={(row) => row.exercise.id}
        loading={isPending}
        loadingRows={5}
        mobileRow={mobileRow(setPromoting)}
        error={
          isError && !data ? (
            <DataTableMessage
              role="alert"
              icon={CircleAlert}
              title="Não foi possível carregar os exercícios mais usados"
              description="Verifique sua conexão e tente novamente."
              action={
                <Button variant="outline" onClick={() => void refetch()}>
                  Tentar novamente
                </Button>
              }
            />
          ) : undefined
        }
        empty={
          <DataTableMessage
            icon={Dumbbell}
            title={muscleGroupId ? "Nenhum exercício deste grupo está em treinos" : "Nenhum exercício está em treinos ainda"}
            action={
              muscleGroupId ? (
                <Button variant="outline" onClick={() => setMuscleGroupId(undefined)}>
                  Limpar filtro
                </Button>
              ) : undefined
            }
          />
        }
        footer={
          rows && rows.length > 0 ? (
            <Pagination
              pageSize={pages.pageSize}
              pageSizes={PAGE_SIZES}
              onPageSizeChange={pages.setPageSize}
              range={range}
              hasPrev={pages.hasPrev}
              hasNext={data?.nextCursor != null}
              onPrev={pages.prev}
              onNext={() => pages.next(data?.nextCursor ?? null)}
              busy={isPlaceholderData || (isFetching && isPending)}
            />
          ) : undefined
        }
      />
      {promoting && <AdminExerciseDialog mode="promote" exercise={promoting} onClose={() => setPromoting(null)} />}
    </>
  );
}
