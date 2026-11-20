"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CircleAlert, FlagOff, Trash2, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  DataTable,
  DataTableMessage,
  Dropdown,
  SkeletonLine,
  Spinner,
  TextField,
  useToast,
} from "@/components/ui";
import {
  FLAG_GONE_MESSAGE,
  FLAG_SAVE_FAILED_MESSAGE,
  everyoneToast,
  isFlagGone,
  userLabel,
  userRemovedToast,
  userSetToast,
} from "@/lib/admin/featureFlags";
import { adminKeys } from "@/lib/api/admin";
import {
  fetchFeatureFlags,
  removeFeatureFlagUser,
  setFeatureFlagUser,
  settleAfterWrite,
} from "@/lib/api/adminFeatureFlags";
import type { FeatureFlag, FeatureFlagUser } from "@/lib/api/types";
import { featureFlagUserIdSchema } from "@/lib/validation/admin";
import { FeatureFlagEveryoneDialog, FlagKey, type EveryoneOutcome } from "../FeatureFlagEveryoneDialog";
import { FlagSwitch, focusFirstVisible } from "../flagControls";

/** A user-setting write in flight: its row is pending until it settles (D9). */
interface UserOp {
  id: number;
  userId: number;
  kind: "set" | "remove";
}

const EVERYONE_FOCUS = "everyone";
const NUMBER_FOCUS = "user-number";
const userSwitchFocus = (userId: number) => `user-switch:${userId}`;
const userRemoveFocus = (userId: number) => `user-remove:${userId}`;
const userRemovingFocus = (userId: number) => `user-removing:${userId}`;

const SETTING_OPTIONS = [
  { value: "on", label: "Ligado" },
  { value: "off", label: "Desligado" },
];

let nextOpId = 1;

function BackLink() {
  return (
    <Link
      href="/painel/flags"
      className="flex w-fit items-center gap-[6px] text-[13px] font-semibold text-[color:var(--color-primary)] hover:underline"
    >
      <ArrowLeft aria-hidden="true" width={16} height={16} />
      Feature flags
    </Link>
  );
}

function FlagTitle({ flagKey }: { flagKey: string }) {
  return (
    <h1 className="font-heading">
      <FlagKey className="text-[20px] font-bold md:text-[24px]">{flagKey}</FlagKey>
    </h1>
  );
}

const card = "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]";

/** The "Para todos" card: the real switch once loaded, a non-interactive placeholder before (§6.2). */
function EveryoneCard({
  flag,
  pending,
  onToggle,
}: {
  flag: FeatureFlag | undefined;
  pending: boolean;
  onToggle: (target: boolean) => void;
}) {
  return (
    <div
      aria-busy={flag ? undefined : true}
      className={`${card} flex w-full shrink-0 flex-col gap-[6px] px-[16px] py-[14px] md:w-[280px]`}
    >
      <div className="flex items-center justify-between gap-[12px]">
        <span className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">Para todos</span>
        {flag ? (
          <FlagSwitch
            checked={flag.enabled}
            pending={pending}
            aria-label={`Para todos: ${flag.key}`}
            focusId={EVERYONE_FOCUS}
            labelSide="start"
            onToggle={onToggle}
          />
        ) : (
          <>
            <span className="sr-only">Carregando configuração para todos</span>
            <span aria-hidden="true" className="flex items-center gap-[10px]">
              <span className="text-[13px] font-semibold text-[color:var(--color-text-secondary)]">—</span>
              <span className="flex h-6 w-10 items-center rounded-[var(--radius-full)] bg-[var(--color-surface-active)] p-[3px] opacity-60" />
            </span>
          </>
        )}
      </div>
      <p className="text-[12px] text-[color:var(--color-text-tertiary)]">
        Vale para quem não tem configuração própria. Pede confirmação.
      </p>
    </div>
  );
}

interface UserRowActions {
  pendingFor: (userId: number) => boolean;
  removingFor: (userId: number) => boolean;
  toggle: (user: FeatureFlagUser, target: boolean) => void;
  remove: (user: FeatureFlagUser) => void;
}

function UserSwitch({ user, actions }: { user: FeatureFlagUser; actions: UserRowActions }) {
  return (
    <FlagSwitch
      checked={user.enabled}
      pending={actions.pendingFor(user.userId)}
      aria-label={`Configuração de usuário #${String(user.userId)}`}
      focusId={userSwitchFocus(user.userId)}
      onToggle={(target) => actions.toggle(user, target)}
    />
  );
}

