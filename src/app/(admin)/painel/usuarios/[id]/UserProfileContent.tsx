"use client";

import Link from "next/link";
import { ArrowUpRight, Ban, ChevronRight, CircleAlert, KeyRound, Lock, MailPlus, RotateCcw, Unlink, type LucideIcon } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, DataTableMessage, SkeletonCircle, SkeletonLine, Spinner, useToast } from "@/components/ui";
import { AccountStatusDialog } from "@/components/domain/AccountStatusDialog";
import { AdminEndRelationshipDialog } from "@/components/domain/AdminEndRelationshipDialog";
import { RoleAvatar } from "@/components/domain/RoleAvatar";
import { RoleBadge, StatusBadge } from "@/components/domain/UserBadges";
import { emailErrorMessage, emailSentMessage, type AccountEmail } from "@/lib/admin/account";
import { historyPathFor } from "@/lib/admin/history";
import { lastActiveLabel, profilePath, statusLabel, suspensionNotice } from "@/lib/admin/users";
import { adminKeys, adminProfileQuery, fetchAdminActions } from "@/lib/api/admin";
import { sendAdminFirstAccessEmail, sendAdminPasswordResetEmail } from "@/lib/api/adminAccount";
import type { AdminClientProfile, AdminRelationship, AdminTrainerProfile, AdminUserProfile } from "@/lib/api/types";
import { formatCount, formatInstantDate } from "@/lib/format";
import { useRedirectOnError } from "@/lib/hooks/useRedirectOnError";

/** How many current clients a trainer's card lists before "Ver todos os N alunos". */
export const CLIENTS_PREVIEW = 4;

function Card({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex w-full flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex w-full items-center justify-between border-b border-[var(--color-border)] px-[20px] py-[14px]">
        <h2 className="font-heading text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
          {title}
        </h2>
        {aside}
      </div>
      <div className="flex w-full flex-col gap-[14px] p-[20px]">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-[3px]">
      <dt className="text-[11px] text-[color:var(--color-text-tertiary)]">{label}</dt>
      <dd className="text-[13px] break-words text-[color:var(--color-text-primary)]">{value}</dd>
    </div>
  );
}

function SubHead({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold tracking-[0.6px] text-[color:var(--color-text-tertiary)] uppercase">
      {children}
    </h3>
  );
}

/** "Desde 02/06/2026" for a current relationship, "10/01/2026 – 01/06/2026" for a past one. */
function period(relationship: AdminRelationship): string {
  const start = formatInstantDate(relationship.startedAt);
  return relationship.endedAt ? `${start} – ${formatInstantDate(relationship.endedAt)}` : `Desde ${start}`;
}

/** A person on the other side of a relationship: a link to their profile (R37) and the period. */
function PersonLink({ relationship }: { relationship: AdminRelationship }) {
  return (
    <li className="flex w-full items-center justify-between gap-[12px]">
      <Link
        href={profilePath(relationship.user.id)}
        className="flex min-w-0 items-center gap-[4px] text-[13px] font-semibold text-[color:var(--color-primary)] hover:underline"
      >
        <span className="truncate">{relationship.user.name}</span>
        <ArrowUpRight aria-hidden="true" width={13} height={13} className="shrink-0" />
        {relationship.suspended && <span className="sr-only"> (suspenso)</span>}
      </Link>
      <span className="shrink-0 text-[12px] text-[color:var(--color-text-tertiary)]">{period(relationship)}</span>
    </li>
  );
}

function PeopleList({ people, empty }: { people: AdminRelationship[]; empty: string }) {
  if (people.length === 0) {
    return <p className="text-[13px] text-[color:var(--color-text-tertiary)]">{empty}</p>;
  }
  return (
    <ul className="flex w-full flex-col gap-[14px]">
      {people.map((relationship) => (
        <PersonLink key={`${relationship.user.id}-${relationship.startedAt}`} relationship={relationship} />
      ))}
    </ul>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[2px] rounded-[var(--radius-md)] bg-[var(--color-bg)] p-[12px]">
      <span className="font-heading text-[22px] font-bold text-[color:var(--color-text-primary)]">
        {formatCount(value)}
      </span>
      <span className="text-[11px] text-[color:var(--color-text-secondary)]">{label}</span>
    </div>
  );
}

