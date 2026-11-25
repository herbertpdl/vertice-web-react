"use client";

import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, CircleX, Lock, NotebookPen, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { anamneseQueryKey, fetchAnamnese, saveAnamnese } from "@/lib/api/anamnese";
import { anamneseNoticeKeyPrefix, assistantStatusQueryKey, fetchAssistantStatus } from "@/lib/api/assistant";
import type { ClientAnamnese } from "@/lib/api/types";
import { adoptServer, editDraft, isDirty, rebaseOnSave, seedDraft, type AnamneseDraft } from "@/lib/anamnese/draft";
import { formatInstantDate } from "@/lib/format";
import { ANAMNESE_MAX } from "@/lib/validation/bounds";
import { anamneseExcess, anamneseLength } from "@/lib/validation/anamnese";

const numberFormat = new Intl.NumberFormat("pt-BR");

/** R17: suggestions only (R18); the box is free text with a placeholder, never a template. */
const TOPICS: [string, string][] = [
  ["Objetivo", "Ex.: emagrecer, ganhar massa, correr 10 km"],
  ["Histórico de saúde", "Ex.: pressão alta, diabetes, cirurgias"],
  ["Lesões e dores", "Ex.: dor no joelho ao agachar"],
  ["Medicamentos", "Ex.: remédio para pressão, todo dia de manhã"],
  ["Limitações", "Ex.: evitar impacto, pouca mobilidade no ombro"],
  ["Rotina e disponibilidade", "Ex.: treina 3 vezes por semana, às 7h"],
  ["Experiência com treino", "Ex.: musculação há 1 ano, nunca correu"],
];

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

const cardClass =
  "flex w-full flex-col gap-[var(--space-4)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--space-6)]";

function ExplanationRow({ icon, tone, children }: { icon: React.ReactNode; tone: "primary" | "ai" | "muted"; children: React.ReactNode }) {
  const badge =
    tone === "primary"
      ? "bg-[#00e5ff1a] text-[color:var(--color-primary)]"
      : tone === "ai"
        ? "bg-[#7c4dff33] text-[color:var(--color-secondary-hover)]"
        : "bg-[var(--color-surface-active)] text-[color:var(--color-text-secondary)]";
  return (
    <li className="flex w-full gap-[12px]">
      <span className={`flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[var(--radius-full)] ${badge}`}>
        {icon}
      </span>
      <span className="pt-[4px] text-[13px] leading-[1.5] text-[color:var(--color-text-secondary)]">{children}</span>
    </li>
  );
}

