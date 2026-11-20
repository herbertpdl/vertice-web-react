"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, SearchX, ToggleRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTable, DataTableMessage, TextField, useToast } from "@/components/ui";
import {
  FLAG_GONE_MESSAGE,
  everyoneToast,
  featureFlagPath,
  filterFeatureFlags,
  flagCountLabel,
  userCountLabel,
} from "@/lib/admin/featureFlags";
import { normalizeSearch } from "@/lib/admin/users";
import { adminKeys } from "@/lib/api/admin";
import { fetchFeatureFlags, settleAfterWrite } from "@/lib/api/adminFeatureFlags";
import type { FeatureFlag } from "@/lib/api/types";
import { ADMIN_SEARCH_MAX } from "@/lib/validation/bounds";
import { FeatureFlagEveryoneDialog, FlagKey, type EveryoneOutcome } from "./FeatureFlagEveryoneDialog";
import { FlagSwitch, focusFirstVisible } from "./flagControls";

/** The everyone confirmation: which flag, and the state captured on click (D5). */
type OpenDialog = { key: string; target: boolean } | null;

const everyoneFocusId = (key: string) => `everyone:${key}`;

const usersLinkClass =
  "font-base inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-[14px] py-[7px] text-[length:var(--text-sm)] font-semibold whitespace-nowrap text-[color:var(--color-text-primary)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] hover:text-[color:var(--color-primary)]";

interface RowProps {
  flag: FeatureFlag;
  pending: boolean;
  onToggle: (flag: FeatureFlag, target: boolean) => void;
}

function FlagText({ flag }: { flag: FeatureFlag }) {
  return (
    <span className="flex min-w-0 flex-col gap-[6px]">
      <FlagKey className="text-[13px]">{flag.key}</FlagKey>
      <span className="text-[12px] leading-[1.5] whitespace-pre-line text-[color:var(--color-text-secondary)]">
        {flag.description}
      </span>
    </span>
  );
}

function EveryoneSwitch({ flag, pending, onToggle }: RowProps) {
  return (
    <FlagSwitch
      checked={flag.enabled}
      pending={pending}
      aria-label={`Para todos: ${flag.key}`}
      focusId={everyoneFocusId(flag.key)}
      onToggle={(target) => onToggle(flag, target)}
    />
  );
}

function UsersLink({ flag }: { flag: FeatureFlag }) {
  return (
    <Link href={featureFlagPath(flag.key)} className={usersLinkClass} aria-label={`Ver usuários de ${flag.key}`}>
      Ver usuários
    </Link>
  );
}

/**
 * The feature flags list (feature-flags spec §6.1; frames `ufeI3`, `tw3jw`, `A3vAb`, `pGJVX`,
 * `vBk8U`, `q1Y3N`, `Xp9eO`): every flag with its everyone switch (which asks first, D6) and its
 * user-settings count, searched client-side by key and description (D8, `?q=`).
 */
