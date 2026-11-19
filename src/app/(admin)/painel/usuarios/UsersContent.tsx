"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, CircleAlert, SearchX, Users } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Button,
  DataTable,
  DataTableMessage,
  Dropdown,
  Pagination,
  TextField,
  type DataTableColumn,
} from "@/components/ui";
import { RoleAvatar } from "@/components/domain/RoleAvatar";
import { RoleBadge, StatusBadge } from "@/components/domain/UserBadges";
import { clientCountLabel, normalizeSearch, profilePath, userFiltersToSearch } from "@/lib/admin/users";
import { adminKeys, fetchAdminUsers, type AdminUserFilters } from "@/lib/api/admin";
import type { AdminDirectoryUser } from "@/lib/api/types";
import { PAGE_SIZES, rowRange } from "@/lib/cursorPages";
import { useCursorPages } from "@/lib/hooks/useCursorPages";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { ADMIN_SEARCH_MAX } from "@/lib/validation/bounds";

const ROLE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "TRAINER", label: "Treinadores" },
  { value: "CLIENT", label: "Alunos" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "ACTIVE", label: "Ativos" },
  { value: "SUSPENDED", label: "Suspensos" },
];

/** "12 alunos" for a trainer; the current trainer (a link) or "Sem treinador" for a client (E15). */
function Relation({ user }: { user: AdminDirectoryUser }) {
  if (user.role === "TRAINER") {
    return (
      <span className="flex items-center gap-[6px] text-[13px] text-[color:var(--color-text-secondary)]">
        <Users aria-hidden="true" width={14} height={14} className="text-[color:var(--color-text-tertiary)]" />
        {clientCountLabel(user.currentClientCount ?? 0)}
      </span>
    );
  }
  if (!user.currentTrainer) {
    return <span className="text-[13px] text-[color:var(--color-text-tertiary)]">Sem treinador</span>;
  }
  return (
    <Link
      href={profilePath(user.currentTrainer.id)}
      className="truncate text-[13px] font-semibold text-[color:var(--color-primary)] hover:underline"
    >
      {user.currentTrainer.name}
    </Link>
  );
}

const COLUMNS: DataTableColumn<AdminDirectoryUser>[] = [
  {
    key: "name",
    header: "Nome",
    width: 240,
    cell: (user) => (
      <span className="flex min-w-0 items-center gap-[10px]">
        <RoleAvatar name={user.name} role={user.role} />
        <span className="truncate text-[13px] font-semibold text-[color:var(--color-text-primary)]">
          {user.name}
        </span>
      </span>
    ),
  },
  {
    key: "email",
    header: "E-mail",
    cell: (user) => (
      <span className="truncate text-[12px] text-[color:var(--color-text-secondary)]">{user.email}</span>
    ),
  },
  { key: "role", header: "Papel", width: 110, cell: (user) => <RoleBadge role={user.role} /> },
  { key: "status", header: "Status", width: 110, cell: (user) => <StatusBadge suspended={user.suspended} /> },
  { key: "relation", header: "Treinador atual / Alunos", width: 200, cell: (user) => <Relation user={user} /> },
  {
    key: "link",
    header: "",
    width: 90,
    align: "end",
    cell: (user) => (
      <Link
        href={profilePath(user.id)}
        aria-label={`Ver perfil de ${user.name}`}
        className="flex items-center gap-[4px] text-[12px] font-semibold text-[color:var(--color-primary)] hover:underline"
      >
        Ver perfil
        <ChevronRight aria-hidden="true" width={13} height={13} />
      </Link>
    ),
  },
];

function MobileRow(user: AdminDirectoryUser) {
  const relation =
    user.role === "TRAINER"
      ? clientCountLabel(user.currentClientCount ?? 0)
      : user.currentTrainer
        ? `Treinador atual: ${user.currentTrainer.name}`
        : "Sem treinador";
  return (
    <Link
      href={profilePath(user.id)}
      className="flex w-full items-center gap-[12px] px-[14px] py-[12px] transition-colors hover:bg-[var(--color-surface-hover)]"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <span className="truncate text-[13px] font-semibold text-[color:var(--color-text-primary)]">{user.name}</span>
        <span className="truncate text-[11px] text-[color:var(--color-text-secondary)]">{user.email}</span>
        <span className="flex items-center gap-[6px] pt-[2px]">
          <RoleBadge role={user.role} />
          <StatusBadge suspended={user.suspended} />
        </span>
        <span
          className={`text-[11px] ${
            user.role === "CLIENT" && !user.currentTrainer
              ? "text-[color:var(--color-text-tertiary)]"
              : "text-[color:var(--color-text-secondary)]"
          }`}
        >
          {relation}
        </span>
      </span>
      <ChevronRight aria-hidden="true" width={16} height={16} className="shrink-0 text-[color:var(--color-text-tertiary)]" />
    </Link>
  );
}

