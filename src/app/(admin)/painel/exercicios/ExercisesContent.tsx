"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Dumbbell, Pencil, Plus, SearchX, Trash2, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  DataTable,
  DataTableMessage,
  Dropdown,
  Pagination,
  TextField,
  useToast,
  type DataTableColumn,
} from "@/components/ui";
import { AdminExerciseDialog } from "@/components/domain/AdminExerciseDialog";
import { ConfirmDialog } from "@/components/domain/ConfirmDialog";
import { MuscleGroupsDialog } from "@/components/domain/MuscleGroupsDialog";
import { PromoteExerciseButton } from "@/components/domain/PromoteExerciseButton";
import {
  DELETE_FAILED_MESSAGE,
  catalogFilters,
  catalogTabLabels,
  catalogTabSubtitles,
  catalogViewToSearch,
  deleteOutcome,
  inUseDetail,
  invalidateAfterExerciseWrite,
  muscleGroupFilterOptions,
  type CatalogTab,
  type CatalogView,
} from "@/lib/admin/catalog";
import { normalizeSearch, profilePath } from "@/lib/admin/users";
import { adminKeys } from "@/lib/api/admin";
import { deleteAdminStarterExercise, fetchAdminCatalog, type AdminCatalogFilters } from "@/lib/api/adminCatalog";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { MUSCLE_GROUPS_STALE_TIME, fetchMuscleGroups } from "@/lib/api/muscleGroups";
import type { AdminCatalogExercise } from "@/lib/api/types";
import { PAGE_SIZES, rowRange } from "@/lib/cursorPages";
import { useCursorPages } from "@/lib/hooks/useCursorPages";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { ADMIN_SEARCH_MAX } from "@/lib/validation/bounds";

const TABS: CatalogTab[] = ["starter", "trainers"];

type OpenDialog =
  | { kind: "create" }
  | { kind: "edit"; exercise: AdminCatalogExercise }
  | { kind: "promote"; exercise: AdminCatalogExercise }
  | { kind: "delete"; exercise: AdminCatalogExercise }
  | { kind: "groups" }
  | null;

interface RowActions {
  edit: (exercise: AdminCatalogExercise) => void;
  remove: (exercise: AdminCatalogExercise) => void;
  promote: (exercise: AdminCatalogExercise) => void;
}

function GroupBadges({ exercise }: { exercise: AdminCatalogExercise }) {
  return (
    <span className="flex min-w-0 flex-wrap gap-[6px]">
      {exercise.muscleGroups.map((group) => (
        <Badge key={group.id}>{group.name}</Badge>
      ))}
    </span>
  );
}

function OwnerLink({ owner }: { owner: NonNullable<AdminCatalogExercise["owner"]> }) {
  return (
    <Link
      href={profilePath(owner.id)}
      className="truncate text-[13px] font-semibold text-[color:var(--color-primary)] hover:underline"
    >
      {owner.name}
    </Link>
  );
}

const iconButton =
  "flex h-[32px] w-[32px] items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)]";

function StarterActions({ exercise, actions }: { exercise: AdminCatalogExercise; actions: RowActions }) {
  return (
    <span className="flex items-center gap-[4px]">
      <button
        type="button"
        aria-label={`Editar ${exercise.name}`}
        onClick={() => actions.edit(exercise)}
        className={`${iconButton} hover:text-[color:var(--color-primary)]`}
      >
        <Pencil aria-hidden="true" width={16} height={16} />
      </button>
      <button
        type="button"
        aria-label={`Excluir ${exercise.name}`}
        onClick={() => actions.remove(exercise)}
        className={`${iconButton} hover:text-[color:var(--color-danger)]`}
      >
        <Trash2 aria-hidden="true" width={16} height={16} />
      </button>
    </span>
  );
}

function columnsFor(tab: CatalogTab, actions: RowActions): DataTableColumn<AdminCatalogExercise>[] {
  const name: DataTableColumn<AdminCatalogExercise> = {
    key: "name",
    header: "Exercício",
    minWidth: 160,
    cell: (exercise) => (
      <span className="truncate text-[13px] font-semibold text-[color:var(--color-text-primary)]">{exercise.name}</span>
    ),
  };
  if (tab === "starter") {
    return [
      name,
      { key: "groups", header: "Grupos musculares", width: 260, cell: (exercise) => <GroupBadges exercise={exercise} /> },
      {
        key: "actions",
        header: "",
        width: 90,
        align: "end",
        cell: (exercise) => <StarterActions exercise={exercise} actions={actions} />,
      },
    ];
  }
  return [
    name,
    { key: "groups", header: "Grupos musculares", width: 200, cell: (exercise) => <GroupBadges exercise={exercise} /> },
    {
      key: "owner",
      header: "Treinador",
      width: 160,
      cell: (exercise) => (exercise.owner ? <OwnerLink owner={exercise.owner} /> : null),
    },
    {
      key: "actions",
      header: "",
      width: 180,
      align: "end",
      cell: (exercise) => <PromoteExerciseButton exerciseName={exercise.name} onClick={() => actions.promote(exercise)} />,
    },
  ];
}