function ActivityCard({ counts, lastActiveOn }: { counts: { value: number; label: string }[]; lastActiveOn: string | null }) {
  return (
    <Card title="Atividade">
      <div className="flex w-full gap-[12px]">
        {counts.map((count) => (
          <Count key={count.label} {...count} />
        ))}
      </div>
      <dl>
        <Field label="Última atividade" value={lastActiveLabel(lastActiveOn)} />
      </dl>
    </Card>
  );
}

const SEND_EMAIL: Record<AccountEmail, (id: number) => Promise<void>> = {
  "first-access": sendAdminFirstAccessEmail,
  "password-reset": sendAdminPasswordResetEmail,
};

/** One of the `Ações` card's full-width actions (frames `fp164`, `d4tAve`). */
function ActionButton({
  icon: Icon,
  label,
  danger = false,
  busy = false,
  disabled = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`flex w-full items-center gap-[10px] rounded-[var(--radius-md)] border px-[14px] py-[10px] text-left text-[13px] font-semibold transition-colors hover:bg-[var(--color-surface-hover)] disabled:pointer-events-none disabled:opacity-60 ${
        danger
          ? "border-[#FF5C5C66] text-[color:var(--color-danger)]"
          : "border-[var(--color-border-strong)] text-[color:var(--color-text-primary)]"
      }`}
    >
      {busy ? (
        <Spinner size="sm" className="!h-[16px] !w-[16px] shrink-0" />
      ) : (
        <Icon
          aria-hidden="true"
          width={16}
          height={16}
          className={`shrink-0 ${danger ? "text-[color:var(--color-danger)]" : "text-[color:var(--color-text-secondary)]"}`}
        />
      )}
      {label}
    </button>
  );
}

/**
 * The `Ações` card (frames `fp164`, `d4tAve`): "Suspender" or "Reativar" (a dialog with a required
 * reason), "Enviar e-mail de primeiro acesso" (clients only) and "Enviar e-mail de redefinição de
 * senha". An e-mail goes out on the click, with no confirm: one request at a time, then a toast
 * naming the address (R49) or saying why it didn't go (switched off, unavailable, rate limited).
 * The footnote's "Histórico" opens the history filtered to this user.
 */
