"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, History, X } from "lucide-react";
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
import { ADMIN_ACTIONS, actionDetail, actionLabels, actionTones, DELETED_USER_NAME } from "@/lib/admin/actions";
import { emptyHistoryMessage, historyFiltersToSearch } from "@/lib/admin/history";
import {
  adminKeys,
  fetchAdminActionAdmins,
  fetchAdminActions,
  type AdminActionFilters,
} from "@/lib/api/admin";
import type { AdminAction, AdminActionEntry, AdminUserRef } from "@/lib/api/types";
import { PAGE_SIZES, rowRange } from "@/lib/cursorPages";
import { formatInstantDate, formatTimeOfDay } from "@/lib/format";
import { useCursorPages } from "@/lib/hooks/useCursorPages";

const ADMINS_STALE_TIME = 5 * 60_000;

const ACTION_OPTIONS = [
  { value: "", label: "Todas as ações" },
  ...ADMIN_ACTIONS.map((action) => ({ value: action, label: actionLabels[action] })),
];

/** "17/11/2026 09:31", in the business zone. */
function when(entry: AdminActionEntry): string {
  return `${formatInstantDate(entry.createdAt)} ${formatTimeOfDay(entry.createdAt)}`;
}

/** The affected user: a link to the profile, plain text for a deleted account, "—" for none. */
function Affected({ user }: { user: AdminUserRef | null }) {
  if (!user) return <span className="text-[12px] text-[color:var(--color-text-tertiary)]">—</span>;
  if (user.name === DELETED_USER_NAME || user.role === "ADMIN") {
    return <span className="truncate text-[13px] text-[color:var(--color-text-secondary)]">{user.name}</span>;
  }
  return (
    <Link
      href={`/painel/usuarios/${user.id}`}
      className="truncate text-[13px] font-semibold text-[color:var(--color-primary)] hover:underline"
    >
      {user.name}
    </Link>
  );
}

function Detail({ entry }: { entry: AdminActionEntry }) {
  const detail = actionDetail(entry);
  return (
    <span
      className={`text-[12px] break-words ${
        detail === "—" ? "text-[color:var(--color-text-tertiary)]" : "text-[color:var(--color-text-secondary)]"
      }`}
    >
      {detail}
    </span>
  );
}

const COLUMNS: DataTableColumn<AdminActionEntry>[] = [
  {
    key: "date",
    header: "Data",
    width: 140,
    cell: (entry) => <span className="text-[12px] text-[color:var(--color-text-secondary)]">{when(entry)}</span>,
  },
  {
    key: "admin",
    header: "Admin",
    width: 140,
    cell: (entry) => (
      <span className="truncate text-[13px] font-semibold text-[color:var(--color-text-primary)]">{entry.admin.name}</span>
    ),
  },
  {
    key: "action",
    header: "Ação",
    width: 230,
    cell: (entry) => <Badge variant={actionTones[entry.action]}>{actionLabels[entry.action]}</Badge>,
  },
  { key: "target", header: "Afetado", width: 170, cell: (entry) => <Affected user={entry.targetUser} /> },
  { key: "detail", header: "Motivo / detalhe", cell: (entry) => <Detail entry={entry} /> },
];

function MobileRow(entry: AdminActionEntry) {
  return (
    <div className="flex w-full flex-col gap-[6px] px-[14px] py-[12px]">
      <div className="flex items-center justify-between gap-[8px]">
        <Badge variant={actionTones[entry.action]}>{actionLabels[entry.action]}</Badge>
        <span className="shrink-0 text-[11px] text-[color:var(--color-text-tertiary)]">{when(entry)}</span>
      </div>
      <span className="text-[12px] text-[color:var(--color-text-secondary)]">
        por <span className="font-semibold text-[color:var(--color-text-primary)]">{entry.admin.name}</span>
      </span>
      {entry.targetUser && <Affected user={entry.targetUser} />}
      <Detail entry={entry} />
    </div>
  );
}

/**
 * The admin action history (admin-panel spec §6, §7; pen.dev `TExWT`, empty `ZCKW9`): newest first,
 * filtered by admin, action and affected user, paged by cursor. The affected user is a removable
 * chip set by `?usuario=<id>` (a profile's "Histórico" link), named from the first entry: the
 * contract filters by id only, so the frame's "Buscar por nome ou e-mail" is left out (§7.1).
 */