function mobileRowFor(tab: CatalogTab, actions: RowActions) {
  return function MobileRow(exercise: AdminCatalogExercise) {
    return (
      <div className="flex w-full items-start gap-[12px] px-[14px] py-[12px]">
        <span className="flex min-w-0 flex-1 flex-col gap-[6px]">
          <span className="truncate text-[13px] font-semibold text-[color:var(--color-text-primary)]">
            {exercise.name}
          </span>
          <GroupBadges exercise={exercise} />
          {tab === "trainers" && exercise.owner && (
            <span className="flex items-center gap-[4px] text-[11px] text-[color:var(--color-text-secondary)]">
              Treinador: <OwnerLink owner={exercise.owner} />
            </span>
          )}
          {tab === "trainers" && (
            <span className="pt-[2px]">
              <PromoteExerciseButton exerciseName={exercise.name} onClick={() => actions.promote(exercise)} />
            </span>
          )}
        </span>
        {tab === "starter" && <StarterActions exercise={exercise} actions={actions} />}
      </div>
    );
  };
}

/** The `LWZZa` banner: the starter exercise is in a workout, so it stays (E28). */
function InUseBanner({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div
      role="alert"
      className="flex w-full items-start gap-[10px] rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[#ff5c5c1a] px-[16px] py-[12px]"
    >
      <CircleAlert aria-hidden="true" width={16} height={16} className="mt-[1px] shrink-0 text-[color:var(--color-danger)]" />
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="text-[13px] font-semibold text-[color:var(--color-danger)]">
          Este exercício está em uso e não pode ser excluído
        </span>
        <span className="text-[12px] text-[color:var(--color-danger)]">{inUseDetail(name)}</span>
      </span>
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={onClose}
        className="shrink-0 rounded-[var(--radius-sm)] text-[color:var(--color-danger)]"
      >
        <X aria-hidden="true" width={16} height={16} />
      </button>
    </div>
  );
}

/**
 * Exercise curation (admin-panel spec §7; pen.dev `c53jx`, `LWZZa`, `iiou2`; PRD R52–R65): two tabs
 * over `GET /admin/exercises`, "Catálogo inicial" (the starter set: new, edit, delete) and
 * "Exercícios dos treinadores" (`?aba=treinadores`: read-only, the owner shown, "Promover ao
 * catálogo" only), each with a debounced name search and a muscle-group filter, paged by cursor.
 * "Grupos musculares" opens the add-and-rename dialog. The tab counts and the "USADO EM" column
 * are left out (the contract has no counts here, §7.1).
 */