function UserActions({ user, actions }: { user: FeatureFlagUser; actions: UserRowActions }) {
  if (actions.removingFor(user.userId)) {
    return (
      <span
        role="status"
        tabIndex={-1}
        data-focus-id={userRemovingFocus(user.userId)}
        className="flex items-center gap-[8px] text-[12px] text-[color:var(--color-text-secondary)] outline-none"
      >
        <Spinner size="sm" className="!h-[16px] !w-[16px]" />
        Removendo…
      </span>
    );
  }
  const pending = actions.pendingFor(user.userId);
  return (
    <button
      type="button"
      aria-label={`Remover usuário #${String(user.userId)}`}
      aria-disabled={pending || undefined}
      data-focus-id={userRemoveFocus(user.userId)}
      onClick={() => {
        if (!pending) actions.remove(user);
      }}
      className={`flex h-[32px] w-[32px] items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--color-text-secondary)] transition-colors ${
        pending ? "opacity-35" : "hover:bg-[var(--color-surface-hover)] hover:text-[color:var(--color-danger)]"
      }`}
    >
      <Trash2 aria-hidden="true" width={16} height={16} />
    </button>
  );
}

/**
 * One flag (feature-flags spec §6.2; frames `gJQrD`, `oONTU`, `MzesP`, `vJYcq`): its everyone
 * switch (asks first), the add form for a user's own setting, and the users with one, each with a
 * switch and remove that save at once. Read from the list query (D3); every write settles that
 * query before its pending state ends (D4), and focus never falls to `<body>` (§10).
 */
