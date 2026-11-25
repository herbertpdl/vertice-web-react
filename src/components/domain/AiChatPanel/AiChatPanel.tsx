"use client";

import { useEffect, useId, useLayoutEffect, useRef } from "react";
import {
  Check,
  CircleAlert,
  CircleMinus,
  CircleStop,
  ClipboardList,
  ClipboardPen,
  ExternalLink,
  Info,
  Send,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button, Spinner } from "@/components/ui";
import { ASSISTANT_MESSAGE_MAX } from "@/lib/assistant/contract";
import {
  ANAMNESE_MISSING_LINK,
  ANAMNESE_MISSING_TEXT,
  ANAMNESE_PRESENT_LINK,
  DISCLAIMER,
  anamneseMissingTitle,
  anamnesePresentLine,
} from "@/lib/assistant/copy";
import type { AnamneseNotice } from "@/lib/api/types";
import { studentTabHref } from "@/lib/studentTabs";
import { canSend, isBusy, messageLength, type ChatMessage, type ChatState } from "@/lib/assistant/chat";

/** The counter is always shown; from here on it turns to the warning color (R10, frame `Cz6l0`). */
const COUNTER_WARN_FROM = 1800;
/** The column layout (R55): beside the editor from 1280 px up, over it below. */
const COLUMN_QUERY = "(min-width: 1280px)";

export interface AiChatPanelProps {
  state: ChatState;
  onInput: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  onRetry: () => void;
  onClose: () => void;
  /**
   * `GET /assistant/anamnese-notice`'s answer (client-anamnese D10). Absent while pending or after a
   * failure, and `unavailable` (a former trainer): no strip.
   */
  anamneseNotice?: AnamneseNotice | null;
}

/** R25–R28: whether the AI uses the client's anamnese, with a link that opens its tab in a new browser tab. */
function AnamneseStrip({ notice }: { notice: AnamneseNotice }) {
  if (notice.state === "unavailable" || !notice.client) return null;
  const present = notice.state === "present";
  const link = (
    <a
      href={studentTabHref(notice.client.id, "anamnese")}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-fit items-center gap-[6px] text-[13px] font-semibold text-[color:var(--color-primary)] hover:underline"
    >
      {present ? ANAMNESE_PRESENT_LINK : ANAMNESE_MISSING_LINK}
      <ExternalLink width={13} height={13} aria-hidden />
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  );
  return (
    <div
      className={`flex gap-[10px] border-b border-[var(--color-border)] px-[var(--space-5)] py-[12px] ${
        present ? "bg-[#7c4dff14]" : "bg-[#ffb02014]"
      }`}
    >
      {present ? (
        <ClipboardList width={16} height={16} className="mt-[1px] shrink-0 text-[color:var(--color-secondary-hover)]" aria-hidden />
      ) : (
        <ClipboardPen width={16} height={16} className="mt-[1px] shrink-0 text-[color:var(--color-warning)]" aria-hidden />
      )}
      <div className="flex min-w-0 flex-col gap-[6px] text-[13px] leading-[1.5]">
        {present ? (
          <p className="text-[color:var(--color-text-secondary)]">{anamnesePresentLine(notice.client.name)}</p>
        ) : (
          <>
            <p className="font-semibold text-[color:var(--color-text-primary)]">{anamneseMissingTitle(notice.client.name)}</p>
            <p className="text-[color:var(--color-text-secondary)]">{ANAMNESE_MISSING_TEXT}</p>
          </>
        )}
        {link}
      </div>
    </div>
  );
}

const numberFormat = new Intl.NumberFormat("pt-BR");

