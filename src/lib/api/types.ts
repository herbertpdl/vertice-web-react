export type Role = "TRAINER" | "CLIENT" | "ADMIN";

export interface User {
  id: number;
  name: string;
  email: string;
  cpf: string;
  cref?: string;
  role: Role;
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

export interface StudentOverview extends User {
  activePlanCount: number;
  currentPlan: CurrentPlanInfo | null;
  lastWorkoutAt: string | null;
  weekActivity: WeekActivityDay[];
}

export type PlanLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export interface StudentDetailOverview {
  student: User;
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

export type MuscleGroup =
  | "CHEST"
  | "BACK"
  | "LEGS"
  | "SHOULDERS"
  | "ARMS"
  | "CORE"
  | "CARDIO";

export interface Exercise {
  id: number;
  name: string;
  description: string;
  videoUrl: string;
  muscleGroup: MuscleGroup;
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