export function FeatureFlagContent({ flagKey }: { flagKey: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: adminKeys.featureFlags(),
    queryFn: fetchFeatureFlags,
  });
  const flags: FeatureFlag[] | undefined = data?.flags;
  const flag = flags?.find((candidate) => candidate.key === flagKey);

  const [dialogTarget, setDialogTarget] = useState<boolean | null>(null);
  const [everyoneSaving, setEveryoneSaving] = useState(false);

  const [numberText, setNumberText] = useState("");
  const [setting, setSetting] = useState("on");
  const [numberError, setNumberError] = useState<string | undefined>();
  const [adding, setAdding] = useState(false);
  const addingRef = useRef(false);

  const [ops, setOps] = useState<UserOp[]>([]);
  // Same-tick guard: a second Space before the re-render must still send nothing.
  const busyUsers = useRef(new Map<number, number>());

  // Where focus goes once the next render has committed (the control that held it may be gone).
  const focusNext = useRef<string | null>(null);
  const [, setFocusTick] = useState(0);
  const requestFocus = (focusId: string) => {
    focusNext.current = focusId;
    setFocusTick((tick) => tick + 1);
  };
  const goneHeading = useRef<HTMLHeadingElement>(null);
  const focusGone = useRef(false);
  useEffect(() => {
    if (focusGone.current && goneHeading.current) {
      focusGone.current = false;
      focusNext.current = null;
      goneHeading.current.focus();
      return;
    }
    if (focusNext.current && focusFirstVisible(focusNext.current)) focusNext.current = null;
  });

  const markBusy = (userId: number, delta: 1 | -1) => {
    const count = (busyUsers.current.get(userId) ?? 0) + delta;
    if (count > 0) busyUsers.current.set(userId, count);
    else busyUsers.current.delete(userId);
  };

  /**
   * Runs one user-setting write: the row pending throughout, the list settled before it ends, then
   * the toast. A 404 is the flag gone (D10); any other failure an error toast, the row unchanged.
   */
  async function writeUser(userId: number, kind: UserOp["kind"], call: () => Promise<unknown>, success: string) {
    const op: UserOp = { id: nextOpId++, userId, kind };
    markBusy(userId, 1);
    setOps((current) => [...current, op]);
    let outcome: "ok" | "gone" | "failed";
    try {
      await call();
      outcome = "ok";
    } catch (failure) {
      outcome = isFlagGone(failure) ? "gone" : "failed";
    }
    if (outcome !== "failed") await settleAfterWrite(queryClient);
    markBusy(userId, -1);
    setOps((current) => current.filter((entry) => entry.id !== op.id));
    if (outcome === "gone") focusGone.current = true;
    toast(
      outcome === "ok"
        ? { tone: "success", message: success }
        : { tone: "error", message: outcome === "gone" ? FLAG_GONE_MESSAGE : FLAG_SAVE_FAILED_MESSAGE },
    );
    return outcome;
  }

  const actions: UserRowActions = {
    pendingFor: (userId) => ops.some((op) => op.userId === userId),
    removingFor: (userId) => ops.some((op) => op.userId === userId && op.kind === "remove"),
    toggle: (user, target) => {
      if (busyUsers.current.has(user.userId)) return;
      void writeUser(
        user.userId,
        "set",
        () => setFeatureFlagUser(flagKey, user.userId, target),
        userSetToast(user.userId, target),
      );
    },
    remove: (user) => {
      if (busyUsers.current.has(user.userId)) return;
      const hadFocus = document.activeElement?.closest(`[data-focus-id="${userRemoveFocus(user.userId)}"]`) != null;
      // The trash button gives way to "Removendo…": focus waits there instead of on <body>.
      if (hadFocus) requestFocus(userRemovingFocus(user.userId));
      void (async () => {
        const outcome = await writeUser(
          user.userId,
          "remove",
          () => removeFeatureFlagUser(flagKey, user.userId),
          userRemovedToast(user.userId),
        );
        if (!hadFocus && !document.activeElement?.matches(`[data-focus-id="${userRemovingFocus(user.userId)}"]`)) return;
        if (outcome === "failed") {
          requestFocus(userRemoveFocus(user.userId));
          return;
        }
        if (outcome === "gone") return;
        // The next row's switch, else the previous row's, else the number field (§10). The list
        // order is the one the admin saw when removing.
        const users: FeatureFlagUser[] = flag?.users ?? [];
        const index = users.findIndex((candidate) => candidate.userId === user.userId);
        const neighbour = users[index + 1] ?? users[index - 1];
        requestFocus(neighbour ? userSwitchFocus(neighbour.userId) : NUMBER_FOCUS);
      })();
    },
  };

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (addingRef.current || !flag) return;
    const parsed = featureFlagUserIdSchema.safeParse(numberText);
    if (!parsed.success) {
      setNumberError(parsed.error.issues[0]?.message);
      return;
    }
    const userId = parsed.data;
    const enabled = setting === "on";
    addingRef.current = true;
    setAdding(true);
    const outcome = await writeUser(
      userId,
      "set",
      () => setFeatureFlagUser(flagKey, userId, enabled),
      userSetToast(userId, enabled),
    );
    addingRef.current = false;
    setAdding(false);
    if (outcome === "ok") {
      setNumberText("");
      requestFocus(NUMBER_FOCUS);
    }
  }

  function everyoneDone(outcome: EveryoneOutcome, target: boolean) {
    setEveryoneSaving(false);
    setDialogTarget(null);
    // Back to the switch that opened it (§10), or to "Flag não encontrada" when the flag is gone.
    if (outcome.gone) focusGone.current = true;
    else requestFocus(EVERYONE_FOCUS);
    toast(
      outcome.gone
        ? { tone: "error", message: FLAG_GONE_MESSAGE }
        : { tone: "success", message: everyoneToast(flagKey, target) },
    );
  }

  // The key isn't in the loaded list: removed by developers, or a mistyped URL (E9, `vJYcq`).
  if (flags && !flag) {
    return (
      <main className="font-base flex w-full flex-col gap-[16px] p-[16px] md:gap-[var(--space-6)] md:p-[var(--space-8)]">
        <BackLink />
        <div className={`${card} flex w-full flex-col items-center gap-[8px] px-[var(--space-5)] py-[56px] text-center`}>
          <span className="flex h-[44px] w-[44px] items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-surface-hover)]">
            <FlagOff aria-hidden="true" width={20} height={20} className="text-[color:var(--color-text-secondary)]" />
          </span>
          <h1
            ref={goneHeading}
            tabIndex={-1}
            className="text-[length:var(--text-base)] font-semibold text-[color:var(--color-text-primary)] outline-none"
          >
            Flag não encontrada
          </h1>
          <p className="text-[13px] text-[color:var(--color-text-secondary)]">
            Ela pode ter sido removida do produto. As outras flags continuam na lista.
          </p>
          <div className="pt-[8px]">
            <Link
              href="/painel/flags"
              className="font-base inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[20px] py-[10px] text-[length:var(--text-base)] font-semibold text-[color:var(--color-primary-text)] transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              Voltar para Feature flags
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const listFailed = isError && !data;
  const header = (
    <div className="flex w-full flex-col gap-[16px] md:flex-row md:items-start md:justify-between md:gap-[32px]">
      <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
        <FlagTitle flagKey={flag?.key ?? flagKey} />
        {flag ? (
          <p className="text-[length:var(--text-base)] leading-[1.5] whitespace-pre-line text-[color:var(--color-text-secondary)]">
            {flag.description}
          </p>
        ) : (
          isPending && (
            <span className="flex flex-col gap-[8px] pt-[4px]">
              <SkeletonLine width="80%" />
              <SkeletonLine width="55%" />
            </span>
          )
        )}
      </div>
      {!listFailed && (
        <EveryoneCard flag={flag} pending={everyoneSaving} onToggle={(target) => setDialogTarget(target)} />
      )}
    </div>
  );

  if (listFailed) {
    return (
      <main className="font-base flex w-full flex-col gap-[16px] p-[16px] md:gap-[var(--space-6)] md:p-[var(--space-8)]">
        <BackLink />
        {header}
        <div className={card}>
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
        </div>
      </main>
    );
  }

  const users: FeatureFlagUser[] | undefined = flag?.users;
  return (
    <main className="font-base flex w-full flex-col gap-[16px] p-[16px] md:gap-[var(--space-6)] md:p-[var(--space-8)]">
      <BackLink />
      {header}

      <form
        noValidate
        onSubmit={(event) => void add(event)}
        className={`${card} flex w-full flex-col gap-[14px] p-[20px]`}
      >
        <h2 className="text-[length:var(--text-base)] font-semibold text-[color:var(--color-text-primary)]">
          Dar configuração própria a um usuário
        </h2>
        <div className="flex w-full flex-col gap-[12px] md:flex-row md:items-start md:gap-[16px]">
          <TextField
            label="Número do usuário"
            inputMode="numeric"
            autoComplete="off"
            value={numberText}
            error={numberError}
            disabled={!flag}
            data-focus-id={NUMBER_FOCUS}
            onChange={(event) => {
              setNumberText(event.target.value);
              setNumberError(undefined);
            }}
            className="w-full md:w-[220px]"
          />
          <Dropdown
            label="Configuração"
            options={SETTING_OPTIONS}
            value={setting}
            onChange={setSetting}
            disabled={!flag}
            className="w-full md:w-[180px]"
          />
          <div className="md:pt-[21px]">
            <Button
              type="submit"
              loading={adding}
              aria-disabled={adding || undefined}
              disabled={!flag}
            >
              Adicionar
            </Button>
          </div>
        </div>
        <p className="text-[12px] text-[color:var(--color-text-tertiary)]">
          O número não é conferido e o nome do usuário não aparece aqui: confira antes de adicionar. Se o usuário já
          tiver configuração própria, ela é substituída.
        </p>
      </form>

      <DataTable
        label="Usuários com configuração própria"
        header={
          <div className="flex items-center gap-[8px] px-[20px] py-[14px]">
            <h2 className="text-[length:var(--text-base)] font-semibold text-[color:var(--color-text-primary)]">
              Usuários com configuração própria
            </h2>
            {users && <span className="text-[13px] text-[color:var(--color-text-tertiary)]">{users.length}</span>}
          </div>
        }
        columns={[
          {
            key: "user",
            header: "Usuário",
            minWidth: 160,
            cell: (user: FeatureFlagUser) => (
              <span className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">
                {userLabel(user.userId)}
              </span>
            ),
          },
          {
            key: "setting",
            header: "Configuração",
            width: 200,
            cell: (user: FeatureFlagUser) => <UserSwitch user={user} actions={actions} />,
          },
          {
            key: "actions",
            header: "",
            width: 130,
            align: "end",
            cell: (user: FeatureFlagUser) => <UserActions user={user} actions={actions} />,
          },
        ]}
        rows={users}
        rowKey={(user) => user.userId}
        loading={isPending}
        loadingRows={3}
        mobileRow={(user) => (
          <div className="flex w-full items-center gap-[12px] px-[14px] py-[12px]">
            <span className="flex min-w-0 flex-1 flex-col gap-[8px]">
              <span className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">
                {userLabel(user.userId)}
              </span>
              <UserSwitch user={user} actions={actions} />
            </span>
            <UserActions user={user} actions={actions} />
          </div>
        )}
        empty={
          <DataTableMessage
            icon={Users}
            title="Nenhum usuário com configuração própria"
            description="Todos seguem a configuração para todos."
          />
        }
      />

      {dialogTarget !== null && flag && (
        <FeatureFlagEveryoneDialog
          flagKey={flag.key}
          target={dialogTarget}
          onPending={setEveryoneSaving}
          onSaved={() => settleAfterWrite(queryClient)}
          onDone={(outcome) => everyoneDone(outcome, dialogTarget)}
          onClose={() => {
            setDialogTarget(null);
            requestFocus(EVERYONE_FOCUS);
          }}
        />
      )}
    </main>
  );
}
