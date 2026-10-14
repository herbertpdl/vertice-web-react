export type Role = "TRAINER" | "CLIENT" | "ADMIN";

/** `GET /auth/me`: the caller's own account. No CPF (no screen shows it; P1-03). */
export interface Me {
  id: number;
  name: string;
  email: string;
  /** `""` for anyone but a trainer who set one. */
  cref: string;
  role: Role;
}

/** The `user` in the login and register responses. */
export type SessionUser = Pick<Me, "id" | "name" | "email" | "role">;

/**
 * `GET /clients/:id`, the overview's `student`, and the `POST`/`PATCH /clients` responses. `cpf`
 * is masked (`***.***.***-25`, `""` when the client has none) except in the response to
 * `GET /clients/:id?reveal=cpf`. Never send a masked value back as a CPF.
 */
export interface ClientDetail {
  id: number;
  name: string;
  email: string;
  cpf: string;
  role: Role;
}

/** A first-access token (`POST /clients`, `POST /clients/:id/setup-token`). Shown once. */
export interface PasswordSetup {
  token: string;
  expiresAt: string;
}

/** `POST /clients`: the new client plus their first-access token (`null` if issuing it failed). */
export interface CreatedStudent extends ClientDetail {
  setup: PasswordSetup | null;
}

export interface CurrentPlanInfo {
  id: number;
  name: string;
  endDate: string;
}

export type WeekdayLabel = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";

export interface WeekActivityDay {
  date: string;
  dayOfWeek: WeekdayLabel;
  completed: boolean;
}

/**
 * One roster row (`GET /clients`). No CPF, CREF or role. The BFF still sends a deprecated `email`
 * until this web stops reading it (P1-03); it is left out of the type so nothing does.
 */
export interface ClientSummary {
  id: number;
  name: string;
  activePlanCount: number;
  currentPlan: CurrentPlanInfo | null;
  lastWorkoutAt: string | null;
  weekActivity: WeekActivityDay[];
}

export type PlanLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export interface StudentDetailOverview {
  student: ClientDetail;
  activePlan: {
    id: number;
    name: string;
    level: PlanLevel;
    startDate: string;
    endDate: string;
  } | null;
  thisWeek: { completed: number; total: number };
  lastWorkoutAt: string | null;
  adherence4Weeks: number | null;
}

export interface MuscleGroup {
  id: number;
  name: string;
}

export interface Exercise {
  id: number;
  name: string;
  description: string;
  videoUrl: string;
  /** Upstream order: primary group first on starter rows; id order on a trainer's own exercise. */
  muscleGroups: MuscleGroup[];
  /** Part of the platform's starter set: read-only for every trainer. */
  isStarter: boolean;
}

export interface ExerciseProgressPoint {
  weekStartDate: string;
  weight: string;
}

export interface TrainingPlan {
  id: number;
  name: string;
  description: string;
  trainerId: number;
  clientId: number;
  startDate: string;
  endDate: string;
  level: PlanLevel;
}

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface Workout {
  id: number;
  name: string;
  trainingPlanId: number;
  dayOfWeek: DayOfWeek;
}

export interface RecentWorkoutSummary extends Workout {
  studentName: string;
  planName: string;
  exerciseCount: number;
}

export type SetStrategy =
  | "STRAIGHT"
  | "WARM_UP"
  | "BACKOFF"
  | "DROPSET"
  | "REST_PAUSE"
  | "CLUSTER"
  | "AMRAP"
  | "ISOMETRIC_HOLD"
  | "FAILURE";

export interface ExerciseSet {
  id: number;
  workoutExerciseId: number;
  setNumber: number;
  reps?: number;
  durationSeconds?: number;
  weight?: string;
  loadPercentage?: string;
  strategy: SetStrategy;
  restSeconds?: number;
  notes?: string;
}

export interface WorkoutExercise {
  id: number;
  workoutId: number;
  exerciseId: number;
  order: number;
  restSecondsBetweenSets: number;
  notes: string;
}

export interface FullWorkoutExercise extends WorkoutExercise {
  exercise: Exercise;
  sets: ExerciseSet[];
}

export interface FullWorkout extends Workout {
  exercises: FullWorkoutExercise[];
}

// Nested entries for POST /training-plans/:planId/workouts and
// PUT /workouts/:workoutId/exercises. No `order`/`setNumber`: list position is
// the order. Decimals cross the wire as strings; omitted = unset.
export interface ExerciseSetEntry {
  reps?: number;
  durationSeconds?: number;
  weight?: string;
  loadPercentage?: string;
  strategy?: SetStrategy;
  restSeconds?: number;
  notes?: string;
}

export interface WorkoutExerciseEntry {
  exerciseId: number;
  restSecondsBetweenSets?: number;
  notes?: string;
  sets?: ExerciseSetEntry[];
}

export interface WorkoutLog {
  id: number;
  workoutId: number;
  clientId: number;
  weekStartDate: string;
  startedAt: string;
  completedAt: string;
}

export interface WorkoutFeedback {
  id: number;
  workoutLogId: number;
  workoutId: number;
  trainingPlanId: number;
  clientId: number;
  text: string;
  createdAt: string;
}

export interface EnrichedFeedback extends WorkoutFeedback {
  clientName: string;
  workoutName: string;
  trainingPlanName: string;
}

export interface DashboardData {
  stats: {
    activeClients: number;
    activePlans: number;
    recentFeedbackCount: number;
    expiringPlansCount: number;
  };
  recentFeedback: EnrichedFeedback[];
  expiringPlans: { name: string; student: string; end: string; daysLeft: number }[];
  completedToday: { student: string; workout: string; time: string }[];
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
