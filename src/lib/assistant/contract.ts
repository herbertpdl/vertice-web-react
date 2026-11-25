import type {
  AssistantErrorCode,
  AssistantHistoryTurn,
  AssistantProposalEntry,
  AssistantStage,
  AssistantTextEvent,
  Exercise,
  ExerciseSetEntry,
  KeyedWorkoutExerciseEntry,
  SetStrategy,
  WorkoutChatRequest,
} from "@/lib/api/types";

import { setStrategyLabels } from "@/lib/validation/exerciseSets";

export type { AssistantErrorCode, AssistantStage, KeyedWorkoutExerciseEntry, WorkoutChatRequest };

/**
 * `POST /assistant/workout-chat` (vertice-bff `docs/api-contract.md`, "AI workout assistant"). The
 * wire types are the generated ones (`types.ts`); the stream's events arrive as SSE text, so their
 * payloads are parsed and shape-checked here (`parseAssistantEvent`), and nothing past that
 * function trusts the wire.
 */

export const ASSISTANT_MESSAGE_MAX = 2000;
export const HISTORY_MAX_TURNS = 20;
export const HISTORY_MAX_CHARS = 40_000;
/** R21: no new stage or text for this long ends the message. */
export const NO_PROGRESS_TIMEOUT_MS = 60_000;

export type HistoryTurn = AssistantHistoryTurn;

/** The `line` values this build knows; any other is dropped and its text treated as answer text. */
export type AssistantTextLine = NonNullable<AssistantTextEvent["line"]>;
const TEXT_LINES: readonly AssistantTextLine[] = ["left_out", "anamnese_conflict"];

/** One exercise of a proposal, as parsed: the generated entry with `exercise` checked. */
export type ProposalExercise = AssistantProposalEntry;

export type AssistantEvent =
  /** `exercise`: on `building_sets`, the 1-based position of the exercise being written. */
  | { type: "stage"; stage: string; exercise?: number }
  /**
   * `line` (client-anamnese D11): one whole line of its own, `left_out` (AI-R51) or
   * `anamnese_conflict` (R30). Absent on answer text, which is appended to what came before.
   */
  | { type: "text"; text: string; line?: AssistantTextLine }
  | { type: "proposal"; exercises: ProposalExercise[] }
  | { type: "done" }
  | { type: "error"; code: string; message: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseExercise(value: unknown): Exercise | null {
  if (!isObject(value) || typeof value.id !== "number" || typeof value.name !== "string") return null;
  const groups = Array.isArray(value.muscleGroups) ? value.muscleGroups : [];
  return {
    id: value.id,
    name: value.name,
    description: typeof value.description === "string" ? value.description : "",
    videoUrl: typeof value.videoUrl === "string" ? value.videoUrl : "",
    muscleGroups: groups.filter(
      (g): g is Exercise["muscleGroups"][number] =>
        isObject(g) && typeof g.id === "number" && typeof g.name === "string",
    ),
    isStarter: value.isStarter === true,
  };
}

const optionalNumber = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const optionalString = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

function parseSet(value: unknown): ExerciseSetEntry | null {
  if (!isObject(value)) return null;
  const strategy = value.strategy ?? "STRAIGHT";
  if (typeof strategy !== "string" || !Object.hasOwn(setStrategyLabels, strategy)) return null;
  return {
    reps: optionalNumber(value.reps),
    durationSeconds: optionalNumber(value.durationSeconds),
    weight: optionalString(value.weight),
    loadPercentage: optionalString(value.loadPercentage),
    strategy: strategy as SetStrategy,
    restSeconds: optionalNumber(value.restSeconds),
    notes: optionalString(value.notes),
  };
}

function parseProposalExercise(value: unknown): ProposalExercise | null {
  if (!isObject(value)) return null;
  const exercise = parseExercise(value.exercise);
  if (!exercise || !Array.isArray(value.sets)) return null;
  const sets = value.sets.map(parseSet);
  if (sets.some((s) => s === null)) return null;
  return {
    key: typeof value.key === "string" && value.key !== "" ? value.key : null,
    exerciseId: exercise.id,
    exercise,
    restSecondsBetweenSets: optionalNumber(value.restSecondsBetweenSets),
    notes: typeof value.notes === "string" ? value.notes : undefined,
    sets: sets as ExerciseSetEntry[],
  };
}

/**
 * One SSE event (its `event:` name and its `data:` text) as an `AssistantEvent`, or `null` when
 * the name is unknown or the payload malformed. A malformed proposal is `null` too: the BFF
 * validates every proposal (R32), so one that does not parse here is dropped, never half-shown.
 */
export function parseAssistantEvent(name: string, data: string): AssistantEvent | null {
  let payload: unknown = undefined;
  if (data !== "") {
    try {
      payload = JSON.parse(data);
    } catch {
      return null;
    }
  }
  switch (name) {
    case "stage":
      return isObject(payload) && typeof payload.stage === "string"
        ? {
            type: "stage",
            stage: payload.stage,
            ...(typeof payload.exercise === "number" && payload.exercise > 0
              ? { exercise: payload.exercise }
              : {}),
          }
        : null;
    case "text":
      if (!isObject(payload) || typeof payload.delta !== "string") return null;
      return TEXT_LINES.includes(payload.line as AssistantTextLine)
        ? { type: "text", text: payload.delta, line: payload.line as AssistantTextLine }
        : { type: "text", text: payload.delta };
    case "proposal": {
      if (!isObject(payload) || !Array.isArray(payload.exercises)) return null;
      const exercises = payload.exercises.map(parseProposalExercise);
      if (exercises.some((e) => e === null)) return null;
      return { type: "proposal", exercises: exercises as ProposalExercise[] };
    }
    case "done":
      return { type: "done" };
    case "error":
      return isObject(payload) && typeof payload.code === "string"
        ? {
            type: "error",
            code: payload.code,
            message: typeof payload.message === "string" ? payload.message : "",
          }
        : { type: "error", code: "AI_ERROR", message: "" };
    default:
      return null;
  }
}