export function ExercisesContent({ initialView }: { initialView: CatalogView }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState(initialView.tab);
  const [muscleGroupId, setMuscleGroupId] = useState(initialView.muscleGroupId);
  const [search, setSearch] = useState(initialView.q ?? "");
  const q = normalizeSearch(useDebouncedValue(search, 300));
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [inUse, setInUse] = useState<string | null>(null);

  const view: CatalogView = { tab, ...(muscleGroupId && { muscleGroupId }), ...(q && { q }) };
  const filters = catalogFilters(view);
  const pages = useCursorPages(JSON.stringify(filters));

  const urlSearch = catalogViewToSearch(view);
  useEffect(() => {
    if (window.location.search !== urlSearch) {
      router.replace(`/painel/exercicios${urlSearch}`, { scroll: false });
    }
  }, [urlSearch, router]);

  const groups = useQuery({
    queryKey: adminKeys.muscleGroups(),
    queryFn: fetchMuscleGroups,
    staleTime: MUSCLE_GROUPS_STALE_TIME,
  });

  const page = { limit: pages.pageSize, cursor: pages.cursor };
  const { data, isPending, isError, isPlaceholderData, isFetching, refetch } = useQuery({
    queryKey: adminKeys.exercisesPage(filters, page),
    queryFn: () => fetchAdminCatalog(filters, page),
    // Keep the previous page on screen only within a tab: another tab's rows would show this tab's
    // actions (edit on a private exercise, promote on a starter one) until the new page arrives.
    placeholderData: (previous, previousQuery) =>
      (previousQuery?.queryKey[2] as AdminCatalogFilters | undefined)?.scope === filters.scope ? previous : undefined,
  });

  const actions: RowActions = {
    edit: (exercise) => setDialog({ kind: "edit", exercise }),
    remove: (exercise) => setDialog({ kind: "delete", exercise }),
    promote: (exercise) => setDialog({ kind: "promote", exercise }),
  };

  const filtered = Boolean(muscleGroupId || q);
  const clearFilters = () => {
    setMuscleGroupId(undefined);
    setSearch("");
  };

  // A delete can empty a later page (its only row gone): step back one page rather than show an
  // empty catalog with no way back. Adjusted while rendering, like `useCursorPages`' own reset.
  if (data && !isPlaceholderData && data.exercises.length === 0 && pages.hasPrev) pages.prev();

  const exercises = data?.exercises;
  const range = exercises ? rowRange(pages.pageIndex, pages.pageSize, exercises.length) : null;

  async function confirmDelete(exercise: AdminCatalogExercise) {
    try {
      await deleteAdminStarterExercise(exercise.id);
      return "deleted" as const;
    } catch (failure) {
      const outcome = deleteOutcome(failure);
      if (outcome) return outcome;
      throw failure;
    }
  }

  function deleteDone(exercise: AdminCatalogExercise, outcome: "deleted" | "in-use" | "gone") {
    setDialog(null);
    if (outcome === "in-use") {
      setInUse(exercise.name);
      return;
    }
    invalidateAfterExerciseWrite(queryClient);
    toast({
      tone: outcome === "deleted" ? "success" : "error",
      message: outcome === "deleted" ? `"${exercise.name}" foi excluído.` : "Este exercício já tinha sido excluído.",
    });
  }

  const emptyTitle = q
    ? `Nenhum exercício encontrado para "${q}"`
    : filtered
      ? "Nenhum exercício neste grupo"
      : tab === "starter"
        ? "O catálogo inicial está vazio"
        : "Nenhum treinador criou exercícios";

  return (
    <main className="font-base flex w-full flex-col gap-[16px] p-[16px] md:gap-[var(--space-6)] md:p-[var(--space-8)]">
      <div className="flex w-full flex-col gap-[12px] md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-[2px] md:gap-[4px]">
          <h1 className="font-heading text-[length:var(--text-xl)] font-bold text-[color:var(--color-text-primary)] md:text-[length:var(--text-2xl)]">
            Exercícios
          </h1>
          <p className="text-[12px] text-[color:var(--color-text-secondary)] md:text-[length:var(--text-base)]">
            {catalogTabSubtitles[tab]}
          </p>
        </div>
        <div className="flex gap-[12px]">
          <Button variant="outline" onClick={() => setDialog({ kind: "groups" })}>
            Grupos musculares
          </Button>
          {tab === "starter" && (
            <Button onClick={() => setDialog({ kind: "create" })}>
              <Plus aria-hidden="true" width={16} height={16} />
              Novo exercício
            </Button>
          )}
        </div>
      </div>

      {inUse && <InUseBanner name={inUse} onClose={() => setInUse(null)} />}

      <div role="tablist" aria-label="Catálogo" className="flex w-full gap-[24px] border-b border-[var(--color-border)]">
        {TABS.map((key) => {
          const selected = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setTab(key);
                setInUse(null);
              }}
              className={`-mb-px border-b-2 px-[2px] py-[10px] text-[length:var(--text-base)] transition-colors ${
                selected
                  ? "border-[var(--color-primary)] font-semibold text-[color:var(--color-text-primary)]"
                  : "border-transparent text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]"
              }`}
            >
              {catalogTabLabels[key]}
            </button>
          );
        })}
      </div>

      <div className="flex w-full flex-col gap-[12px] md:flex-row md:items-end md:gap-[var(--space-4)]">
        <TextField
          label="Buscar"
          type="search"
          placeholder="Buscar exercício pelo nome"
          value={search}
          maxLength={ADMIN_SEARCH_MAX}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full md:w-[360px] [&>label]:sr-only md:[&>label]:not-sr-only"
        />
        <Dropdown
          label="Grupo muscular"
          className="w-full md:w-[220px]"
          options={muscleGroupFilterOptions(groups.data)}
          value={muscleGroupId ? String(muscleGroupId) : ""}
          onChange={(value) => setMuscleGroupId(value ? Number(value) : undefined)}
        />
      </div>

      <DataTable
        label={catalogTabLabels[tab]}
        columns={columnsFor(tab, actions)}
        rows={exercises}
        rowKey={(exercise) => exercise.id}
        loading={isPending}
        mobileRow={mobileRowFor(tab, actions)}
        error={
          isError && !data ? (
            <DataTableMessage
              role="alert"
              icon={CircleAlert}
              title="Não foi possível carregar os exercícios"
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
            icon={filtered ? SearchX : Dumbbell}
            title={emptyTitle}
            description={filtered ? "Confira o nome, ou limpe os filtros." : undefined}
            action={
              filtered ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : undefined
            }
          />
        }
        footer={
          exercises && exercises.length > 0 ? (
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

      {dialog?.kind === "create" && <AdminExerciseDialog mode="create" onClose={() => setDialog(null)} />}
      {(dialog?.kind === "edit" || dialog?.kind === "promote") && (
        <AdminExerciseDialog mode={dialog.kind} exercise={dialog.exercise} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "groups" && <MuscleGroupsDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === "delete" && (
        <ConfirmDialog
          title="Excluir exercício?"
          confirmLabel="Excluir"
          cancelVariant="ghost"
          width={480}
          onConfirm={() => confirmDelete(dialog.exercise)}
          errorMessage={(failure) => apiErrorMessage(failure, DELETE_FAILED_MESSAGE)}
          onDone={(outcome) => deleteDone(dialog.exercise, outcome)}
          onClose={() => setDialog(null)}
        >
          <p>
            <span className="font-semibold text-[color:var(--color-text-primary)]">{dialog.exercise.name}</span> sai do
            catálogo inicial de todos os treinadores. Esta ação não pode ser desfeita.
          </p>
        </ConfirmDialog>
      )}
    </main>
  );
}