export function HistoryContent({ initialFilters }: { initialFilters: AdminActionFilters }) {
  const router = useRouter();
  const [adminId, setAdminId] = useState(initialFilters.adminId);
  const [action, setAction] = useState(initialFilters.action);
  const [targetUserId, setTargetUserId] = useState(initialFilters.targetUserId);

  const filters: AdminActionFilters = {
    ...(adminId && { adminId }),
    ...(action && { action }),
    ...(targetUserId && { targetUserId }),
  };
  const filtersKey = JSON.stringify(filters);
  const pages = useCursorPages(filtersKey);

  // Keep the URL in step with the filters actually applied (no history entry per keystroke). In an
  // effect: a navigation is a side effect, never something to start while rendering.
  const urlSearch = historyFiltersToSearch(filters);
  useEffect(() => {
    if (window.location.search !== urlSearch) {
      router.replace(`/painel/historico${urlSearch}`, { scroll: false });
    }
  }, [urlSearch, router]);

  const admins = useQuery({
    queryKey: adminKeys.actionAdmins(),
    queryFn: fetchAdminActionAdmins,
    staleTime: ADMINS_STALE_TIME,
  });

  const page = { limit: pages.pageSize, cursor: pages.cursor };
  const { data, isPending, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: adminKeys.actionsPage(filters, page),
    queryFn: () => fetchAdminActions(filters, page),
    placeholderData: keepPreviousData,
  });

  const entries = data?.entries;
  // The chip's name: the affected user of any entry on screen (all share it under this filter).
  const [targetName, setTargetName] = useState<string | null>(null);
  const shownTarget = targetUserId ? entries?.find((e) => e.targetUser?.id === targetUserId)?.targetUser : undefined;
  if (shownTarget && shownTarget.name !== targetName) setTargetName(shownTarget.name);

  const adminName = admins.data?.admins.find((admin) => admin.id === adminId)?.name;
  const filtered = Boolean(adminId || action || targetUserId);
  const clearFilters = () => {
    setAdminId(undefined);
    setAction(undefined);
    setTargetUserId(undefined);
  };

  const adminOptions = [
    { value: "", label: "Todos" },
    ...(admins.data?.admins ?? []).map((admin) => ({ value: String(admin.id), label: admin.name })),
  ];

  return (
    <main className="font-base flex w-full flex-col gap-[16px] p-[16px] md:gap-[var(--space-6)] md:p-[var(--space-8)]">
      <div className="flex flex-col gap-[2px] md:gap-[4px]">
        <h1 className="font-heading text-[length:var(--text-xl)] font-bold text-[color:var(--color-text-primary)] md:text-[length:var(--text-2xl)]">
          Histórico
        </h1>
        <p className="text-[12px] text-[color:var(--color-text-secondary)] md:text-[length:var(--text-base)]">
          Todas as ações feitas pelos admins, da mais recente para a mais antiga
        </p>
      </div>

      <div className="flex w-full flex-col gap-[12px] md:flex-row md:flex-wrap md:items-end md:gap-[var(--space-4)]">
        <Dropdown
          label="Admin"
          className="w-full md:w-[200px]"
          placeholder={admins.isError ? "Admins indisponíveis" : "Todos"}
          options={admins.isError ? [] : adminOptions}
          value={admins.isError ? undefined : String(adminId ?? "")}
          disabled={admins.isError}
          onChange={(value) => setAdminId(value ? Number(value) : undefined)}
        />
        <Dropdown
          label="Ação"
          className="w-full md:w-[240px]"
          options={ACTION_OPTIONS}
          value={action ?? ""}
          onChange={(value) => setAction((value || undefined) as AdminAction | undefined)}
        />
        {targetUserId && (
          <div className="flex flex-col gap-[6px]">
            <span className="text-[length:var(--text-xs)] font-semibold text-[color:var(--color-text-secondary)]">
              Usuário afetado
            </span>
            <span className="flex h-[42px] w-fit items-center gap-[8px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] pr-[8px] pl-[14px] text-[length:var(--text-base)] text-[color:var(--color-text-primary)]">
              {targetName ?? `Usuário #${targetUserId}`}
              <button
                type="button"
                aria-label="Remover filtro de usuário afetado"
                onClick={() => setTargetUserId(undefined)}
                className="flex h-[24px] w-[24px] items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
              >
                <X aria-hidden="true" width={14} height={14} />
              </button>
            </span>
          </div>
        )}
      </div>

      <DataTable
        label="Histórico"
        columns={COLUMNS}
        rows={entries}
        rowKey={(entry) => entry.id}
        loading={isPending}
        mobileRow={MobileRow}
        error={
          isError && !data ? (
            <DataTableMessage
              role="alert"
              icon={CircleAlert}
              title="Não foi possível carregar o histórico"
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
            icon={History}
            title="Nenhuma ação encontrada"
            description={emptyHistoryMessage({
              admin: adminName,
              action,
              user: targetUserId ? (targetName ?? undefined) : undefined,
            })}
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
          entries && entries.length > 0 ? (
            <Pagination
              pageSize={pages.pageSize}
              pageSizes={PAGE_SIZES}
              onPageSizeChange={pages.setPageSize}
              range={rowRange(pages.pageIndex, pages.pageSize, entries.length)}
              hasPrev={pages.hasPrev}
              hasNext={data?.nextCursor != null}
              onPrev={pages.prev}
              onNext={() => pages.next(data?.nextCursor ?? null)}
              busy={isPlaceholderData}
            />
          ) : undefined
        }
      />
    </main>
  );
}
