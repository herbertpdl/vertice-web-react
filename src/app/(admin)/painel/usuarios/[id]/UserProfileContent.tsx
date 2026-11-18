"use client";

import Link from "next/link";
import { ArrowUpRight, Ban, ChevronRight, CircleAlert, Lock } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, DataTableMessage, SkeletonCircle, SkeletonLine } from "@/components/ui";
import { RoleAvatar } from "@/components/domain/RoleAvatar";
import { RoleBadge, StatusBadge } from "@/components/domain/UserBadges";
import { historyPathFor } from "@/lib/admin/history";
import { lastActiveLabel, statusLabel, suspensionNotice } from "@/lib/admin/users";
import { adminKeys, adminProfileQuery, fetchAdminActions } from "@/lib/api/admin";
import type { AdminClientProfile, AdminRelationship, AdminTrainerProfile, AdminUserProfile } from "@/lib/api/types";
import { formatCount, formatInstantDate } from "@/lib/format";
import { useRedirectOnError } from "@/lib/hooks/useRedirectOnError";

/** How many current clients a trainer's card lists before "Ver todos os N alunos". */
export const CLIENTS_PREVIEW = 4;

const profilePath = (id: number) => `/painel/usuarios/${id}`;

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

/**
 * The `Ações` card (frames `M3SiW`, `eUOyS`). VRT-26 ships only its footnote, whose "Histórico"
 * opens the history filtered to this user; VRT-29 adds the suspend / reactivate and e-mail
 * buttons above it.
 */
function ActionsCard({ profile }: { profile: AdminUserProfile }) {
  return (
    <Card title="Ações">
      <p className="text-[11px] text-[color:var(--color-text-tertiary)]">
        Toda ação fica registrada no{" "}
        <Link href={historyPathFor(profile.id)} className="font-semibold text-[color:var(--color-primary)] hover:underline">
          Histórico
        </Link>
        .
      </p>
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

function clientColumns(profile: AdminClientProfile) {
  return {
    left: (
      <Card title="Treinadores">
        <SubHead>Treinador atual</SubHead>
        <PeopleList people={profile.currentTrainer ? [profile.currentTrainer] : []} empty="Sem treinador" />
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
function TrainerProfileBody({ profile, header }: { profile: AdminTrainerProfile; header: ReactNode }) {
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
}: {
  header: ReactNode;
  left: ReactNode;
  right: ReactNode;
  profile: AdminUserProfile;
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
          <ActionsCard profile={profile} />
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
 * person links to their own profile, R37) and the counts. No edit controls, and no logs, weights,
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
      body = <TrainerProfileBody profile={profile} header={header} />;
    } else {
      const { left, counts } = clientColumns(profile);
      body = (
        <ProfileLayout
          header={header}
          left={left}
          right={<ActivityCard counts={counts} lastActiveOn={profile.lastActiveOn} />}
          profile={profile}
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