export function FeatureFlagsContent({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState(initialQuery);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  // The switch that opened the dialog gets focus back once the dialog has unmounted (§10).
  const returnFocusTo = useRef<string | null>(null);

  const q = normalizeSearch(search);
  const urlSearch = q ? `?${new URLSearchParams({ q }).toString()}` : "";
  useEffect(() => {
    if (window.location.search !== urlSearch) router.replace(`/painel/flags${urlSearch}`, { scroll: false });
  }, [urlSearch, router]);

  useEffect(() => {
    if (dialog !== null || returnFocusTo.current === null) return;
    focusFirstVisible(everyoneFocusId(returnFocusTo.current));
    returnFocusTo.current = null;
  }, [dialog]);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: adminKeys.featureFlags(),
    queryFn: fetchFeatureFlags,
  });

  const all: FeatureFlag[] | undefined = data?.flags;
  const shown = all ? filterFeatureFlags(all, q) : undefined;

  const openDialog = (flag: FeatureFlag, target: boolean) => {
    returnFocusTo.current = flag.key;
    setDialog({ key: flag.key, target });
  };

  async function saved() {
    await settleAfterWrite(queryClient);
  }

  function done(open: NonNullable<OpenDialog>, outcome: EveryoneOutcome) {
    setSavingKey(null);
    setDialog(null);
    toast(
      outcome.gone
        ? { tone: "error", message: FLAG_GONE_MESSAGE }
        : { tone: "success", message: everyoneToast(open.key, open.target) },
    );
  }

  return (
    <main className="font-base flex w-full flex-col gap-[16px] p-[16px] md:gap-[var(--space-6)] md:p-[var(--space-8)]">
      <div className="flex flex-col gap-[2px] md:gap-[4px]">
        <h1 className="font-heading text-[length:var(--text-xl)] font-bold text-[color:var(--color-text-primary)] md:text-[length:var(--text-2xl)]">
          Feature flags
        </h1>
        <p className="text-[12px] text-[color:var(--color-text-secondary)] md:text-[length:var(--text-base)]">
          Ligue ou desligue partes do produto para todos ou para usuários específicos. As mudanças valem em até 1
          minuto.
        </p>
      </div>

      <TextField
        label="Buscar"
        type="search"
        placeholder="Buscar por nome ou descrição"
        value={search}
        maxLength={ADMIN_SEARCH_MAX}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full md:w-[360px] [&>label]:sr-only md:[&>label]:not-sr-only"
      />

      <DataTable
        label="Feature flags"
        columns={[
          { key: "flag", header: "Flag", minWidth: 280, cell: (flag: FeatureFlag) => <FlagText flag={flag} /> },
          {
            key: "everyone",
            header: "Para todos",
            width: 180,
            cell: (flag: FeatureFlag) => (
              <EveryoneSwitch flag={flag} pending={savingKey === flag.key} onToggle={openDialog} />
            ),
          },
          {
            key: "users",
            header: "Configuração própria",
            width: 180,
            cell: (flag: FeatureFlag) => (
              <span className="text-[13px] text-[color:var(--color-text-secondary)]">
                {userCountLabel(flag.users.length)}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            width: 150,
            align: "end",
            cell: (flag: FeatureFlag) => <UsersLink flag={flag} />,
          },
        ]}
        rows={shown}
        rowKey={(flag) => flag.key}
        loading={isPending}
        loadingRows={2}
        mobileRow={(flag) => (
          <div className="flex w-full flex-col gap-[10px] px-[14px] py-[12px]">
            <FlagText flag={flag} />
            <span className="flex items-center justify-between gap-[12px]">
              <EveryoneSwitch flag={flag} pending={savingKey === flag.key} onToggle={openDialog} />
              <span className="text-[12px] text-[color:var(--color-text-secondary)]">
                {userCountLabel(flag.users.length)}
              </span>
            </span>
            <span>
              <UsersLink flag={flag} />
            </span>
          </div>
        )}
        error={
          isError && !data ? (
            <DataTableMessage
              role="alert"
              icon={CircleAlert}
              title="Não foi possível carregar as flags"
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
          q ? (
            <DataTableMessage
              icon={SearchX}
              title="Nenhuma flag encontrada"
              description="Confira o texto, ou limpe a busca."
              action={
                <Button variant="outline" onClick={() => setSearch("")}>
                  Limpar busca
                </Button>
              }
            />
          ) : (
            <DataTableMessage icon={ToggleRight} title="Nenhuma flag encontrada" />
          )
        }
        footer={
          all && shown && shown.length > 0 ? (
            <span className="text-[12px] text-[color:var(--color-text-tertiary)]">
              {flagCountLabel(shown.length, all.length)}
            </span>
          ) : undefined
        }
      />

      {dialog && (
        <FeatureFlagEveryoneDialog
          flagKey={dialog.key}
          target={dialog.target}
          onPending={(pending) => setSavingKey(pending ? dialog.key : null)}
          onSaved={saved}
          onDone={(outcome) => done(dialog, outcome)}
          onClose={() => setDialog(null)}
        />
      )}
    </main>
  );
}