/** The side column: what the anamnese is for (R16, R39, F9) and what to write (R17, R18). */
function GuideColumn({ clientName, aiOn }: { clientName: string; aiOn: boolean }) {
  const first = firstName(clientName);
  return (
    <div className="flex w-full shrink-0 flex-col gap-[var(--space-4)] xl:w-[400px]">
      <section className={cardClass}>
        <h2 className="font-heading text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
          Para que serve a anamnese
        </h2>
        <ul className="flex flex-col gap-[var(--space-4)]">
          <ExplanationRow tone="primary" icon={<NotebookPen width={14} height={14} aria-hidden />}>
            Anote aqui o que você sabe sobre a saúde e o histórico de treino de {first}.
          </ExplanationRow>
          <ExplanationRow tone="primary" icon={<RefreshCw width={14} height={14} aria-hidden />}>
            Atualize sempre que algo mudar, como uma dor nova ou um novo objetivo.
          </ExplanationRow>
          {aiOn && (
            <ExplanationRow tone="ai" icon={<Sparkles width={14} height={14} aria-hidden />}>
              O Assistente IA lê este texto quando monta ou altera os treinos de {first}.
            </ExplanationRow>
          )}
          <ExplanationRow tone="muted" icon={<Lock width={14} height={14} aria-hidden />}>
            Só você vê no app. {first} não vê este texto no aplicativo, mas pode recebê-lo se pedir uma
            cópia dos seus dados.
          </ExplanationRow>
        </ul>
      </section>
      <section className={cardClass}>
        <div className="flex flex-col gap-[4px]">
          <h2 className="font-heading text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
            O que escrever
          </h2>
          <p className="text-[13px] text-[color:var(--color-text-secondary)]">
            Sugestões de temas. Use só o que fizer sentido, na ordem que preferir.
          </p>
        </div>
        <ul className="flex flex-col gap-[12px]">
          {TOPICS.map(([name, example]) => (
            <li key={name} className="flex gap-[10px]">
              <span className="flex h-[18px] items-center">
                <span className="h-[6px] w-[6px] rounded-[var(--radius-full)] bg-[var(--color-primary)]" aria-hidden />
              </span>
              <span className="flex flex-col gap-[2px]">
                <span className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">{name}</span>
                <span className="text-[12px] text-[color:var(--color-text-tertiary)]">{example}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function saveErrorText(error: unknown): { text: string; retry: boolean } {
  if (error instanceof ApiError && (error.code === "FORBIDDEN" || error.code === "NOT_FOUND")) {
    // The relationship ended mid-edit (R7): saving can't work any more, the text stays to copy.
    return { text: "Você não acompanha mais este aluno. Seu texto continua aqui.", retry: false };
  }
  return { text: "Não foi possível salvar a anamnese. Seu texto continua aqui.", retry: true };
}

export interface AnamneseTabProps {
  clientId: number;
  clientName: string;
  /** Whether there are unsaved changes, for the page's leave guard (R15). `false` on unmount. */
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * The client's anamnese (client-anamnese spec D2–D8; frames `dqvZj`…`h49po`): one free text saved
 * only on "Salvar" (R12), with the explanation and suggested topics beside it.
 */
export function AnamneseTab({ clientId, clientName, onDirtyChange }: AnamneseTabProps) {
  const queryClient = useQueryClient();
  const textareaId = useId();
  const counterId = useId();
  const queryKey = anamneseQueryKey(clientId);
  const { data, isPending, isError, refetch, isRefetching } = useQuery({
    queryKey,
    queryFn: () => fetchAnamnese(clientId),
  });
  // R39: the AI sentence only once the BFF says the assistant is on; pending or failed hides it.
  const { data: assistantStatus } = useQuery({
    queryKey: assistantStatusQueryKey,
    queryFn: fetchAssistantStatus,
  });
  const aiOn = assistantStatus?.enabled === true;

  // Seeded once; later reads only while clean (spec D2): see `src/lib/anamnese/draft.ts`.
  const [state, setState] = useState<AnamneseDraft | null>(null);
  const [seen, setSeen] = useState<ClientAnamnese | undefined>(undefined);
  if (data && data !== seen) {
    setSeen(data);
    setState(state ? adoptServer(state, data) : seedDraft(data));
  }

  const save = useMutation({
    mutationFn: (text: string) => saveAnamnese(clientId, text),
    onSuccess: (saved, sent) => {
      setState((current) => (current ? rebaseOnSave(current, sent, saved) : seedDraft(saved)));
      queryClient.setQueryData(queryKey, saved);
      // The roster's badge (E5) and an open editor's strip in this browser tab.
      void queryClient.invalidateQueries({ queryKey: ["students"] });
      void queryClient.invalidateQueries({ queryKey: anamneseNoticeKeyPrefix });
    },
  });

  const dirty = state !== null && isDirty(state);
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  if (!state) {
    return (
      <div className="flex w-full flex-col items-start gap-[var(--space-6)] xl:flex-row">
        {isError ? (
          <section className={`${cardClass} items-center px-[var(--space-5)] py-[200px] text-center`} role="alert">
            <p className="text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
              Não foi possível carregar a anamnese
            </p>
            <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)]">
              Verifique sua conexão e tente novamente.
            </p>
            <Button type="button" variant="outline" loading={isRefetching} onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </section>
        ) : (
          <section className={cardClass} aria-busy={isPending} aria-label="Carregando a anamnese">
            <div className="flex flex-col gap-[8px]">
              <div className="skeleton-shimmer h-[16px] w-[240px] rounded-[var(--radius-sm)]" />
              <div className="skeleton-shimmer h-[12px] w-full max-w-[420px] rounded-[var(--radius-sm)]" />
            </div>
            <div className="skeleton-shimmer h-[567px] w-full rounded-[var(--radius-md)]" />
            <div className="flex items-center justify-between">
              <div className="skeleton-shimmer h-[12px] w-[80px] rounded-[var(--radius-sm)]" />
              <div className="skeleton-shimmer h-[37px] w-[86px] rounded-[var(--radius-md)]" />
            </div>
          </section>
        )}
        <GuideColumn clientName={clientName} aiOn={aiOn} />
      </div>
    );
  }

  const saving = save.isPending;
  const length = anamneseLength(state.draft);
  const excess = anamneseExcess(state.draft);
  const over = excess > 0;
  const failure = save.isError ? saveErrorText(save.error) : null;
  const canSave = dirty && !over && !saving;

  function submit() {
    if (!state || !isDirty(state) || anamneseExcess(state.draft) > 0 || save.isPending) return;
    save.mutate(state.draft);
  }

  const boxBorder =
    over || failure
      ? "border-[var(--color-danger)]"
      : saving
        ? "border-[var(--color-border)]"
        : "border-[var(--color-border-strong)] focus:border-[var(--color-primary)]";

  return (
    <div className="flex w-full flex-col items-start gap-[var(--space-6)] xl:flex-row">
      <form
        className={cardClass}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex w-full flex-wrap items-center justify-between gap-[var(--space-3)]">
          <div className="flex flex-col gap-[4px]">
            <h2 className="font-heading text-[18px] font-semibold text-[color:var(--color-text-primary)]">
              <label htmlFor={textareaId}>Anamnese de {clientName}</label>
            </h2>
            <p className="text-[13px] text-[color:var(--color-text-secondary)]">
              Escreva com as suas palavras. Nada é salvo até você clicar em “Salvar”.
            </p>
          </div>
          {state.updatedAt && (
            <span className="flex items-center gap-[6px] text-[13px] text-[color:var(--color-text-secondary)]">
              <CircleCheck width={14} height={14} className="text-[color:var(--color-success)]" aria-hidden />
              Atualizada em {formatInstantDate(state.updatedAt)}
            </span>
          )}
        </div>

        {/* No `maxLength`: a long paste stays whole so the counter can show the excess (E2). */}
        <textarea
          id={textareaId}
          value={state.draft}
          readOnly={saving}
          aria-invalid={over}
          aria-describedby={counterId}
          placeholder={`Escreva aqui o que você sabe sobre ${firstName(clientName)}. Por exemplo: quer perder 5 kg até março; sente dor no joelho direito ao agachar; toma remédio para pressão; treina 3 vezes por semana, de manhã.`}
          onChange={(event) => {
            if (save.isError) save.reset();
            setState(editDraft(state, event.target.value));
          }}
          className={`h-[567px] w-full resize-y rounded-[var(--radius-md)] border px-[16px] py-[14px] text-[length:var(--text-sm)] leading-[1.6] outline-none placeholder:text-[color:var(--color-text-tertiary)] ${boxBorder} ${
            saving
              ? "bg-[var(--color-surface)] text-[color:var(--color-text-secondary)]"
              : "bg-[var(--color-bg)] text-[color:var(--color-text-primary)]"
          }`}
        />

        {failure && (
          <div role="alert" className="flex w-full flex-wrap items-center gap-[8px] text-[13px]">
            <CircleX width={15} height={15} className="shrink-0 text-[color:var(--color-danger)]" aria-hidden />
            <span className="text-[color:var(--color-danger)]">{failure.text}</span>
            {failure.retry && (
              <button
                type="button"
                onClick={submit}
                disabled={!canSave}
                className="font-semibold text-[color:var(--color-primary)] hover:underline disabled:opacity-35"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}

        <div className="flex w-full flex-wrap items-center justify-between gap-[var(--space-3)]">
          <div id={counterId} className="flex flex-col gap-[4px]">
            <span
              className={`text-[12px] tabular-nums ${
                over ? "font-semibold text-[color:var(--color-danger)]" : "text-[color:var(--color-text-secondary)]"
              }`}
            >
              {numberFormat.format(length)} / {numberFormat.format(ANAMNESE_MAX)}
            </span>
            {over && (
              <span className="text-[12px] text-[color:var(--color-danger)]">
                O texto passou do limite. Apague {numberFormat.format(excess)}{" "}
                {excess === 1 ? "caractere" : "caracteres"} para poder salvar.
              </span>
            )}
          </div>
          <div className="flex items-center gap-[var(--space-4)]">
            {dirty && !saving && (
              <span className="flex items-center gap-[8px] text-[13px] font-semibold text-[color:var(--color-warning)]">
                <span className="h-[8px] w-[8px] rounded-[var(--radius-full)] bg-[var(--color-warning)]" aria-hidden />
                Alterações não salvas
              </span>
            )}
            <Button type="submit" loading={saving} disabled={!saving && !canSave}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </form>
      <GuideColumn clientName={clientName} aiOn={aiOn} />
    </div>
  );
}
