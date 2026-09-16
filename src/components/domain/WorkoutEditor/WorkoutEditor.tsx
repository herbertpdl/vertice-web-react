"use client";

import { useEffect, useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ChevronRight, CircleAlert, Dumbbell, TriangleAlert } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Dropdown, PageLoadingOverlay, TextField } from "@/components/ui";
import { AddExerciseDialog } from "../AddExerciseDialog";
import { CloneWorkoutDialog } from "../CloneWorkoutDialog";
import { EditorFooter } from "../EditorFooter";
import { WorkoutExerciseCard, type CardDragState } from "../WorkoutExerciseCard";
import { fetchFullWorkout } from "@/lib/api/workouts";
import { fetchTrainingPlan } from "@/lib/api/trainingPlans";
import { fetchStudent } from "@/lib/api/students";
import { DAY_ORDER, DAY_NAMES_LONG } from "@/lib/days";
import { useRedirectOnError } from "@/lib/hooks/useRedirectOnError";
import type { AutosaveTransport } from "@/lib/workoutEditor/autosave";
import {
  DEFAULT_WORKOUT_NAME,
  MAX_EXERCISES,
  emptyWorkout,
  exceedsCaps,
  fromFullWorkout,
  type EditorWorkout,
} from "@/lib/workoutEditor/model";
import { useWorkoutAutosave } from "@/lib/workoutEditor/useWorkoutAutosave";
import type { DayOfWeek } from "@/lib/api/types";

const dayOptions = DAY_ORDER.map((day) => ({ value: day, label: DAY_NAMES_LONG[day] }));

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
  delayMs?: number;
}

export function WorkoutEditorSession({
  planId,
  workoutId,
  initial,
  planName,
  clientId,
  studentName,
  transport,
  delayMs,
}: WorkoutEditorSessionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

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
        window.history.replaceState(null, "", `/planos/${planId}/treinos/${savedId}`);
      }
    },
  });
  const { draft, status, refusal } = state;

  const [addOpen, setAddOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Drag and drop (native HTML5): which exercise / set is being dragged and
  // where it would land.
  const [draggingExercise, setDraggingExercise] = useState<string | null>(null);
  const [exerciseOverIndex, setExerciseOverIndex] = useState<number | null>(null);
  const [draggingSet, setDraggingSet] = useState<{ exerciseKey: string; setKey: string } | null>(null);

  // Leaving warns only while something could still be lost (R12).
  const warnOnLeave = status === "saving" || status === "error";
  useEffect(() => {
    if (!warnOnLeave) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [warnOnLeave]);

  const atCap = draft.exercises.length >= MAX_EXERCISES;
  const offerClone = state.openedAsNew && draft.exercises.length === 0;
  const crumbName = draft.name.trim() || DEFAULT_WORKOUT_NAME;

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
    <div className="relative flex w-full flex-col">
      <div className="flex w-full flex-col gap-[var(--space-6)] px-[var(--space-8)] py-[var(--space-8)]">
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

        <div className="flex w-full items-start justify-between gap-[var(--space-4)]">
          <div className="flex items-start gap-[var(--space-4)]">
            <TextField
              label="Nome do treino"
              placeholder="Treino A — Superior"
              value={draft.name}
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
            {headerActions}
          </div>
        </div>

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

        {draft.exercises.length === 0 ? (
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
                  {placeholderIndex === index && placeholder}
                  <div onDragOver={(event) => handleCardDragOver(event, index)}>
                    <WorkoutExerciseCard
                      exercise={we}
                      position={index + 1}
                      dragState={dragState}
                      refused={refusal?.exerciseKeys.includes(we.key)}
                      refusedSetKeys={refusal?.setKeys}
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
          </div>
        )}
      </div>

      <EditorFooter
        status={status}
        errorMessage={state.errorMessage}
        finishing={finishing}
        onRetry={() => void engine.retry()}
        onFinish={() => void handleFinish()}
      />

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
  );
}