/**
 * The user directory (admin-panel spec §7, W14; pen.dev `ETgH1`, loading `i6hSFx`, empty `BVZe4`,
 * phone `fXng6`): trainers and clients only (admins are never listed), filtered by role, status
 * and a debounced name/e-mail search, paged by cursor. The filters live in the URL; the cursors in
 * `useCursorPages`. No totals and no page numbers (§7.1).
 */
export function UsersContent({ initialFilters }: { initialFilters: AdminUserFilters }) {
  const router = useRouter();
  const [role, setRole] = useState(initialFilters.role);
  const [status, setStatus] = useState(initialFilters.status);
  const [search, setSearch] = useState(initialFilters.q ?? "");
  const q = normalizeSearch(useDebouncedValue(search, 300));

  const filters: AdminUserFilters = { ...(role && { role }), ...(status && { status }), ...(q && { q }) };
  const filtersKey = JSON.stringify(filters);
  const pages = useCursorPages(filtersKey);

  // Keep the URL in step with the filters actually applied (no history entry per keystroke). In an
  // effect: a navigation is a side effect, never something to start while rendering.
  const urlSearch = userFiltersToSearch(filters);
  useEffect(() => {
    if (window.location.search !== urlSearch) {
      router.replace(`/painel/usuarios${urlSearch}`, { scroll: false });
    }
  }, [urlSearch, router]);

  const page = { limit: pages.pageSize, cursor: pages.cursor };
  const { data, isPending, isError, isPlaceholderData, isFetching, refetch } = useQuery({
    queryKey: adminKeys.usersPage(filters, page),
    queryFn: () => fetchAdminUsers(filters, page),
    placeholderData: keepPreviousData,
  });

  const filtered = Boolean(role || status || q);
  const clearFilters = () => {
    setRole(undefined);
    setStatus(undefined);
    setSearch("");
  };

  const users = data?.users;
  const range = users ? rowRange(pages.pageIndex, pages.pageSize, users.length) : null;

  return (
    <main className="font-base flex w-full flex-col gap-[16px] p-[16px] md:gap-[var(--space-6)] md:p-[var(--space-8)]">
      <div className="flex flex-col gap-[2px] md:gap-[4px]">
        <h1 className="font-heading text-[length:var(--text-xl)] font-bold text-[color:var(--color-text-primary)] md:text-[length:var(--text-2xl)]">
          Usuários
        </h1>
        <p className="text-[12px] text-[color:var(--color-text-secondary)] md:text-[length:var(--text-base)]">
          Treinadores e alunos<span className="hidden md:inline"> da plataforma</span>
        </p>
      </div>

      <div className="flex w-full flex-col gap-[12px] md:flex-row md:items-end md:gap-[var(--space-4)]">
        <TextField
          label="Buscar"
          type="search"
          placeholder="Buscar por nome ou e-mail"
          value={search}
          maxLength={ADMIN_SEARCH_MAX}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full md:w-[360px] [&>label]:sr-only md:[&>label]:not-sr-only"
        />
        <div className="flex w-full gap-[12px] md:w-auto md:gap-[var(--space-4)]">
          <Dropdown
            label="Papel"
            className="flex-1 md:w-[180px] md:flex-none"
            options={ROLE_OPTIONS}
            value={role ?? ""}
            onChange={(value) => setRole((value || undefined) as AdminUserFilters["role"])}
          />
          <Dropdown
            label="Status"
            className="flex-1 md:w-[180px] md:flex-none"
            options={STATUS_OPTIONS}
            value={status ?? ""}
            onChange={(value) => setStatus((value || undefined) as AdminUserFilters["status"])}
          />
        </div>
      </div>

      <DataTable
        label="Usuários"
        columns={COLUMNS}
        rows={users}
        rowKey={(user) => user.id}
        loading={isPending}
        mobileRow={MobileRow}
        error={
          isError && !data ? (
            <DataTableMessage
              role="alert"
              icon={CircleAlert}
              title="Não foi possível carregar os usuários"
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
            icon={SearchX}
            title={q ? `Nenhum usuário encontrado para "${q}"` : "Nenhum usuário encontrado"}
            description={
              filtered ? "Confira o nome ou o e-mail, ou limpe os filtros." : "Ainda não há treinadores nem alunos."
            }
            action={
              filtered ? (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                >
                  Limpar filtros
                </Button>
              ) : undefined
            }
          />
        }
        footer={
          users && users.length > 0 ? (
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
    </main>
  );
}
