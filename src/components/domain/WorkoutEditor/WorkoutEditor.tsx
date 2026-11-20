"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ChevronRight, CircleAlert, Dumbbell, TriangleAlert } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Dropdown, PageLoadingOverlay, Spinner, TextField } from "@/components/ui";
import { NAME_MAX } from "@/lib/validation/bounds";
import { AddExerciseDialog } from "../AddExerciseDialog";
import { AiAssistantButton } from "../AiAssistantButton";
import { AiChatPanel } from "../AiChatPanel";
import { ConfirmDialog } from "../ConfirmDialog";
import { RemovedExerciseCard } from "../RemovedExerciseCard";
import { ReviewBanner } from "../ReviewBanner";
import { CloneWorkoutDialog } from "../CloneWorkoutDialog";
import { DeleteWorkoutDialog } from "../DeleteWorkoutDialog";
import { EditorFooter } from "../EditorFooter";
import { WorkoutExerciseCard, type CardDragState } from "../WorkoutExerciseCard";
import { deleteWorkout as deleteWorkoutRequest, fetchFullWorkout } from "@/lib/api/workouts";
import { fetchTrainingPlan } from "@/lib/api/trainingPlans";
import { fetchStudent } from "@/lib/api/students";
import { DAY_ORDER, DAY_NAMES_LONG } from "@/lib/days";
import { useRedirectOnError } from "@/lib/hooks/useRedirectOnError";
import type { AutosaveTransport } from "@/lib/workoutEditor/autosave";
import {
  allCollapsed,
  expandRefused,
  toggleAll,
  toggleCollapsed,
  type CollapsedKeys,
} from "@/lib/workoutEditor/collapse";
import {
  DEFAULT_WORKOUT_NAME,
  MAX_EXERCISES,
  emptyWorkout,
  exceedsCaps,
  fromFullWorkout,
  toKeyedEntries,
  type EditorWorkout,
} from "@/lib/workoutEditor/model";
import { useWorkoutAutosave } from "@/lib/workoutEditor/useWorkoutAutosave";
import { proposalDiff } from "@/lib/workoutEditor/proposalDiff";
import {
  assistantStatusQueryKey,
  fetchAssistantStatus,
  streamWorkoutChat,
  type StreamWorkoutChat,
} from "@/lib/api/assistant";
import { createChatStore, isBusy, locksEditor } from "@/lib/assistant/chat";
import { LEAVE_WHILE_BUSY_MESSAGE, LEAVE_WITH_PROPOSAL_MESSAGE } from "@/lib/assistant/copy";
import { proposalToExercises } from "@/lib/assistant/proposal";
import type { DayOfWeek } from "@/lib/api/types";

const dayOptions = DAY_ORDER.map((day) => ({ value: day, label: DAY_NAMES_LONG[day] }));

const LEAVE_WITH_ERROR_MESSAGE =
  "A última alteração não foi salva. Sair mesmo assim? Ela será perdida.";

function ordinal(position: number) {
  return `${position}º`;
}

