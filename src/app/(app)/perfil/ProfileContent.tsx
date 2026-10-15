"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteAccountDialog, type DeleteAccountApi } from "@/components/domain/DeleteAccountDialog";
import { Button, PageLoadingOverlay, TextField } from "@/components/ui";
import { exportMyData, updateMe, type UpdateMeInput } from "@/lib/api/auth";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { rateLimitedMessage } from "@/lib/api/rateLimit";
import type { Me } from "@/lib/api/types";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { saveFile } from "@/lib/download";
import { maskCpf } from "@/lib/masks/cpf";
import {
  profileChanges,
  profileDefaults,
  profileSchema,
  type ProfileInput,
} from "@/lib/validation/profile";

export interface ProfileApi {
  updateMe: typeof updateMe;
  exportMyData: typeof exportMyData;
  saveFile: typeof saveFile;
  /** For "Excluir conta"; the dialog's own defaults when omitted. */
  deleteAccount?: DeleteAccountApi;
}

const defaultApi: ProfileApi = { updateMe, exportMyData, saveFile };

/** "Meu perfil": the caller's own account (`/auth/me`), its export and its deletion. */
export function ProfileContent({ api = defaultApi }: { api?: ProfileApi }) {
  const { data: me } = useCurrentUser();

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-[var(--space-6)] px-[var(--space-8)] py-[var(--space-8)]">
      <div className="flex flex-col gap-[6px]">
        <h1 className="font-heading text-[length:var(--text-2xl)] font-bold text-[color:var(--color-text-primary)]">
          Meu perfil
        </h1>
        <p className="text-[length:var(--text-base)] text-[color:var(--color-text-secondary)]">
          Veja e corrija seus dados, baixe uma cópia ou exclua sua conta.
        </p>
      </div>

      {me ? (
        <>
          {/* Keyed on the account: the form's defaults are read once, from this `me`. */}
          <ProfileForm key={me.id} me={me} api={api} />
          <ExportSection api={api} />
          <DeleteSection me={me} api={api} />
        </>
      ) : (
        <div className="relative flex min-h-[240px] w-full">
          <PageLoadingOverlay text="Carregando..." />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="flex w-full flex-col gap-[var(--space-4)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-6)]"
    >
      <div className="flex flex-col gap-[4px]">
        <h2 className="font-heading text-[length:var(--text-lg)] font-semibold text-[color:var(--color-text-primary)]">
          {title}
        </h2>
        {description && (
          <p className="text-[length:var(--text-sm)] leading-[1.5] text-[color:var(--color-text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]"
    >
      {children}
    </div>
  );
}

function ProfileForm({ me, api }: { me: Me; api: ProfileApi }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const isTrainer = me.role === "TRAINER";

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileDefaults(me),
  });
  const newCpf = useWatch({ control, name: "newCpf" });

  const save = useMutation({
    mutationFn: (changes: UpdateMeInput) => api.updateMe(changes),
    onSuccess: (updated) => {
      queryClient.setQueryData<Me>(["me"], updated);
      reset(profileDefaults(updated));
      setSaved(true);
    },
  });

  return (
    <Section title="Dados pessoais">
      <form
        noValidate
        onSubmit={handleSubmit((values) => {
          setSaved(false);
          const changes = profileChanges(me, values);
          if (Object.keys(changes).length === 0) return;
          save.mutate(changes);
        })}
        className="flex w-full flex-col gap-[var(--space-4)]"
      >
        {save.isError && (
          <ErrorBanner>{apiErrorMessage(save.error, "Não foi possível salvar o perfil")}</ErrorBanner>
        )}
        <TextField label="Nome" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          helpText="A troca vale na hora: o novo e-mail passa a ser o seu login, sem confirmação."
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Novo CPF"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          helpText={
            me.cpf
              ? `CPF cadastrado: ${me.cpf}. Deixe em branco para mantê-lo.`
              : "Nenhum CPF cadastrado."
          }
          error={errors.newCpf?.message}
          value={newCpf}
          onChange={(event) =>
            setValue("newCpf", maskCpf(event.target.value), { shouldDirty: true, shouldValidate: true })
          }
        />
        {isTrainer && (
          <TextField
            label="CREF (opcional)"
            placeholder="000000-G/UF"
            error={errors.cref?.message}
            {...register("cref")}
          />
        )}
        <div className="flex w-full items-center justify-end gap-[var(--space-3)]">
          {saved && !isDirty && (
            <span role="status" className="text-[13px] text-[color:var(--color-success)]">
              Perfil atualizado
            </span>
          )}
          <Button type="submit" loading={save.isPending} disabled={!isDirty || save.isPending}>
            Salvar alterações
          </Button>
        </div>
      </form>
    </Section>
  );
}

/** 429 says when to try again (`Retry-After`); 413 TOO_LARGE has its own copy in `errorMessages`. */
function exportErrorMessage(error: unknown): string {
  return (
    rateLimitedMessage(error, "Limite de exportações atingido.") ??
    apiErrorMessage(error, "Não foi possível exportar seus dados. Tente novamente.")
  );
}

function ExportSection({ api }: { api: ProfileApi }) {
  const exportData = useMutation({
    mutationFn: () => api.exportMyData(),
    onSuccess: (file) => api.saveFile(file),
  });

  return (
    <Section
      title="Exportar meus dados"
      description="Baixe uma cópia dos seus dados (perfil, consentimentos, vínculos, planos e treinos registrados) em um arquivo JSON."
    >
      {exportData.isError && <ErrorBanner>{exportErrorMessage(exportData.error)}</ErrorBanner>}
      <div className="flex w-full justify-end">
        <Button
          type="button"
          variant="outline"
          loading={exportData.isPending}
          disabled={exportData.isPending}
          onClick={() => exportData.mutate()}
        >
          Exportar meus dados
        </Button>
      </div>
    </Section>
  );
}

function DeleteSection({ me, api }: { me: Me; api: ProfileApi }) {
  const [open, setOpen] = useState(false);

  return (
    <Section
      title="Excluir conta"
      description={
        me.role === "TRAINER"
          ? "Exclui sua conta e seus dados pessoais. Antes, encerre o acompanhamento de cada aluno."
          : "Exclui sua conta e seus dados pessoais."
      }
    >
      <div className="flex w-full justify-end">
        <Button type="button" variant="danger" onClick={() => setOpen(true)}>
          Excluir conta
        </Button>
      </div>
      {open && (
        <DeleteAccountDialog role={me.role} onClose={() => setOpen(false)} api={api.deleteAccount} />
      )}
    </Section>
  );
}