function ActionsCard({ profile, onChanged }: { profile: AdminUserProfile; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [statusDialog, setStatusDialog] = useState(false);
  const [sending, setSending] = useState<AccountEmail | null>(null);
  // `sending` is state: a second click in the same tick would still see it null.
  const sendingRef = useRef(false);

  async function send(kind: AccountEmail) {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(kind);
    try {
      await SEND_EMAIL[kind](profile.id);
      void queryClient.invalidateQueries({ queryKey: adminKeys.actions() });
      toast({ tone: "success", message: emailSentMessage(kind, profile.email) });
    } catch (error) {
      toast({ tone: "error", message: emailErrorMessage(error) });
    } finally {
      sendingRef.current = false;
      setSending(null);
    }
  }

  return (
    <Card title="Ações">
      {profile.suspended ? (
        <ActionButton icon={RotateCcw} label="Reativar" onClick={() => setStatusDialog(true)} />
      ) : (
        <ActionButton icon={Ban} label="Suspender" danger onClick={() => setStatusDialog(true)} />
      )}
      {profile.role === "CLIENT" && (
        <ActionButton
          icon={MailPlus}
          label="Enviar e-mail de primeiro acesso"
          busy={sending === "first-access"}
          disabled={sending !== null}
          onClick={() => void send("first-access")}
        />
      )}
      <ActionButton
        icon={KeyRound}
        label="Enviar e-mail de redefinição de senha"
        busy={sending === "password-reset"}
        disabled={sending !== null}
        onClick={() => void send("password-reset")}
      />
      <p className="text-[11px] text-[color:var(--color-text-tertiary)]">
        Toda ação fica registrada no{" "}
        <Link href={historyPathFor(profile.id)} className="font-semibold text-[color:var(--color-primary)] hover:underline">
          Histórico
        </Link>
        .
      </p>
      {statusDialog && (
        <AccountStatusDialog
          action={profile.suspended ? "reactivate" : "suspend"}
          user={profile}
          onClose={() => setStatusDialog(false)}
          onChanged={onChanged}
        />
      )}
    </Card>
  );
}

function ProfileDataCard({ profile }: { profile: AdminUserProfile }) {
  const fields: { label: string; value: string }[] = [
    { label: "Nome", value: profile.name },
    { label: "E-mail", value: profile.email },
    { label: "CPF", value: profile.cpf ?? "—" },
  ];
  if (profile.role === "TRAINER") {
    fields.push({ label: "CREF", value: profile.cref ?? "—" });
    // Shared contacts appear only when the trainer shares them (null otherwise).
    if (profile.whatsapp !== null) fields.push({ label: "WhatsApp (contato compartilhado)", value: profile.whatsapp });
    if (profile.instagram !== null) fields.push({ label: "Instagram (contato compartilhado)", value: profile.instagram });
  }
  fields.push(
    { label: "Cadastro em", value: formatInstantDate(profile.createdAt) },
    { label: "Status", value: statusLabel(profile.suspended) },
  );
  return (
    <Card
      title="Dados do perfil"
      aside={
        <span className="flex items-center gap-[6px] text-[12px] text-[color:var(--color-text-tertiary)]">
          <Lock aria-hidden="true" width={13} height={13} />
          Somente leitura
        </span>
      }
    >
      <dl className="grid w-full grid-cols-1 gap-x-[24px] gap-y-[14px] sm:grid-cols-2">
        {fields.map((field) => (
          <Field key={field.label} {...field} />
        ))}
      </dl>
    </Card>
  );
}

/**
 * The client's current trainer (`fp164`): the link and "Desde …", and "Encerrar vínculo com
 * treinador", which asks first (`x81nY`) and ends the relationship with both ids from the profile.
 */
function CurrentTrainer({
  client,
  relationship,
  onChanged,
}: {
  client: AdminClientProfile;
  relationship: AdminRelationship;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-[12px] pb-[6px]">
      <div className="flex min-w-0 flex-col gap-[3px]">
        <Link
          href={profilePath(relationship.user.id)}
          className="flex min-w-0 items-center gap-[4px] text-[13px] font-semibold text-[color:var(--color-primary)] hover:underline"
        >
          <span className="truncate">{relationship.user.name}</span>
          <ArrowUpRight aria-hidden="true" width={13} height={13} className="shrink-0" />
          {relationship.suspended && <span className="sr-only"> (suspenso)</span>}
        </Link>
        <span className="text-[12px] text-[color:var(--color-text-tertiary)]">{period(relationship)}</span>
      </div>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex shrink-0 items-center gap-[8px] rounded-[var(--radius-md)] border border-[#FF5C5C66] px-[12px] py-[8px] text-[12px] font-semibold text-[color:var(--color-danger)] transition-colors hover:bg-[var(--color-surface-hover)]"
      >
        <Unlink aria-hidden="true" width={14} height={14} />
        Encerrar vínculo com treinador
      </button>
      {confirming && (
        <AdminEndRelationshipDialog
          client={client}
          trainer={relationship.user}
          onClose={() => setConfirming(false)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

function clientColumns(profile: AdminClientProfile, onChanged: () => void) {
  return {
    left: (
      <Card title="Treinadores">
        <SubHead>Treinador atual</SubHead>
        {profile.currentTrainer ? (
          <CurrentTrainer client={profile} relationship={profile.currentTrainer} onChanged={onChanged} />
        ) : (
          <PeopleList people={[]} empty="Sem treinador" />
        )}
        <SubHead>Treinadores anteriores</SubHead>
        <PeopleList people={profile.pastTrainers} empty="Nenhum treinador anterior." />
      </Card>
    ),
    counts: [
      { value: profile.planCount, label: "Planos" },
      { value: profile.completedWorkoutCount, label: "Treinos concluídos" },
    ],
  };
}

function ProfileLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando perfil" className="flex w-full flex-col gap-[var(--space-6)]">
      <div className="flex items-center gap-[16px]">
        <SkeletonCircle size={56} />
        <div className="flex flex-col gap-[8px]">
          <SkeletonLine width={220} height={22} />
          <SkeletonLine width={180} height={12} />
        </div>
      </div>
      <div className="flex w-full flex-col gap-[var(--space-6)] lg:flex-row">
        <div className="h-[240px] flex-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]" />
        <div className="h-[160px] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] lg:w-[340px]" />
      </div>
    </div>
  );
}

/** The trainer profile (a component of its own: it keeps the "Ver todos" state). */
function TrainerProfileBody({
  profile,
  header,
  onChanged,
}: {
  profile: AdminTrainerProfile;
  header: ReactNode;
  onChanged: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const current = profile.currentClients;
  const visible = showAll ? current : current.slice(0, CLIENTS_PREVIEW);
  const counts = [
    { value: profile.planCount, label: "Planos" },
    { value: profile.workoutCount, label: "Treinos" },
    { value: profile.privateExerciseCount, label: "Exercícios privados" },
  ];
  return (
    <ProfileLayout
      header={header}
      profile={profile}
      onChanged={onChanged}
      right={<ActivityCard counts={counts} lastActiveOn={profile.lastActiveOn} />}
      left={
        <>
          <Card title={`Alunos atuais (${current.length})`}>
            <PeopleList people={visible} empty="Nenhum aluno no momento." />
            {!showAll && current.length > CLIENTS_PREVIEW && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="flex w-fit items-center gap-[4px] text-[13px] font-semibold text-[color:var(--color-primary)] hover:underline"
              >
                Ver todos os {current.length} alunos
                <ChevronRight aria-hidden="true" width={13} height={13} />
              </button>
            )}
          </Card>
          <Card title={`Alunos anteriores (${profile.formerClients.length})`}>
            <PeopleList people={profile.formerClients} empty="Nenhum aluno anterior." />
          </Card>
        </>
      }
    />
  );
}

function ProfileLayout({
  header,
  left,
  right,
  profile,
  onChanged,
}: {
  header: ReactNode;
  left: ReactNode;
  right: ReactNode;
  profile: AdminUserProfile;
  onChanged: () => void;
}) {
  return (
    <>
      {header}
      {profile.suspended && <SuspendedBanner profile={profile} />}
      <div className="flex w-full flex-col gap-[var(--space-6)] lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-6)]">
          <ProfileDataCard profile={profile} />
          {left}
        </div>
        <div className="flex w-full flex-col gap-[var(--space-6)] lg:w-[340px] lg:shrink-0">
          {right}
          <ActionsCard profile={profile} onChanged={onChanged} />
        </div>
      </div>
    </>
  );
}

/**
 * The `d4tAve` banner of a suspended account: who suspended it, when and why, from the newest
 * `SUSPEND_USER` history entry (`["admin", "actions", "suspension", id]`, fetched only while the
 * account is suspended), or `suspendedAt` alone until then or without one.
 */
function SuspendedBanner({ profile }: { profile: AdminUserProfile }) {
  const { data } = useQuery({
    queryKey: adminKeys.suspension(profile.id),
    queryFn: () =>
      fetchAdminActions({ targetUserId: profile.id, action: "SUSPEND_USER" }, { limit: 10, cursor: null }),
    enabled: profile.suspended,
  });
  return (
    <div
      role="status"
      className="flex w-full items-center gap-[10px] rounded-[var(--radius-md)] border border-[#FF5C5C66] bg-[#FF5C5C1A] px-[16px] py-[12px]"
    >
      <Ban aria-hidden="true" width={16} height={16} className="shrink-0 text-[color:var(--color-danger)]" />
      <p className="text-[13px] text-[color:var(--color-danger)]">{suspensionNotice(profile, data?.entries[0])}</p>
    </div>
  );
}

/**
 * A trainer's or client's profile, read only (admin-panel spec §7, W16, R33–R38; pen.dev `M3SiW`,
 * `eUOyS`): the account's data with the CPF masked as the BFF sends it, who trains whom (each
 * person links to their own profile, R37) and the counts, plus the account actions (VRT-29). No edit
 * controls on the data, and no logs, weights,
 * feedback or plan contents, which the contract doesn't carry. The frame's "Telefone" and the time
 * in "Hoje, 07:40" are left out (§7.1).
 *
 * `GET /admin/users/:id` writes a `VIEW_USER_PROFILE` history entry on every call, so the query
 * runs once per opening of the page and never on its own (`adminProfileQuery`). A 404 (a missing
 * or deleted user, or an admin) goes back to the directory.
 */
export function UserProfileContent({ userId }: { userId: number }) {
  const { data: profile, error, isError, refetch, isFetching } = useQuery(adminProfileQuery(userId));
  useRedirectOnError(error, "/painel/usuarios");
  // After suspend, reactivate or end-relationship: the one explicit refetch of the profile (W16,
  // §9). It writes one more history entry, truthfully: the admin is looking at it.
  const profileChanged = () => void refetch();

  const breadcrumb = (
    <nav aria-label="Trilha" className="flex items-center gap-[6px] text-[12px]">
      <Link href="/painel/usuarios" className="font-semibold text-[color:var(--color-primary)] hover:underline">
        Usuários
      </Link>
      <ChevronRight aria-hidden="true" width={12} height={12} className="text-[color:var(--color-text-tertiary)]" />
      <span aria-current="page" className="text-[color:var(--color-text-secondary)]">
        {profile?.name ?? "Perfil"}
      </span>
    </nav>
  );

  let body: ReactNode;
  if (profile) {
    const header = (
      <div className="flex w-full items-center gap-[16px]">
        <RoleAvatar name={profile.name} role={profile.role} size="lg" />
        <div className="flex min-w-0 flex-col gap-[6px]">
          <div className="flex flex-wrap items-center gap-[10px]">
            <h1 className="font-heading text-[length:var(--text-xl)] font-bold break-words text-[color:var(--color-text-primary)] md:text-[length:var(--text-2xl)]">
              {profile.name}
            </h1>
            <RoleBadge role={profile.role} />
            <StatusBadge suspended={profile.suspended} />
          </div>
          <span className="text-[13px] break-all text-[color:var(--color-text-secondary)]">{profile.email}</span>
        </div>
      </div>
    );
    if (profile.role === "TRAINER") {
      body = <TrainerProfileBody profile={profile} header={header} onChanged={profileChanged} />;
    } else {
      const { left, counts } = clientColumns(profile, profileChanged);
      body = (
        <ProfileLayout
          header={header}
          left={left}
          right={<ActivityCard counts={counts} lastActiveOn={profile.lastActiveOn} />}
          profile={profile}
          onChanged={profileChanged}
        />
      );
    }
  } else if (isError) {
    body = (
      <div className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <DataTableMessage
          role="alert"
          icon={CircleAlert}
          title="Não foi possível carregar o perfil"
          description="Verifique sua conexão e tente novamente."
          action={
            <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          }
        />
      </div>
    );
  } else {
    body = <ProfileLoading />;
  }

  return (
    <main className="font-base flex w-full flex-col gap-[16px] p-[16px] md:gap-[var(--space-6)] md:p-[var(--space-8)]">
      {breadcrumb}
      {body}
    </main>
  );
}