function Bubble({ message, isLast, onRetry }: { message: ChatMessage; isLast: boolean; onRetry: () => void }) {
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-[var(--radius-lg)] rounded-br-[4px] bg-[var(--color-surface-active)] px-[14px] py-[10px] text-[length:var(--text-sm)] text-[color:var(--color-text-primary)]">
        {message.text}
      </div>
    );
  }
  switch (message.kind) {
    case "stages":
      return (
        <ol
          aria-label="Etapas"
          className="flex w-full flex-col gap-[8px] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] px-[14px] py-[12px]"
        >
          {message.stages.map((stage) => (
            <li
              key={stage.key}
              className={`flex items-center gap-[8px] text-[length:var(--text-sm)] ${
                stage.done ? "text-[color:var(--color-text-secondary)]" : "text-[color:var(--color-text-primary)]"
              }`}
            >
              {stage.done ? (
                <Check width={14} height={14} className="text-[color:var(--color-success)]" aria-hidden />
              ) : (
                <Spinner size="sm" className="!h-[14px] !w-[14px]" />
              )}
              <span>
                {stage.label}
                {stage.done ? "" : "…"}
              </span>
              <span className="sr-only">{stage.done ? "concluída" : "em andamento"}</span>
            </li>
          ))}
        </ol>
      );
    case "ready":
      return (
        <div className="flex items-center gap-[8px] rounded-[var(--radius-lg)] border border-[var(--color-secondary)] bg-[#7c4dff1a] px-[14px] py-[10px] text-[length:var(--text-sm)] font-semibold text-[color:var(--color-text-primary)]">
          <Sparkles width={15} height={15} className="shrink-0 text-[color:var(--color-secondary-hover)]" aria-hidden />
          {message.text}
        </div>
      );
    case "error":
      return (
        <div
          role="alert"
          className="flex flex-col gap-[8px] rounded-[var(--radius-lg)] border border-[var(--color-danger)] bg-[#ff5c5c14] px-[14px] py-[10px] text-[length:var(--text-sm)] text-[color:var(--color-text-primary)]"
        >
          <span className="flex items-start gap-[8px]">
            <CircleAlert width={15} height={15} className="mt-[2px] shrink-0 text-[color:var(--color-danger)]" aria-hidden />
            {message.text}
          </span>
          {message.retryable && isLast && (
            <Button variant="outline" size="sm" className="self-start" onClick={onRetry}>
              Tentar novamente
            </Button>
          )}
        </div>
      );
    case "stopped":
    case "notice":
      return (
        <div className="flex items-start gap-[8px] rounded-[var(--radius-lg)] bg-[var(--color-surface-hover)] px-[14px] py-[10px] text-[length:var(--text-sm)] text-[color:var(--color-text-secondary)]">
          <Info width={15} height={15} className="mt-[2px] shrink-0" aria-hidden />
          {message.text}
        </div>
      );
    case "left_out":
    case "conflict":
      // A line of its own (R31, E25; frames `x9k4ZI`, `s0yr3`): never merged into the answer.
      return (
        <div className="flex max-w-[92%] items-start gap-[8px] text-[length:var(--text-sm)] leading-[1.55] text-[color:var(--color-text-primary)]">
          {message.kind === "conflict" ? (
            <TriangleAlert width={16} height={16} className="mt-[2px] shrink-0 text-[color:var(--color-warning)]" role="img" aria-label="Conflito com a anamnese" />
          ) : (
            <CircleMinus width={16} height={16} className="mt-[2px] shrink-0 text-[color:var(--color-text-secondary)]" aria-hidden />
          )}
          <span className="whitespace-pre-wrap">{message.text}</span>
        </div>
      );
    case "text":
      return (
        <div className="max-w-[92%] whitespace-pre-wrap text-[length:var(--text-sm)] leading-[1.55] text-[color:var(--color-text-primary)]">
          {message.text}
        </div>
      );
  }
}

/**
 * The assistant's chat (R3, R10, R11, R14–R18, R47, R48; frames `t1PsT`, `Q9EzR`, `ChSlt`,
 * `H0aLE`…`Cz6l0`). Presentational: the chat store owns the conversation, so closing this panel
 * loses nothing (R4) and a message keeps running behind a closed panel (R47).
 *
 * From 1280 px up it is a 440 px column beside the editor; below that it opens over the editor
 * on the right, full height (R55). As a column it is sized to the part of the page row that is on
 * screen, so the input stays in view however the page above and below it (header, legal footer)
 * is scrolled.
 */
