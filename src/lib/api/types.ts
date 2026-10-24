/**
 * The BFF's transport types, every one of them an alias over `schema.ts`, which
 * `npm run api:types` generates from vertice-bff's published OpenAPI document (XREPO-013).
 * Nothing here is hand-maintained: a contract change lands by bumping `.bff-ref` and
 * regenerating, and CI's `npm run api:types -- --check` fails when this app's copy is stale.
 *
 * Only the wire shapes live here. The app's own types (the workout editor's draft model,
 * component props, the `*Input` shapes its forms produce) stay where they are used, and so do
 * the pt-BR label maps: form-field labels in `src/lib/validation/*`, weekday labels in
 * `src/lib/days.ts`, role labels next to the header that shows them. One copy of each, keyed by
 * the union here that it labels (see CLAUDE.md, "src/lib/validation/*.ts").
 *
 * The names are this app's, not the spec's, where the two differ (`StudentDetailOverview` for
 * `ClientOverview`, ...): the screens read "student" and the BFF's module is "clients".
 */
import type { components } from "./schema";

type Schemas = components["schemas"];

export type Role = Schemas["Role"];

/** `GET /auth/me`: the caller's own account. No CPF reveal here (no screen shows it; P1-03). */
export type Me = Schemas["Me"];

/**
 * The caller's recorded consents (`GET /auth/me`'s `consent`, `POST /auth/me/consent`'s response).
 * Each pair is `null` when never given. Compare the versions with `src/lib/legal/versions.ts`:
 * null or different means "show the text and ask".
 */
export type Consent = Schemas["Consent"];

export type ConsentType = Schemas["ConsentRequest"]["type"];

/** The `user` in the login and register responses. */
export type SessionUser = Schemas["SessionUser"];

/** `POST /auth/password/setup`: whose first access it was (role and email only). */
export type PasswordSetupResult = Schemas["PasswordSetupResult"];

/**
 * `GET /clients/:id`, the overview's `student`, and the `POST`/`PATCH /clients` responses. `cpf`
 * is masked (`***.***.***-25`, `""` when the client has none) except in the response to
 * `GET /clients/:id?reveal=cpf`. Never send a masked value back as a CPF.
 */
export type ClientDetail = Schemas["ClientDetail"];

/** A first-access token (`POST /clients`, `POST /clients/:id/setup-token`). Shown once. */
export type PasswordSetup = Schemas["PasswordSetupToken"];

/** `POST /clients`: the new client plus their first-access token (`null` if issuing it failed). */
export type CreatedStudent = Schemas["CreatedClient"];

/** One roster row (`GET /clients`). No CPF, CREF, role or email (P1-03). */
export type ClientSummary = Schemas["ClientSummary"];

/** The roster row's date-active plan. */
export type CurrentPlanInfo = NonNullable<ClientSummary["currentPlan"]>;

/** Monday to Friday: the only days the roster's week strip covers. */
export type WeekdayLabel = Schemas["Weekday"];

export type WeekActivityDay = ClientSummary["weekActivity"][number];

export type PlanLevel = Schemas["PlanLevel"];

/** `GET /clients/:id/overview`. */
export type StudentDetailOverview = Schemas["ClientOverview"];

export type MuscleGroup = Schemas["MuscleGroup"];

export type Exercise = Schemas["Exercise"];

/**
 * One point of `GET /exercises/:id/progress`. `weight` is a **number** here, unlike every other
 * decimal in this contract (which crosses the wire as a string): the BFF parses it before
 * sending (`vertice-bff/src/modules/workout-sessions/service.ts`, `getExerciseProgress`).
 */
export type ExerciseProgressPoint = Schemas["ProgressPoint"];

export type TrainingPlan = Schemas["TrainingPlan"];

/** `GET /training-plans/:id`: the plan plus its workouts. */
export type TrainingPlanDetail = Schemas["TrainingPlanDetail"];

export type DayOfWeek = Schemas["DayOfWeek"];

export type Workout = Schemas["Workout"];

export type RecentWorkoutSummary = Schemas["RecentWorkoutSummary"];

export type SetStrategy = Schemas["SetStrategy"];

/**
 * A stored set. Every field is always present: proto3 zero-values reach the client as `0` / `""`,
 * which mean "unset" (`fromFullWorkout` in `src/lib/workoutEditor/model.ts` normalises them).
 */
export type ExerciseSet = Schemas["ExerciseSet"];

export type WorkoutExercise = Schemas["WorkoutExercise"];

export type FullWorkout = Schemas["FullWorkout"];

export type FullWorkoutExercise = FullWorkout["exercises"][number];

// Nested entries for POST /training-plans/:planId/workouts and
// PUT /workouts/:workoutId/exercises. No `order`/`setNumber`: list position is
// the order. Decimals cross the wire as strings; omitted = unset.
export type ExerciseSetEntry = Schemas["ExerciseSetEntry"];

export type WorkoutExerciseEntry = Schemas["WorkoutExerciseEntry"];

export type WorkoutLog = Schemas["WorkoutLog"];

export type WorkoutFeedback = Schemas["WorkoutFeedback"];

export type EnrichedFeedback = Schemas["EnrichedFeedback"];
export type FeedbackRating = Schemas["FeedbackRating"];

/** `GET /dashboard`. */
export type DashboardData = Schemas["Dashboard"];

/** `GET /legal/versions`. */
export type LegalVersions = Schemas["LegalVersions"];

/** Every error body the BFF sends: `{ error: { code, message, details? } }`. */
export type ApiErrorBody = Schemas["ErrorResponse"];

/** The codes the BFF documents. `ApiError.code` is wider: see `client.ts`. */
export type ApiErrorCode = Schemas["ErrorCode"];