/** Loads what the editor needs, then hands off to one `WorkoutEditorSession` per workout. */
export function WorkoutEditor({
  planId,
  workoutId,
  initialDayOfWeek,
}: {
  planId: number;
  workoutId?: number;
  initialDayOfWeek?: DayOfWeek;
}) {
  const isNew = !workoutId;

  const { data: plan } = useQuery({
    queryKey: ["trainingPlan", planId],
    queryFn: () => fetchTrainingPlan(planId),
  });
  const { data: student } = useQuery({
    queryKey: ["student", plan?.clientId],
    queryFn: () => fetchStudent(plan!.clientId),
    enabled: Boolean(plan),
  });

  const { data: full, error: workoutError } = useQuery({
    queryKey: ["workout", workoutId, "full"],
    queryFn: () => fetchFullWorkout(workoutId!),
    enabled: !isNew,
  });
  useRedirectOnError(workoutError, `/planos/${planId}`);

  // The AI button exists only while the BFF says the assistant is on (its `AI_ASSISTANT_ENABLED`,
  // off by default). Any failure keeps it hidden: the editor never depends on this call.
  const { data: assistantStatus } = useQuery({
    queryKey: assistantStatusQueryKey,
    queryFn: fetchAssistantStatus,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // The session only reads `initial` at mount, so it is computed once here
  // (a later refetch of the query never touches the editor's draft).
  const [initial] = useState<EditorWorkout | null>(() =>
    isNew ? emptyWorkout(initialDayOfWeek ?? "MONDAY") : null,
  );
  const [loadedInitial, setLoadedInitial] = useState<EditorWorkout | null>(null);
  if (!isNew && full && !loadedInitial) setLoadedInitial(fromFullWorkout(full));

  const session = initial ?? loadedInitial;
  if (!session) {
    return (
      <div className="relative flex min-h-[60vh] w-full">
        <PageLoadingOverlay />
      </div>
    );
  }

  return (
    <WorkoutEditorSession
      planId={planId}
      workoutId={workoutId ?? null}
      initial={session}
      planName={plan?.name}
      clientId={plan?.clientId}
      studentName={student?.name}
      assistantEnabled={assistantStatus?.enabled === true}
    />
  );
}

export interface WorkoutEditorSessionProps {
  planId: number;
  workoutId: number | null;
  initial: EditorWorkout;
  planName?: string;
  clientId?: number;
  studentName?: string;
  /** Test/story hook: replaces the BFF-backed transport. */
  transport?: AutosaveTransport;
  /** Test/story hook: replaces `DELETE /workouts/:id`. */
  deleteWorkout?: (id: number) => Promise<unknown>;
  delayMs?: number;
  /** Shows the AI assistant (ai-workout-assistant spec, "Switching it on"). */
  assistantEnabled?: boolean;
  /** Test/story hook: replaces the assistant's stream. */
  streamChat?: StreamWorkoutChat;
}

export function WorkoutEditorSession({
  planId,
  workoutId,
  initial,
  planName,
  clientId,
  studentName,
  transport,
  deleteWorkout = deleteWorkoutRequest,
  delayMs,
  assistantEnabled = false,
  streamChat = streamWorkoutChat,
}: WorkoutEditorSessionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // The engine outlives this component (see `useWorkoutAutosave`), so a save
  // can land after the trainer navigated away: the cache invalidations below
  // are still wanted then (they refresh the plan page), the URL rewrite is not.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const [state, engine] = useWorkoutAutosave({
    planId,
    workoutId,
    initial,
    transport,
    delayMs,
    onSaved: ({ workoutId: savedId, created }) => {
      queryClient.invalidateQueries({ queryKey: ["workout", savedId, "full"] });
      queryClient.invalidateQueries({ queryKey: ["trainingPlan", planId] });
      if (created) {
        queryClient.invalidateQueries({ queryKey: ["recentWorkouts"] });
        // Same editor, real URL: a reload lands on the workout route (R3).
        if (mounted.current) {
          window.history.replaceState(null, "", `/planos/${planId}/treinos/${savedId}`);
        }
      }
    },
  });
  const { draft, status, refusal } = state;

  // The assistant's chat lives as long as this editor mount (R4, R5): unmounting aborts the
  // message in flight, which is how every way out of the page stops it (R50, assessment F6).
  const [chat] = useState(() =>
    createChatStore({
      prepare: async () => {
        // R53: whatever is pending is saved before the message goes; nothing goes after a
        // failed save. A proposal in review is not saved by design (R34), so nothing to wait for.
        const current = engine.getState();
        if (current.review) return true;
        if (current.status === "error") return false;
        return engine.finish();
      },
      buildRequest: () => {
        const current = engine.getState();
        return {
          trainingPlanId: planId,
          ...(current.workoutId !== null ? { workoutId: current.workoutId } : {}),
          // R36: a proposal in review is sent as it stands on screen, trainer edits included.
          workout: { exercises: toKeyedEntries(current.draft.exercises) },
        };
      },
      onProposal: (entries) => {
        const exercises = proposalToExercises(entries, engine.getState().draft.exercises);
        // The BFF enforces the caps (R31); one that slips through is never shown (R32).
        if (exceedsCaps(exercises)) throw new Error("Proposal over the workout caps");
        engine.propose(exercises);
      },
      stream: streamChat,
    }),
  );
  useEffect(() => () => chat.dispose(), [chat]);
  const chatState = useSyncExternalStore(chat.subscribe, chat.getState, chat.getState);
  const [panelOpen, setPanelOpen] = useState(false);
  const chatBusy = assistantEnabled && isBusy(chatState);
  const locked = assistantEnabled && locksEditor(chatState);
  const review = state.review;
  const diff = review ? proposalDiff(review.base, draft.exercises) : null;
  const [applying, setApplying] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState<"busy" | "review" | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Drag and drop (native HTML5): which exercise / set is being dragged and
  // where it would land.
  const [draggingExercise, setDraggingExercise] = useState<string | null>(null);
  const [exerciseOverIndex, setExerciseOverIndex] = useState<number | null>(null);
  const [draggingSet, setDraggingSet] = useState<{ exerciseKey: string; setKey: string } | null>(null);

  // Which cards are collapsed (collapsible-exercise-card PRD). View state only: never in the
  // draft, so it is never saved and never touches the footer (R15), and every visit starts with
  // all cards expanded (R7, R8). Keys not in the set are expanded, so new and cloned exercises
  // start expanded (R9, R10).
  const [collapsed, setCollapsed] = useState<CollapsedKeys>(() => new Set());
  // A refused removal brings an exercise or a set back: its card expands so the restored item
  // and its flag are visible (R11). Adjusted during render when a new refusal arrives.
  const [seenRefusal, setSeenRefusal] = useState(refusal);
  if (refusal !== seenRefusal) {
    setSeenRefusal(refusal);
    if (refusal) {
      const next = expandRefused(draft.exercises, collapsed, refusal);
      if (next !== collapsed) setCollapsed(next);
    }
  }
  const everyCardCollapsed = allCollapsed(draft.exercises, collapsed);

  // Leaving warns only while something could still be lost (R12). A hard
  // unload (reload, tab close) kills a pending save, so `beforeunload` covers
  // both "saving" and "error".
  // The assistant adds two cases (R42, R46, R50): a message in flight, a proposal in review.
  const warnOnLeave = status === "saving" || status === "error" || chatBusy || review !== null;
  useEffect(() => {
    if (!warnOnLeave) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [warnOnLeave]);

  // In-app navigation cannot lose a pending save (the engine outlives the
  // editor and completes it) but it does abandon a failed one, and the App
  // Router has no route-change event to veto — so while the last save failed,
  // clicks on in-app links are intercepted here (capture phase, before
  // `Link`, which skips its navigation once the default is prevented).
  const leaveMessage = chatBusy
    ? LEAVE_WHILE_BUSY_MESSAGE
    : review
      ? LEAVE_WITH_PROPOSAL_MESSAGE
      : status === "error"
        ? LEAVE_WITH_ERROR_MESSAGE
        : null;
  useEffect(() => {
    if (!leaveMessage) return;
    const handler = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (!window.confirm(leaveMessage)) {
        event.preventDefault();
        return;
      }
      // Leaving anyway: the message stops on unmount; the proposal is dropped (R42, R50).
      engine.discardProposal();
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [leaveMessage, engine]);

  // The name/day/actions row is sticky; once it is pinned to the viewport top it
  // gets a bottom border so the cards visibly scroll under it.
  const toolbarRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [toolbarStuck, setToolbarStuck] = useState(false);

  // Both bars are sticky and opaque, so a field focused by keyboard would otherwise be
  // scrolled only to the viewport edge, right behind one of them (WCAG 2.4.11). Pad the
  // page's scrollport by their measured heights; the toolbar grows with the cap warning.
  useEffect(() => {
    const root = document.documentElement;
    const gap = 16;
    const measure = () => {
      const top = toolbarRef.current?.offsetHeight ?? 0;
      const bottom = footerRef.current?.offsetHeight ?? 0;
      root.style.scrollPaddingTop = `${top + gap}px`;
      root.style.scrollPaddingBottom = `${bottom + gap}px`;
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (toolbarRef.current) observer.observe(toolbarRef.current);
    if (footerRef.current) observer.observe(footerRef.current);
    return () => {
      observer.disconnect();
      root.style.scrollPaddingTop = "";
      root.style.scrollPaddingBottom = "";
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const top = toolbarRef.current?.getBoundingClientRect().top;
      setToolbarStuck(top !== undefined && top <= 0 && window.scrollY > 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const atCap = draft.exercises.length >= MAX_EXERCISES;
  const offerClone = state.offersClone;
  const crumbName = draft.name.trim() || DEFAULT_WORKOUT_NAME;

  function requestFinish() {
    // "Concluir" with the assistant working or a proposal in review asks first (E17, E26).
    if (chatBusy) setLeaveConfirm("busy");
    else if (review) setLeaveConfirm("review");
    else void handleFinish();
  }

  async function handleApply() {
    setApplying(true);
    try {
      await engine.applyProposal();
    } finally {
      setApplying(false);
    }
  }

  async function handleFinish() {
    setFinishing(true);
    const ok = await engine.finish();
    setFinishing(false);
    if (!ok) return;
    queryClient.invalidateQueries({ queryKey: ["trainingPlan", planId] });
    router.push(`/planos/${planId}`);
  }

  function handleExerciseDragStart(key: string, event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", key);
    setDraggingExercise(key);
  }

  function handleCardDragOver(event: DragEvent<HTMLDivElement>, index: number) {
    if (!draggingExercise) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    setExerciseOverIndex(before ? index : index + 1);
  }

  function handleListDrop(event: DragEvent<HTMLDivElement>) {
    if (!draggingExercise) return;
    event.preventDefault();
    if (exerciseOverIndex !== null) {
      engine.dispatch({ type: "moveExercise", exerciseKey: draggingExercise, toIndex: exerciseOverIndex });
    }
    setDraggingExercise(null);
    setExerciseOverIndex(null);
  }

  const fromIndex = draggingExercise
    ? draft.exercises.findIndex((we) => we.key === draggingExercise)
    : -1;
  const placeholderIndex =
    exerciseOverIndex !== null &&
    fromIndex >= 0 &&
    exerciseOverIndex !== fromIndex &&
    exerciseOverIndex !== fromIndex + 1
      ? exerciseOverIndex
      : null;
  const placeholderPosition =
    placeholderIndex !== null
      ? placeholderIndex > fromIndex
        ? placeholderIndex
        : placeholderIndex + 1
      : null;

  const placeholder = (
    <div className="flex h-[96px] w-full items-center justify-center gap-[8px] rounded-[var(--radius-lg)] border border-[var(--color-primary)] bg-[#00e5ff0d] text-[13px] font-semibold text-[color:var(--color-primary)]">
      <ArrowDownToLine width={16} height={16} />
      Soltar aqui — o exercício passa a ser o {placeholderPosition !== null ? ordinal(placeholderPosition) : ""}
    </div>
  );

  const headerActions = (
    <div className="flex items-center gap-[var(--space-3)]">
      {atCap && (
        <span className="rounded-[var(--radius-full)] bg-[#ffb02026] px-[12px] py-[8px] text-[12px] font-semibold text-[color:var(--color-warning)]">
          {draft.exercises.length} / {MAX_EXERCISES} exercícios
        </span>
      )}
      {/* One editor-wide action, only with two or more exercises (R12–R14). */}
      {draft.exercises.length >= 2 && (
        <Button
          variant="outline"
          onClick={() => setCollapsed(toggleAll(draft.exercises, collapsed))}
        >
          {everyCardCollapsed ? "Expandir todos" : "Recolher todos"}
        </Button>
      )}
      {offerClone && (
        <Button variant="outline" onClick={() => setCloneOpen(true)}>
          Usar treino existente como base
        </Button>
      )}
      <Button onClick={() => setAddOpen(true)} disabled={atCap}>
        + Adicionar exercício
      </Button>
    </div>
  );

  return (
    <div className="flex w-full items-start">
    <div className="relative flex min-w-0 flex-1 flex-col">
      <div className="flex w-full flex-col gap-[var(--space-6)] px-[var(--space-8)] py-[var(--space-8)]">
        <div className="flex w-full items-center justify-between gap-[var(--space-4)]">
          <nav aria-label="Navegação" className="flex items-center gap-2">
            <Link
              href={`/alunos/${clientId ?? ""}`}
              className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-primary)]"
            >
              {studentName ?? "..."}
            </Link>
            <ChevronRight width={13} height={13} className="text-[color:var(--color-text-tertiary)]" />
            <Link
              href={`/planos/${planId}`}
              className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-primary)]"
            >
              {planName ?? "..."}
            </Link>
            <ChevronRight width={13} height={13} className="text-[color:var(--color-text-tertiary)]" />
            <span className="text-[length:var(--text-sm)] font-semibold text-[color:var(--color-text-primary)]">
              {crumbName}
            </span>
          </nav>
          {/* Only once the workout exists upstream (a new one gets its id on the first save). */}
          {state.workoutId !== null && (
            <Button variant="ghost" onClick={() => setDeleteOpen(true)} disabled={locked || review !== null}>
              Excluir treino
            </Button>
          )}
        </div>

        {/* Sticks to the top while the list scrolls, so "Adicionar exercício" stays one click
            away. The negative margins keep the resting layout unchanged while letting the
            background cover the page gutters once stuck. */}
        <div
          ref={toolbarRef}
          className={`sticky top-0 z-10 -mx-[var(--space-8)] -my-[var(--space-4)] flex items-start justify-between gap-[var(--space-4)] border-b bg-[var(--color-bg)] px-[var(--space-8)] py-[var(--space-4)] ${
            toolbarStuck ? "border-[var(--color-border)]" : "border-transparent"
          }`}
        >
          <div className="flex items-start gap-[var(--space-4)]" inert={locked}>
            <TextField
              label="Nome do treino"
              placeholder="Treino A — Superior"
              value={draft.name}
              maxLength={NAME_MAX}
              onChange={(event) => engine.dispatch({ type: "setName", name: event.target.value })}
              className="w-[360px]"
            />
            <Dropdown
              label="Dia da semana"
              options={dayOptions}
              value={draft.dayOfWeek}
              onChange={(value) =>
                engine.dispatch({ type: "setDayOfWeek", dayOfWeek: value as DayOfWeek })
              }
              className="w-[200px]"
            />
          </div>
          <div className={`flex flex-col items-end gap-[6px] ${atCap ? "" : "pt-[21px]"}`}>
            {atCap && (
              <span className="flex items-center gap-[6px] text-[12px] text-[color:var(--color-warning)]">
                <CircleAlert width={13} height={13} />
                Limite de {MAX_EXERCISES} exercícios por treino atingido. Remova um exercício para
                adicionar outro.
              </span>
            )}
            <div className="flex items-center gap-[var(--space-3)]">
              {assistantEnabled && (
                <AiAssistantButton
                  open={panelOpen}
                  busy={chatBusy}
                  onClick={() => setPanelOpen((open) => !open)}
                />
              )}
              <div inert={locked}>{headerActions}</div>
            </div>
          </div>
        </div>

        {review && (
          <ReviewBanner
            onApply={() => void handleApply()}
            onDiscard={() => engine.discardProposal()}
            applying={applying}
            disabled={chatBusy}
          />
        )}

        {refusal && (
          <div
            role="alert"
            className="flex w-full items-start gap-[var(--space-4)] rounded-[var(--radius-lg)] border border-[var(--color-danger)] bg-[#ff5c5c14] p-[var(--space-5)]"
          >
            <TriangleAlert width={22} height={22} className="shrink-0 text-[color:var(--color-danger)]" />
            <div className="flex flex-1 flex-col gap-[6px]">
              <span className="font-heading text-[length:var(--text-md)] font-semibold text-[color:var(--color-danger)]">
                {refusal.title}
              </span>
              <p className="text-[length:var(--text-base)] text-[color:var(--color-text-primary)]">
                {refusal.body}
              </p>
            </div>
            <Button variant="ghost" onClick={() => engine.dismissRefusal()}>
              Fechar
            </Button>
          </div>
        )}

        <div className="relative w-full">
        {locked && (
          <div
            role="status"
            className="absolute inset-0 z-[5] flex items-start justify-center rounded-[var(--radius-xl)] bg-[#0a0e14b3] pt-[96px]"
          >
            <span className="sticky top-[45vh] flex items-center gap-[10px] rounded-[var(--radius-full)] border border-[var(--color-secondary)] bg-[var(--color-surface)] px-[18px] py-[10px] text-[length:var(--text-sm)] font-semibold text-[color:var(--color-text-primary)] shadow-[0_12px_32px_#00000080]">
              <Spinner size="sm" className="!h-[15px] !w-[15px]" />
              {chatState.phase === "saving"
                ? "Salvando antes de enviar…"
                : chatState.phase === "waiting"
                  ? "IA analisando o pedido…"
                  : "IA montando o treino…"}
            </span>
          </div>
        )}
        <div inert={locked} className="w-full">
        {draft.exercises.length === 0 && !diff?.removed.length ? (
          <div className="flex w-full flex-col items-center gap-[var(--space-5)] rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-6)] py-[107px] text-center">
            <span className="flex h-[64px] w-[64px] items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-surface-hover)] text-[color:var(--color-primary)]">
              <Dumbbell width={28} height={28} />
            </span>
            <div className="flex max-w-[420px] flex-col gap-[var(--space-2)]">
              <p className="font-heading text-[length:var(--text-xl)] font-semibold text-[color:var(--color-text-primary)]">
                Este treino ainda não tem exercícios
              </p>
              <p className="text-[length:var(--text-base)] text-[color:var(--color-text-secondary)]">
                {offerClone
                  ? "Adicione exercícios do catálogo e arraste para definir a ordem, ou use um treino existente como ponto de partida. Cada alteração é salva automaticamente."
                  : "Adicione exercícios do catálogo e arraste para definir a ordem. Cada alteração é salva automaticamente."}
              </p>
            </div>
            {headerActions}
          </div>
        ) : (
          <div
            className="flex w-full flex-col gap-[var(--space-5)]"
            onDragOver={(event) => {
              if (draggingExercise) event.preventDefault();
            }}
            onDrop={handleListDrop}
          >
            {draft.exercises.map((we, index) => {
              const dragState: CardDragState =
                draggingExercise === we.key
                  ? "dragging"
                  : draggingSet && draggingSet.exerciseKey !== we.key
                    ? "not-allowed"
                    : "idle";
              return (
                <div key={we.key} className="contents">
                  {diff?.removed
                    .filter((r) => r.index === index)
                    .map((r) => (
                      <RemovedExerciseCard key={`removed-${r.exercise.key}`} exercise={r.exercise} />
                    ))}
                  {placeholderIndex === index && placeholder}
                  <div onDragOver={(event) => handleCardDragOver(event, index)}>
                    <WorkoutExerciseCard
                      exercise={we}
                      position={index + 1}
                      dragState={dragState}
                      collapsed={collapsed.has(we.key)}
                      onToggleCollapsed={() => setCollapsed(toggleCollapsed(collapsed, we.key))}
                      refused={refusal?.exerciseKeys.includes(we.key)}
                      refusedSetKeys={refusal?.setKeys}
                      diff={diff?.exercises[we.key]}
                      draggingSetKey={draggingSet?.exerciseKey === we.key ? draggingSet.setKey : null}
                      onUpdate={(patch) =>
                        engine.dispatch({ type: "updateExercise", exerciseKey: we.key, patch })
                      }
                      onRemove={() => engine.dispatch({ type: "removeExercise", exerciseKey: we.key })}
                      onAddSet={() => engine.dispatch({ type: "addSet", exerciseKey: we.key })}
                      onDuplicateSet={(setKey) =>
                        engine.dispatch({ type: "duplicateSet", exerciseKey: we.key, setKey })
                      }
                      onRemoveSet={(setKey) =>
                        engine.dispatch({ type: "removeSet", exerciseKey: we.key, setKey })
                      }
                      onUpdateSet={(setKey, patch) =>
                        engine.dispatch({ type: "updateSet", exerciseKey: we.key, setKey, patch })
                      }
                      onMoveSet={(setKey, toIndex) =>
                        engine.dispatch({ type: "moveSet", exerciseKey: we.key, setKey, toIndex })
                      }
                      onDragStart={(event) => handleExerciseDragStart(we.key, event)}
                      onDragEnd={() => {
                        setDraggingExercise(null);
                        setExerciseOverIndex(null);
                      }}
                      onSetDragStart={(setKey, event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", setKey);
                        setDraggingSet({ exerciseKey: we.key, setKey });
                      }}
                      onSetDragEnd={() => setDraggingSet(null)}
                    />
                  </div>
                </div>
              );
            })}
            {placeholderIndex === draft.exercises.length && placeholder}
            {diff?.removed
              .filter((r) => r.index >= draft.exercises.length)
              .map((r) => <RemovedExerciseCard key={`removed-${r.exercise.key}`} exercise={r.exercise} />)}
          </div>
        )}
        </div>
        </div>
      </div>

      <EditorFooter
        ref={footerRef}
        status={status}
        errorMessage={state.errorMessage}
        finishing={finishing}
        onRetry={() => void engine.retry()}
        onFinish={requestFinish}
        review={review !== null}
      />

      {deleteOpen && state.workoutId !== null && (
        <DeleteWorkoutDialog
          workout={{ id: state.workoutId, name: crumbName }}
          planId={planId}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => router.push(`/planos/${planId}`)}
          api={{
            remove: async (id) => {
              // Settle the autosave first: a debounced or in-flight save must not race the
              // DELETE (or land after it). Its outcome does not matter, the workout is going.
              await engine.flush();
              await deleteWorkout(id);
              // Gone: no later edit or retry may PATCH it (the engine outlives this page).
              engine.dispose();
            },
          }}
        />
      )}
      {leaveConfirm && (
        <ConfirmDialog
          title={leaveConfirm === "busy" ? "A IA ainda está trabalhando" : "Proposta não aplicada"}
          confirmLabel="Sair mesmo assim"
          onConfirm={async () => {
            chat.stop();
            engine.discardProposal();
          }}
          errorMessage={() => "Não foi possível sair agora. Tente novamente."}
          onDone={() => {
            setLeaveConfirm(null);
            void handleFinish();
          }}
          onClose={() => setLeaveConfirm(null)}
        >
          <p>
            {leaveConfirm === "busy"
              ? "Se sair agora, a mensagem em andamento é interrompida e o progresso do assistente será perdido. O treino não é alterado."
              : "A proposta da IA ainda não foi aplicada. Se sair agora, ela será descartada e o treino continua como estava salvo."}
          </p>
        </ConfirmDialog>
      )}
      {addOpen && (
        <AddExerciseDialog
          atCap={atCap}
          onClose={() => setAddOpen(false)}
          onPick={(exercise) => engine.dispatch({ type: "addExercise", exercise })}
        />
      )}
      {cloneOpen && (
        <CloneWorkoutDialog
          onClose={() => setCloneOpen(false)}
          onPick={(source) => {
            const seed = fromFullWorkout(source, { keepIds: false });
            const overCap = exceedsCaps(seed.exercises);
            if (overCap) {
              engine.fail(overCap);
              return;
            }
            engine.dispatch({ type: "seed", workout: seed });
          }}
        />
      )}
    </div>
    {assistantEnabled && panelOpen && (
      <AiChatPanel
        state={chatState}
        onInput={chat.setInput}
        onSend={() => void chat.send()}
        onStop={chat.stop}
        onRetry={() => void chat.retry()}
        onClose={() => setPanelOpen(false)}
      />
    )}
    </div>
  );
}