export function AiChatPanel({ state, onInput, onSend, onStop, onRetry, onClose, anamneseNotice }: AiChatPanelProps) {
  const inputId = useId();
  const counterId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const aside = asideRef.current;
    const row = aside?.parentElement;
    if (!aside || !row) return;
    const media = window.matchMedia(COLUMN_QUERY);
    let frame = 0;
    const fit = () => {
      frame = 0;
      if (!media.matches) {
        aside.style.height = "";
        return;
      }
      const rect = row.getBoundingClientRect();
      const visible = Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top);
      aside.style.height = `${Math.max(0, visible)}px`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(fit);
    };
    fit();
    const observer = new ResizeObserver(schedule);
    observer.observe(row);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    media.addEventListener("change", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      media.removeEventListener("change", schedule);
      aside.style.height = "";
    };
  }, []);
  // Opening moves focus into the panel: below 1280 px it covers the editor.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const busy = isBusy(state);
  const length = messageLength(state.input);
  const over = length > ASSISTANT_MESSAGE_MAX;
  const sendable = canSend(state);

  // Follow the conversation as it grows (new messages and streamed text).
  const lastMessage = state.messages[state.messages.length - 1];
  const tailSize = lastMessage && "text" in lastMessage ? lastMessage.text.length : 0;
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [state.messages.length, tailSize]);

  return (
    <aside
      ref={asideRef}
      aria-label="Assistente IA"
      data-scroll-padding-exempt
      onKeyDown={(event) => {
        // `preventDefault` so an open Dialog's own Escape handler leaves it alone (CLAUDE.md).
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          onClose();
        }
      }}
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[440px] flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_0_48px_#00000080] xl:sticky xl:top-0 xl:z-auto xl:h-screen xl:shrink-0 xl:self-start xl:shadow-none"
    >
      <div className="flex items-center justify-between gap-[var(--space-3)] border-b border-[var(--color-border)] px-[var(--space-5)] py-[var(--space-4)]">
        <div className="flex items-center gap-[10px]">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[var(--radius-md)] bg-[#7c4dff26] text-[color:var(--color-secondary-hover)]">
            <Sparkles width={16} height={16} aria-hidden />
          </span>
          <div className="flex flex-col">
            <span className="font-heading text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
              Assistente IA
            </span>
            <span className="text-[11px] text-[color:var(--color-text-tertiary)]">
              Perguntas sobre treino e alterações neste treino
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar assistente"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[color:var(--color-text-primary)]"
        >
          <X width={16} height={16} />
        </button>
      </div>

      {anamneseNotice && <AnamneseStrip notice={anamneseNotice} />}

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className="flex flex-1 flex-col gap-[var(--space-3)] overflow-y-auto px-[var(--space-5)] py-[var(--space-5)]"
      >
        {state.messages.length === 0 ? (
          <div className="m-auto flex max-w-[320px] flex-col items-center gap-[var(--space-3)] text-center">
            <span className="flex h-[48px] w-[48px] items-center justify-center rounded-[var(--radius-full)] bg-[#7c4dff1f] text-[color:var(--color-secondary-hover)]">
              <Sparkles width={22} height={22} aria-hidden />
            </span>
            <p className="font-heading text-[length:var(--text-md)] font-semibold text-[color:var(--color-text-primary)]">
              Como posso ajudar com este treino?
            </p>
            <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-secondary)]">
              Tire dúvidas sobre exercícios ou peça uma alteração, como “adicione um finalizador
              para pernas” ou “deixe tudo em 4 séries de 8 a 10”. As alterações aparecem no editor
              para você revisar antes de salvar.
            </p>
          </div>
        ) : (
          state.messages.map((message, index) => (
            <Bubble
              key={message.id}
              message={message}
              isLast={index === state.messages.length - 1}
              onRetry={onRetry}
            />
          ))
        )}
        {(state.phase === "saving" || state.phase === "waiting") && (
          <div className="flex items-center gap-[8px] text-[length:var(--text-sm)] text-[color:var(--color-text-secondary)]">
            <Spinner size="sm" className="!h-[14px] !w-[14px]" />
            {state.phase === "saving" ? "Salvando o treino antes de enviar…" : "Pensando…"}
          </div>
        )}
      </div>

      <form
        className="flex flex-col gap-[8px] border-t border-[var(--color-border)] px-[var(--space-5)] py-[var(--space-4)]"
        onSubmit={(event) => {
          event.preventDefault();
          if (sendable) onSend();
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Mensagem para o assistente
        </label>
        <div
          className={`flex items-end gap-[8px] rounded-[var(--radius-md)] border bg-[var(--color-bg)] px-[12px] py-[8px] focus-within:border-[var(--color-secondary)] ${
            over ? "border-[var(--color-danger)]" : "border-[var(--color-border)]"
          }`}
        >
          <textarea
            ref={inputRef}
            id={inputId}
            value={state.input}
            rows={2}
            disabled={busy}
            aria-invalid={over}
            aria-describedby={counterId}
            placeholder={busy ? "Aguarde a resposta terminar…" : "Pergunte ou peça uma alteração no treino…"}
            onChange={(event) => onInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (sendable) onSend();
              }
            }}
            className="field-sizing-content max-h-[50vh] min-h-[44px] flex-1 resize-y bg-transparent text-[length:var(--text-sm)] text-[color:var(--color-text-primary)] outline-none placeholder:text-[color:var(--color-text-tertiary)] disabled:opacity-60"
          />
          {busy ? (
            <Button type="button" variant="outline" size="sm" onClick={onStop}>
              <CircleStop width={14} height={14} aria-hidden />
              Parar
            </Button>
          ) : (
            <Button type="submit" variant="secondary" size="sm" disabled={!sendable}>
              <Send width={14} height={14} aria-hidden />
              Enviar
            </Button>
          )}
        </div>
        <div className="flex items-start justify-between gap-[var(--space-3)]">
          <p className="text-[11px] text-[color:var(--color-text-tertiary)]">{DISCLAIMER}</p>
          <span
            id={counterId}
            className={`shrink-0 text-[11px] tabular-nums ${
              over
                ? "font-semibold text-[color:var(--color-danger)]"
                : length >= COUNTER_WARN_FROM
                  ? "font-semibold text-[color:var(--color-warning)]"
                  : "text-[color:var(--color-text-tertiary)]"
            }`}
          >
            {numberFormat.format(length)} / {numberFormat.format(ASSISTANT_MESSAGE_MAX)}
          </span>
        </div>
        {over && (
          <p role="alert" className="text-[12px] text-[color:var(--color-danger)]">
            Mensagem muito longa: remova {numberFormat.format(length - ASSISTANT_MESSAGE_MAX)}{" "}
            {length - ASSISTANT_MESSAGE_MAX === 1 ? "caractere" : "caracteres"} para enviar.
          </p>
        )}
      </form>
    </aside>
  );
}
