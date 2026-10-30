/**
 * Generated from vertice-bff's OpenAPI document. Do not edit by hand.
 * Source:    herbertpdl/vertice-bff@ffc2dacb43133964d2986f1e579a552c173ee81e:docs/openapi.json
 * Spec:      vertice-bff 0.1.0 (OpenAPI 3.1.0)
 * Generator: openapi-typescript@7.13.0
 *
 * Regenerate with `npm run api:types` after bumping src/lib/api/.bff-ref.
 * The app's own aliases over these types live in src/lib/api/types.ts.
 */

export interface paths {
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Liveness
         * @description Public: no token needed.
         */
        get: operations["getHealth"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Log in
         * @description Public: no token needed. The password is checked by vertice-api. A wrong password, an unknown email and an account with no password yet all get the same 401 `UNAUTHORIZED` “Invalid email or password”. Failed attempts are rate limited.
         */
        post: operations["login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Register a trainer
         * @description Public: no token needed. Public sign-up is for trainers only (`role: "TRAINER"`); a client is created by their trainer (`POST /clients`). `acceptedTermsVersion` is required: no account is created without an acceptance on record. A taken email or CPF is 409 `CONFLICT`, the same body for both. Every attempt is rate limited.
         */
        post: operations["register"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The caller’s own account
         * @description Any authenticated role. The CPF is masked, with no reveal; the full value is in the data export.
         */
        get: operations["getMe"];
        put?: never;
        post?: never;
        /**
         * Delete the caller’s own account
         * @description Any authenticated role. LGPD art. 18 VI. Re-checks `password` first (a wrong one is 400 `INVALID_CURRENT_PASSWORD`, not a 401). A trainer with active clients gets 409 `ACTIVE_CLIENTS`. Every token of the account stops working afterwards.
         */
        delete: operations["deleteMe"];
        options?: never;
        head?: never;
        /**
         * Correct the caller’s own profile
         * @description Any authenticated role. LGPD art. 18 III. Every field is optional and an omitted one keeps the stored value. The role cannot change. `cpf`: a string sets it (the mask `GET /auth/me` returns is refused), `null` removes it (a trainer’s CPF is required). `cref` is a trainer’s only. No email verification yet.
         */
        patch: operations["updateMe"];
        trace?: never;
    };
    "/api/auth/me/trainer": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The client’s trainer and the contacts they share
         * @description Roles: CLIENT. The caller’s active trainer: the name always; `email`, `whatsapp`, `instagram` only when the trainer shows them and filled them in (`""` otherwise). 404 when the client has no active trainer.
         */
        get: operations["getMyTrainer"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/me/export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Download the caller’s data
         * @description Any authenticated role. LGPD art. 18 II and V. vertice-api’s export document, passed through as a file download (`Content-Disposition: attachment; filename="vertice-dados-YYYY-MM-DD.json"`). Over the export bounds it is 413 `TOO_LARGE` rather than a truncated file. 3 per hour per user.
         */
        get: operations["exportMyData"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/me/consent": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Record the caller’s consent to a legal text
         * @description Any authenticated role. Self only: there is no user id in the request. `TERMS` is the Terms of Use / Privacy Policy, `HEALTH_DATA` the health-data notice. A later call replaces the earlier record of that type.
         */
        post: operations["recordConsent"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Change the caller’s password
         * @description Any authenticated role. A wrong `currentPassword` is 400 `INVALID_CURRENT_PASSWORD`, not a 401: the session is still valid.
         */
        post: operations["changePassword"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/password/setup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Choose a password with a first-access token
         * @description Public: no token needed. The token comes from `POST /clients` or `POST /clients/{id}/setup-token`. An unknown, expired (72h) or used token is 400 `INVALID_SETUP_TOKEN`. Failed attempts are rate limited. On success the answer says whose first access it was (`role`, `email`), never before the token is used: the web shows a CLIENT the “use the app” screen with the email filled in. No session is created; log in normally.
         */
        post: operations["setupPassword"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/clients": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The trainer’s roster
         * @description Roles: TRAINER. No email, CPF, CREF or role: the detail routes carry the email. `lastWorkoutAt` and `weekActivity` only reflect the current week.
         */
        get: operations["listClients"];
        put?: never;
        /**
         * Create a client
         * @description Roles: TRAINER. Creates a CLIENT without a password, linked to the trainer, and issues a first-access token (`setup`) the trainer shares; the client redeems it at `POST /auth/password/setup`. `cpf` is optional. A taken email or CPF is 409 `CONFLICT`.
         */
        post: operations["createClient"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/clients/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * A client’s details
         * @description Roles: TRAINER. One of your clients. The CPF is masked unless `reveal=cpf`; every reveal is logged (who saw whose CPF, never the value). Any other query is a 400.
         */
        get: operations["getClient"];
        put?: never;
        post?: never;
        /**
         * End the relationship with a client
         * @description Roles: TRAINER. “Encerrar acompanhamento”: the client leaves the roster and the trainer loses what the link grants. It does not delete the client’s account; their plans and logs stay.
         */
        delete: operations["endClientRelationship"];
        options?: never;
        head?: never;
        /**
         * Update a client
         * @description Roles: TRAINER. One of your clients. `name` and `email` are required. `cpf`: omitted keeps the stored CPF, a string sets it (`""` removes it), `null` removes it; a masked value is a 400. A taken email or CPF is 409 `CONFLICT`.
         */
        patch: operations["updateClient"];
        trace?: never;
    };
    "/api/clients/{id}/overview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The header of a client’s detail screen
         * @description Roles: TRAINER. One of your clients. `adherence4Weeks` is an approximation over the last 4 weeks (vertice-api has no general history query).
         */
        get: operations["getClientOverview"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/clients/{id}/setup-token": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Re-issue a client’s first-access link
         * @description Roles: TRAINER. One of your clients. The previous token stops working. Only while the client has no password yet: afterwards it is 409 `PRECONDITION_FAILED`.
         */
        post: operations["reissueClientSetupToken"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exercises": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * One page of the exercise catalog
         * @description Roles: TRAINER, ADMIN. A trainer sees the starter set and their own exercises; an ADMIN the starter set only. In upstream order: do not re-sort client-side. An empty `muscleGroupId` or `q` means no filter. Always paged (30 by default, at most 50): follow `nextCursor` with the same filter for more.
         */
        get: operations["listExercises"];
        put?: never;
        /**
         * Create an exercise
         * @description Roles: TRAINER. Private to the caller (`isStarter: false`). Duplicate names are allowed.
         */
        post: operations["createExercise"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exercises/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * One exercise
         * @description Any authenticated role. Vertice-api decides visibility. A TRAINER sees the starter set and their own, an ADMIN the starter set, a CLIENT only an exercise used by a workout in one of their plans.
         */
        get: operations["getExercise"];
        put?: never;
        post?: never;
        /**
         * Delete an exercise
         * @description Roles: TRAINER. Your own. 409 `PRECONDITION_FAILED` while any workout uses it.
         */
        delete: operations["deleteExercise"];
        options?: never;
        head?: never;
        /**
         * Replace an exercise
         * @description Roles: TRAINER. Full replacement of name, description, video URL and the whole group list. A starter exercise or another trainer’s is 403 (the two are not told apart).
         */
        patch: operations["updateExercise"];
        trace?: never;
    };
    "/api/exercises/{id}/progress": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Weight over time for one exercise
         * @description Roles: TRAINER, CLIENT. A CLIENT’s `clientId` is ignored (their own is used); a TRAINER must pass one of their clients.
         */
        get: operations["getExerciseProgress"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/muscle-groups": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the muscle groups
         * @description Any authenticated role. Reference data in id order; ids are database-generated, do not hardcode them.
         */
        get: operations["listMuscleGroups"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/training-plans": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List training plans
         * @description Roles: TRAINER, CLIENT. A CLIENT gets their own plans (`clientId` is ignored); a TRAINER their own, optionally filtered by `clientId`.
         */
        get: operations["listTrainingPlans"];
        put?: never;
        /**
         * Create a training plan
         * @description Roles: TRAINER. For one of their clients (403 otherwise). vertice-api also requires an active trainer-client link: without one it is 409 `PRECONDITION_FAILED`.
         */
        post: operations["createTrainingPlan"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/training-plans/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * A training plan with its workouts
         * @description Roles: TRAINER, CLIENT. On their own plan.
         */
        get: operations["getTrainingPlan"];
        put?: never;
        post?: never;
        /**
         * Delete a training plan
         * @description Roles: TRAINER. Your own plan. 409 `PRECONDITION_FAILED` once a client recorded training under it.
         */
        delete: operations["deleteTrainingPlan"];
        options?: never;
        head?: never;
        /**
         * Update a training plan
         * @description Roles: TRAINER. Your own plan. A plan’s client is fixed at creation: a `clientId` in the body is ignored.
         */
        patch: operations["updateTrainingPlan"];
        trace?: never;
    };
    "/api/training-plans/{planId}/workouts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The workouts of a plan
         * @description Roles: TRAINER, CLIENT. On their own plan.
         */
        get: operations["listPlanWorkouts"];
        put?: never;
        /**
         * Create a workout, with its exercises and sets
         * @description Roles: TRAINER. On their own plan. `exercises` is optional (omitted or `[]` creates an empty workout), at most 20, each with at most 10 `sets`. List position is the order. All or nothing. Every `exerciseId` must be visible to the trainer (the starter set or their own): another trainer’s private exercise and a nonexistent id both get 400.
         */
        post: operations["createWorkout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workouts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The trainer’s workouts across every plan
         * @description Roles: TRAINER. Powers the clone picker. `recent=true` is the only supported mode (anything else is a 400). Sorted by workout id descending.
         */
        get: operations["listRecentWorkouts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workouts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * One workout
         * @description Roles: TRAINER, CLIENT. On their own plan.
         */
        get: operations["getWorkout"];
        put?: never;
        post?: never;
        /**
         * Delete a workout
         * @description Roles: TRAINER. On their own plan. 409 `PRECONDITION_FAILED` once a client recorded training under it.
         */
        delete: operations["deleteWorkout"];
        options?: never;
        head?: never;
        /**
         * Rename a workout or move it to another day
         * @description Roles: TRAINER. On their own plan.
         */
        patch: operations["updateWorkout"];
        trace?: never;
    };
    "/api/workouts/{id}/full": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * A workout with its exercises and sets
         * @description Roles: TRAINER, CLIENT. On their own plan. One call renders a whole workout; sorted by `order` and `setNumber`.
         */
        get: operations["getFullWorkout"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workouts/{id}/clone": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Clone a workout into a plan
         * @description Roles: TRAINER. The source workout and the target plan must both be the trainer’s. Copies the exercises and sets.
         */
        post: operations["cloneWorkout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workouts/{workoutId}/exercises": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The exercises of a workout
         * @description Roles: TRAINER, CLIENT. On their own plan.
         */
        get: operations["listWorkoutExercises"];
        /**
         * Replace the whole exercise and set tree of a workout
         * @description Roles: TRAINER. On their own plan. Full replace, not merge: `[]` empties the workout. Upstream deletes and recreates the tree, so every `WorkoutExercise` and `ExerciseSet` id in the response is new. 409 `PRECONDITION_FAILED` once any set under the workout has recorded client data. All or nothing.
         */
        put: operations["replaceWorkoutExercises"];
        /**
         * Add an exercise to a workout
         * @description Roles: TRAINER. On their own plan. `exerciseId` must be visible to the trainer (the starter set or their own): another trainer’s private exercise and a nonexistent id both get 400.
         */
        post: operations["addWorkoutExercise"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workout-exercises/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Remove an exercise from a workout
         * @description Roles: TRAINER. On their own plan. 409 `PRECONDITION_FAILED` once a client recorded training under it.
         */
        delete: operations["deleteWorkoutExercise"];
        options?: never;
        head?: never;
        /**
         * Update a workout exercise
         * @description Roles: TRAINER. On their own plan.
         */
        patch: operations["updateWorkoutExercise"];
        trace?: never;
    };
    "/api/workout-exercises/{workoutExerciseId}/sets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The sets of a workout exercise
         * @description Roles: TRAINER, CLIENT. On their own plan.
         */
        get: operations["listExerciseSets"];
        put?: never;
        /**
         * Add a set to a workout exercise
         * @description Roles: TRAINER. On their own plan. `weight` and `loadPercentage` are decimal strings.
         */
        post: operations["createExerciseSet"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/exercise-sets/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Delete a set
         * @description Roles: TRAINER. On their own plan. 409 `PRECONDITION_FAILED` once a client recorded training under it.
         */
        delete: operations["deleteExerciseSet"];
        options?: never;
        head?: never;
        /**
         * Update a set
         * @description Roles: TRAINER. On their own plan.
         */
        patch: operations["updateExerciseSet"];
        trace?: never;
    };
    "/api/workouts/{workoutId}/session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The “do a workout” screen in one call
         * @description Roles: CLIENT. Starts (or resumes) the week’s log and merges in what was recorded last time per set (`lastPerformed`) and this session’s (`current`). The caller’s own session: CLIENT only (a trainer reads logs through `GET /workout-logs`). 409 when no log exists for an earlier week (logs are only started in the current one).
         */
        get: operations["getWorkoutSession"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workouts/{workoutId}/session/restart": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Redo the week’s finished workout
         * @description Roles: CLIENT. Starts a new session next to the week’s completed one (or returns the one already in progress), in the same `WorkoutSession` shape. Finishing it replaces the completed session; discarding it keeps the original. Current week only (409 for an earlier one).
         */
        post: operations["restartWorkoutSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workout-logs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Which workouts were done in a week
         * @description Roles: TRAINER, CLIENT. Vertice-api scopes this to one plan and one week, so `trainingPlanId` is required. A CLIENT’s `clientId` is ignored; a TRAINER must pass one of their clients. The plan must belong to that client and to the caller.
         */
        get: operations["listWorkoutLogs"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workout-logs/{workoutLogId}/feedback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Send feedback on a workout log
         * @description Roles: CLIENT. On their own log. 409 unless the session is completed, or when it was finished automatically (no feedback then).
         */
        post: operations["submitWorkoutFeedback"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workout-sessions/{workoutLogId}/sets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Record one set’s actual performance
         * @description Roles: CLIENT. On their own log. `exerciseSetId` must be a set of the log’s workout; a missing set gets the same 400, so the answer never tells “someone else’s set” from “no such set”.
         */
        post: operations["recordSetLog"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workout-sessions/{workoutLogId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Discard a session in progress
         * @description Roles: CLIENT. On their own log: deletes it with its set logs. 409 once it is completed.
         */
        delete: operations["discardWorkoutLog"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workout-sessions/{workoutLogId}/sets/{exerciseSetId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Untick a set
         * @description Roles: CLIENT. On their own log: deletes the set’s log (none is fine). 409 once the session is completed.
         */
        delete: operations["deleteSetLog"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/workout-sessions/{workoutLogId}/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Mark a workout log done
         * @description Roles: CLIENT. On their own log.
         */
        post: operations["completeWorkoutLog"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/feedback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The trainer’s feedback, newest first
         * @description Roles: TRAINER. Not scoped to one client: filter by `clientId` client-side.
         */
        get: operations["listFeedback"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/dashboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The trainer dashboard
         * @description Roles: TRAINER. Stat tiles, recent feedback, plans nearing their end and workouts completed today, in one call. "Today" and "this week" are the business day and week in America/Sao_Paulo.
         */
        get: operations["getDashboard"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/legal/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Current versions of the legal texts
         * @description Public: no token needed. Public and cacheable (`Cache-Control: public, max-age=300`). The web sends `terms` as `acceptedTermsVersion` on register and both versions to `POST /auth/me/consent`, and compares them with `GET /auth/me`’s `consent` to tell whether a stored consent is outdated.
         */
        get: operations["getLegalVersions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        AuthSession: {
            token: string;
            user: components["schemas"]["SessionUser"];
        };
        ChangePasswordRequest: {
            currentPassword: string;
            newPassword: string;
        };
        ClientDetail: {
            id: number;
            name: string;
            email: string;
            /** @description Masked (`***.***.***-25`, `""` when none) unless `?reveal=cpf`. */
            cpf: string;
            role: components["schemas"]["Role"];
        };
        ClientOverview: {
            student: components["schemas"]["ClientDetail"];
            activePlan: {
                id: number;
                name: string;
                level: components["schemas"]["PlanLevel"];
                /** @description Business date, `YYYY-MM-DD`: a calendar day in America/Sao_Paulo, with no time and no zone. Never put it through a UTC conversion — `new Date("2026-10-31")` is UTC midnight, which renders as 30/10/2026 in Brazil. */
                startDate: string;
                /** @description Business date, `YYYY-MM-DD`: a calendar day in America/Sao_Paulo, with no time and no zone. Never put it through a UTC conversion — `new Date("2026-10-31")` is UTC midnight, which renders as 30/10/2026 in Brazil. */
                endDate: string;
            } | null;
            thisWeek: {
                completed: number;
                total: number;
            };
            lastWorkoutAt: string | null;
            /** @description Approximate percentage, capped at 100. */
            adherence4Weeks: number | null;
        };
        ClientSummary: {
            id: number;
            name: string;
            activePlanCount: number;
            /** @description The date-active plan (startDate <= today <= endDate), null if none. */
            currentPlan: {
                id: number;
                name: string;
                /** @description Business date, `YYYY-MM-DD`: a calendar day in America/Sao_Paulo, with no time and no zone. Never put it through a UTC conversion — `new Date("2026-10-31")` is UTC midnight, which renders as 30/10/2026 in Brazil. */
                endDate: string;
            } | null;
            /** @description Most recent completed log in the current week only. An ISO-8601 instant in UTC (`Z`): format it in America/Sao_Paulo. */
            lastWorkoutAt: string | null;
            /** @description Monday to Friday of the current week. */
            weekActivity: {
                /** @description Business date, `YYYY-MM-DD`: a calendar day in America/Sao_Paulo, with no time and no zone. Never put it through a UTC conversion — `new Date("2026-10-31")` is UTC midnight, which renders as 30/10/2026 in Brazil. */
                date: string;
                dayOfWeek: components["schemas"]["Weekday"];
                completed: boolean;
            }[];
        };
        ClientTrainer: {
            name: string;
            /** @description `""` unless the trainer shows it. */
            email: string;
            /** @description Digits with area code; `""` unless the trainer shows it. */
            whatsapp: string;
            /** @description Handle without `@`; `""` unless the trainer shows it. */
            instagram: string;
        };
        CloneWorkoutRequest: {
            targetTrainingPlanId: number;
            name: string;
            dayOfWeek: components["schemas"]["DayOfWeek"];
        };
        /**
         * @description Who finished it: the client, or the weekly rollover (`AUTO`); `""` in progress.
         * @enum {string}
         */
        CompletionKind: "CLIENT" | "AUTO" | "";
        Consent: {
            /** @description Terms of Use / Privacy Policy version accepted, null if never. */
            termsVersion: string | null;
            termsAcceptedAt: string | null;
            /** @description Health-data notice version consented to, null if never. */
            healthDataVersion: string | null;
            healthDataConsentAt: string | null;
        };
        ConsentRequest: {
            /** @enum {string} */
            type: "TERMS" | "HEALTH_DATA";
            version: string;
        };
        CreateClientRequest: {
            name: string;
            /** Format: email */
            email: string;
            cpf?: string;
        };
        CreateWorkoutExerciseRequest: {
            exerciseId: number;
            order: number;
            /** @default 0 */
            restSecondsBetweenSets?: number;
            /** @default  */
            notes?: string;
        };
        CreateWorkoutRequest: {
            name: string;
            dayOfWeek: components["schemas"]["DayOfWeek"];
            /** @default [] */
            exercises?: components["schemas"]["WorkoutExerciseEntry"][];
        };
        CreatedClient: {
            id: number;
            name: string;
            email: string;
            /** @description Masked (`***.***.***-25`, `""` when none) unless `?reveal=cpf`. */
            cpf: string;
            role: components["schemas"]["Role"];
            /** @description Null only when the client was created but issuing the token failed: re-issue it. */
            setup: components["schemas"]["PasswordSetupToken"] | null;
        };
        Dashboard: {
            stats: {
                activeClients: number;
                activePlans: number;
                recentFeedbackCount: number;
                expiringPlansCount: number;
            };
            recentFeedback: components["schemas"]["EnrichedFeedback"][];
            expiringPlans: {
                name: string;
                student: string;
                /** @description Business date, `YYYY-MM-DD`: a calendar day in America/Sao_Paulo, with no time and no zone. Never put it through a UTC conversion — `new Date("2026-10-31")` is UTC midnight, which renders as 30/10/2026 in Brazil. */
                end: string;
                daysLeft: number;
            }[];
            completedToday: {
                student: string;
                workout: string;
                /**
                 * @deprecated
                 * @description DEPRECATED, use `completedAt`. The `HH:MM` wall clock of the completion in America/Sao_Paulo — a pre-formatted local time, with the zone implicit, which is why it is going away. It is kept only so clients can migrate: it used to be the UTC clock (`completedAt.slice(11, 16)`), which displayed an evening workout about 3 hours early, and it now reads correctly. It will be removed once vertice-web-react reads `completedAt`.
                 */
                time: string;
                /** @description When the workout was completed, as an ISO-8601 instant in UTC (`Z`). Prefer this over the deprecated `time`: format the clock in America/Sao_Paulo (`Intl.DateTimeFormat` with `timeZone`), e.g. 20:30. "Today" is still the server's: the entries are the completions whose business day in America/Sao_Paulo is today. */
                completedAt: string;
            }[];
        };
        DataExport: {
            formatVersion: unknown;
            exportedAt: unknown;
            /** @description CPF and CREF in full: it is the user’s own copy. */
            profile: unknown;
            consent: unknown;
            relationships: unknown;
            plans: unknown;
            workoutLogs: unknown;
            exercises: unknown;
        } & {
            [key: string]: unknown;
        };
        /** @enum {string} */
        DayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
        DeleteAccountRequest: {
            password: string;
        };
        EnrichedFeedback: {
            id: number;
            workoutLogId: number;
            workoutId: number;
            trainingPlanId: number;
            clientId: number;
            /** @description `""` when the client only rated the workout. */
            text: string;
            /** @description Null on feedback given before ratings existed. */
            rating: components["schemas"]["FeedbackRating"] | null;
            /** @description The session was replaced by a redo finished in the same week. */
            replaced: boolean;
            /** @description ISO-8601 instant, UTC (`Z`). An absolute point in time. Format it for display in a time zone (the business zone is America/Sao_Paulo) — never read the clock or the calendar day off the string, and never assume a fixed -03:00 (instants from before 2019 are -02:00). */
            createdAt: string;
            clientName: string;
            workoutName: string;
            trainingPlanName: string;
        };
        /** @enum {string} */
        ErrorCode: "VALIDATION_ERROR" | "UNAUTHORIZED" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "PRECONDITION_FAILED" | "TOO_LARGE" | "RATE_LIMITED" | "UPSTREAM_ERROR" | "UPSTREAM_UNAVAILABLE" | "INTERNAL_ERROR" | "INVALID_CURRENT_PASSWORD" | "INVALID_SETUP_TOKEN" | "ACTIVE_CLIENTS";
        ErrorResponse: {
            error: {
                /** @description Machine-readable. Key on this, never on `message`. */
                code: components["schemas"]["ErrorCode"];
                /** @description English, for logs and debugging; not meant to be shown to users. */
                message: string;
                /** @description Only on the BFF’s own validation errors (`VALIDATION_ERROR`): Zod’s flattened field errors, `{ formErrors: string[], fieldErrors: { [field]: string[] } }`. Never set from upstream. */
                details?: unknown;
            };
        };
        Exercise: {
            id: number;
            name: string;
            description: string;
            videoUrl: string;
            /** @description Upstream order: primary group first, then the others by id. */
            muscleGroups: components["schemas"]["MuscleGroup"][];
            /** @description Part of the shared, read-only starter set. */
            isStarter: boolean;
        };
        ExercisePage: {
            /** @description In upstream order: do not re-sort client-side. */
            exercises: components["schemas"]["Exercise"][];
            /** @description Send back as `cursor` (same filter) for the next page; `null` on the last page. */
            nextCursor: string | null;
        };
        ExerciseRequest: {
            name: string;
            /** @default  */
            description?: string;
            videoUrl?: string | "";
            muscleGroupIds: number[];
        };
        ExerciseSet: {
            id: number;
            workoutExerciseId: number;
            setNumber: number;
            reps: number;
            durationSeconds: number;
            /** @description Decimal string; `""` is unset. Do not round-trip through a float. */
            weight: string;
            /** @description Decimal string; `""` is unset. */
            loadPercentage: string;
            strategy: components["schemas"]["SetStrategy"];
            restSeconds: number;
            notes: string;
        };
        ExerciseSetEntry: {
            reps?: number;
            durationSeconds?: number;
            weight?: string | "";
            loadPercentage?: string | "";
            strategy?: components["schemas"]["SetStrategy"];
            restSeconds?: number;
            notes?: string;
        };
        ExerciseSetRequest: {
            setNumber: number;
            reps?: number;
            durationSeconds?: number;
            weight?: string | "";
            loadPercentage?: string | "";
            strategy: components["schemas"]["SetStrategy"];
            restSeconds?: number;
            notes?: string;
        };
        /**
         * @description How hard the workout felt, hardest first.
         * @enum {string}
         */
        FeedbackRating: "VERY_HARD" | "HARD" | "JUST_RIGHT" | "EASY" | "VERY_EASY";
        FullWorkout: {
            id: number;
            name: string;
            trainingPlanId: number;
            dayOfWeek: components["schemas"]["DayOfWeek"];
            exercises: {
                id: number;
                workoutId: number;
                exerciseId: number;
                order: number;
                restSecondsBetweenSets: number;
                notes: string;
                exercise: components["schemas"]["Exercise"];
                sets: components["schemas"]["ExerciseSet"][];
            }[];
        };
        Health: {
            /** @constant */
            status: "ok";
        };
        LegalVersions: {
            /** @description Sent as `acceptedTermsVersion` on register and as the `TERMS` consent version. */
            terms: string;
            /** @description Sent as the `HEALTH_DATA` consent version. */
            healthData: string;
        };
        LoginRequest: {
            /** Format: email */
            email: string;
            password: string;
        };
        Me: {
            id: number;
            name: string;
            email: string;
            /** @description Masked (`***.***.***-25`), `""` when none. Never revealed here. */
            cpf: string;
            /** @description `""` for anyone but a trainer who set one. */
            cref: string;
            role: components["schemas"]["Role"];
            /** @description A trainer's WhatsApp, digits only; `""` when none. */
            whatsapp: string;
            /** @description A trainer's Instagram handle without `@`; `""` when none. */
            instagram: string;
            /** @description Whether the trainer shows their e-mail to their clients. */
            showEmail: boolean;
            showWhatsapp: boolean;
            showInstagram: boolean;
            consent: components["schemas"]["Consent"];
        };
        MuscleGroup: {
            id: number;
            name: string;
        };
        PasswordSetupRequest: {
            token: string;
            newPassword: string;
        };
        PasswordSetupResult: {
            /** @description Whose first access it was: the web shows a CLIENT the “use the app” screen. */
            role: components["schemas"]["Role"];
            /** @description The account’s email, so the client can be sent to the app with it filled in. */
            email: string;
        };
        PasswordSetupToken: {
            /** @description Single-use, URL-safe. Shown once: upstream only stores its hash. */
            token: string;
            /** @description ISO-8601 instant, UTC (`Z`). An absolute point in time. Format it for display in a time zone (the business zone is America/Sao_Paulo) — never read the clock or the calendar day off the string, and never assume a fixed -03:00 (instants from before 2019 are -02:00). */
            expiresAt: string;
        };
        /** @enum {string} */
        PlanLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
        ProgressPoint: {
            /** @description Business date, `YYYY-MM-DD`: a calendar day in America/Sao_Paulo, with no time and no zone. Never put it through a UTC conversion — `new Date("2026-10-31")` is UTC midnight, which renders as 30/10/2026 in Brazil. */
            weekStartDate: string;
            weight: number;
        };
        RecentWorkoutSummary: {
            id: number;
            name: string;
            trainingPlanId: number;
            dayOfWeek: components["schemas"]["DayOfWeek"];
            studentName: string;
            planName: string;
            exerciseCount: number;
        };
        RecordSetLogRequest: {
            exerciseSetId: number;
            weight: string | "";
            reps: number;
        };
        RegisterRequest: {
            name: string;
            /** Format: email */
            email: string;
            password: string;
            /** @constant */
            role: "TRAINER";
            cpf: string;
            cref?: string;
            acceptedTermsVersion: string;
        };
        ReplaceWorkoutExercisesRequest: {
            exercises: components["schemas"]["WorkoutExerciseEntry"][];
        };
        /** @enum {string} */
        Role: "ADMIN" | "TRAINER" | "CLIENT";
        SessionUser: {
            id: number;
            name: string;
            email: string;
            role: components["schemas"]["Role"];
        };
        SetLog: {
            id: number;
            workoutLogId: number;
            exerciseSetId: number;
            /** @description Decimal string; `""` when the set was ticked without a weight. */
            weight: string;
            reps: number;
            /** @description ISO-8601 instant, UTC (`Z`). An absolute point in time. Format it for display in a time zone (the business zone is America/Sao_Paulo) — never read the clock or the calendar day off the string, and never assume a fixed -03:00 (instants from before 2019 are -02:00). */
            recordedAt: string;
        };
        /** @enum {string} */
        SetStrategy: "STRAIGHT" | "WARM_UP" | "BACKOFF" | "DROPSET" | "REST_PAUSE" | "CLUSTER" | "AMRAP" | "ISOMETRIC_HOLD" | "FAILURE";
        SubmitFeedbackRequest: {
            /** @enum {string} */
            rating: "VERY_HARD" | "HARD" | "JUST_RIGHT" | "EASY" | "VERY_EASY";
            /** @default  */
            text?: string;
            /** @description Idempotency key: a resend with the same key returns the stored feedback, not a duplicate. */
            clientKey?: string;
        };
        TrainingPlan: {
            id: number;
            name: string;
            description: string;
            trainerId: number;
            clientId: number;
            /** @description Business date, `YYYY-MM-DD`: a calendar day in America/Sao_Paulo, with no time and no zone. Never put it through a UTC conversion — `new Date("2026-10-31")` is UTC midnight, which renders as 30/10/2026 in Brazil. */
            startDate: string;
            /** @description Business date, `YYYY-MM-DD`: a calendar day in America/Sao_Paulo, with no time and no zone. Never put it through a UTC conversion — `new Date("2026-10-31")` is UTC midnight, which renders as 30/10/2026 in Brazil. */
            endDate: string;
            level: components["schemas"]["PlanLevel"];
        };
        TrainingPlanDetail: {
            id: number;
            name: string;
            description: string;
            trainerId: number;
            clientId: number;
            /** @description Business date, `YYYY-MM-DD`: a calendar day in America/Sao_Paulo, with no time and no zone. Never put it through a UTC conversion — `new Date("2026-10-31")` is UTC midnight, which renders as 30/10/2026 in Brazil. */
            startDate: string;
            /** @description Business date, `YYYY-MM-DD`: a calendar day in America/Sao_Paulo, with no time and no zone. Never put it through a UTC conversion — `new Date("2026-10-31")` is UTC midnight, which renders as 30/10/2026 in Brazil. */
            endDate: string;
            level: components["schemas"]["PlanLevel"];
            workouts: components["schemas"]["Workout"][];
        };
        TrainingPlanRequest: {
            name: string;
            /** @default  */
            description?: string;
            clientId: number;
            startDate: string;
            endDate: string;
            level: components["schemas"]["PlanLevel"];
        };
        UpdateClientRequest: {
            name: string;
            /** Format: email */
            email: string;
            cpf?: string | null;
        };
        UpdateMeRequest: {
            name?: string;
            /** Format: email */
            email?: string;
            cpf?: string | null;
            cref?: string | null;
            whatsapp?: string | null;
            instagram?: string | null;
            showEmail?: boolean;
            showWhatsapp?: boolean;
            showInstagram?: boolean;
        };
        UpdateTrainingPlanRequest: {
            name: string;
            /** @default  */
            description?: string;
            startDate: string;
            endDate: string;
            level: components["schemas"]["PlanLevel"];
        };
        UpdateWorkoutExerciseRequest: {
            order: number;
            /** @default 0 */
            restSecondsBetweenSets?: number;
            /** @default  */
            notes?: string;
        };
        /** @enum {string} */
        Weekday: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";
        Workout: {
            id: number;
            name: string;
            trainingPlanId: number;
            dayOfWeek: components["schemas"]["DayOfWeek"];
        };
        WorkoutExercise: {
            id: number;
            workoutId: number;
            exerciseId: number;
            order: number;
            restSecondsBetweenSets: number;
            notes: string;
        };
        WorkoutExerciseEntry: {
            exerciseId: number;
            restSecondsBetweenSets?: number;
            notes?: string;
            /** @default [] */
            sets?: components["schemas"]["ExerciseSetEntry"][];
        };
        WorkoutFeedback: {
            id: number;
            workoutLogId: number;
            workoutId: number;
            trainingPlanId: number;
            clientId: number;
            /** @description `""` when the client only rated the workout. */
            text: string;
            /** @description Null on feedback given before ratings existed. */
            rating: components["schemas"]["FeedbackRating"] | null;
            /** @description The session was replaced by a redo finished in the same week. */
            replaced: boolean;
            /** @description ISO-8601 instant, UTC (`Z`). An absolute point in time. Format it for display in a time zone (the business zone is America/Sao_Paulo) — never read the clock or the calendar day off the string, and never assume a fixed -03:00 (instants from before 2019 are -02:00). */
            createdAt: string;
        };
        WorkoutLog: {
            id: number;
            workoutId: number;
            clientId: number;
            /** @description Business date, `YYYY-MM-DD`: a calendar day in America/Sao_Paulo, with no time and no zone. Never put it through a UTC conversion — `new Date("2026-10-31")` is UTC midnight, which renders as 30/10/2026 in Brazil. */
            weekStartDate: string;
            /** @description ISO-8601 instant, UTC (`Z`). An absolute point in time. Format it for display in a time zone (the business zone is America/Sao_Paulo) — never read the clock or the calendar day off the string, and never assume a fixed -03:00 (instants from before 2019 are -02:00). */
            startedAt: string;
            /** @description ISO-8601 instant, `""` until the workout is completed. */
            completedAt: string;
            status: components["schemas"]["WorkoutLogStatus"];
            completionKind: components["schemas"]["CompletionKind"];
        };
        /**
         * @description `SUPERSEDED`: replaced by a redo finished in the same week (never in the week list).
         * @enum {string}
         */
        WorkoutLogStatus: "IN_PROGRESS" | "COMPLETED" | "SUPERSEDED";
        WorkoutRequest: {
            name: string;
            dayOfWeek: components["schemas"]["DayOfWeek"];
        };
        WorkoutSession: {
            id: number;
            name: string;
            trainingPlanId: number;
            dayOfWeek: components["schemas"]["DayOfWeek"];
            exercises: {
                id: number;
                workoutId: number;
                exerciseId: number;
                order: number;
                restSecondsBetweenSets: number;
                notes: string;
                exercise: components["schemas"]["Exercise"];
                sets: {
                    id: number;
                    workoutExerciseId: number;
                    setNumber: number;
                    reps: number;
                    durationSeconds: number;
                    /** @description Decimal string; `""` is unset. Do not round-trip through a float. */
                    weight: string;
                    /** @description Decimal string; `""` is unset. */
                    loadPercentage: string;
                    strategy: components["schemas"]["SetStrategy"];
                    restSeconds: number;
                    notes: string;
                    /** @description What the client recorded last time, null if never. */
                    lastPerformed: components["schemas"]["SetLog"] | null;
                    /** @description What this session recorded for the set (it's ticked), null if not: resumes a session on another device. */
                    current: components["schemas"]["SetLog"] | null;
                }[];
            }[];
            workoutLog: components["schemas"]["WorkoutLog"];
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getHealth: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The process is up. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Health"];
                };
            };
        };
    };
    login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginRequest"];
            };
        };
        responses: {
            /** @description The session token and the user. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthSession"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Rate limited (`RATE_LIMITED`); `Retry-After` carries the seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    register: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegisterRequest"];
            };
        };
        responses: {
            /** @description The session token and the user. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthSession"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Rate limited (`RATE_LIMITED`); `Retry-After` carries the seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getMe: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The caller’s account and consent state. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Me"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    deleteMe: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeleteAccountRequest"];
            };
        };
        responses: {
            /** @description Deleted; no body. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Rate limited (`RATE_LIMITED`); `Retry-After` carries the seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    updateMe: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateMeRequest"];
            };
        };
        responses: {
            /** @description The updated account. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Me"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getMyTrainer: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The trainer card. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientTrainer"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    exportMyData: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The export document. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DataExport"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The requested data is too large to return (`TOO_LARGE`). */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Rate limited (`RATE_LIMITED`); `Retry-After` carries the seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    recordConsent: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConsentRequest"];
            };
        };
        responses: {
            /** @description The caller’s consent state after the change. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Consent"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    changePassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChangePasswordRequest"];
            };
        };
        responses: {
            /** @description Changed; no body. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Rate limited (`RATE_LIMITED`); `Retry-After` carries the seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    setupPassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PasswordSetupRequest"];
            };
        };
        responses: {
            /** @description Password set: the account’s role and email. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PasswordSetupResult"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Rate limited (`RATE_LIMITED`); `Retry-After` carries the seconds to wait. */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listClients: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description One entry per active client. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientSummary"][];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    createClient: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateClientRequest"];
            };
        };
        responses: {
            /** @description The client, with the setup token. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreatedClient"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getClient: {
        parameters: {
            query?: {
                reveal?: "cpf";
            };
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The client. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientDetail"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    endClientRelationship: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Ended; no body. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    updateClient: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateClientRequest"];
            };
        };
        responses: {
            /** @description The updated client (CPF masked). */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientDetail"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getClientOverview: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Active plan, this week’s progress, last workout and adherence. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientOverview"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    reissueClientSetupToken: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The new token. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PasswordSetupToken"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listExercises: {
        parameters: {
            query?: {
                /** @description Exercises with this group as primary or secondary. */
                muscleGroupId?: number;
                /** @description Case-insensitive name search, trimmed. */
                q?: string;
                /** @description Page size; 30 when absent. */
                limit?: number;
                /** @description `nextCursor` of the previous page. Opaque; a malformed one is a 400. */
                cursor?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description One page of exercises. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExercisePage"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    createExercise: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExerciseRequest"];
            };
        };
        responses: {
            /** @description The exercise. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Exercise"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getExercise: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The exercise. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Exercise"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    deleteExercise: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted; no body. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    updateExercise: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExerciseRequest"];
            };
        };
        responses: {
            /** @description The exercise. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Exercise"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getExerciseProgress: {
        parameters: {
            query?: {
                /** @description Required for a TRAINER. */
                clientId?: number;
            };
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description One point per week. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProgressPoint"][];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listMuscleGroups: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The muscle groups. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MuscleGroup"][];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listTrainingPlans: {
        parameters: {
            query?: {
                /** @description A TRAINER’s filter. */
                clientId?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The plans. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingPlan"][];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    createTrainingPlan: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TrainingPlanRequest"];
            };
        };
        responses: {
            /** @description The plan. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingPlan"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getTrainingPlan: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The plan and its workouts. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingPlanDetail"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    deleteTrainingPlan: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted; no body. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    updateTrainingPlan: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateTrainingPlanRequest"];
            };
        };
        responses: {
            /** @description The plan. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TrainingPlan"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listPlanWorkouts: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                planId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The workouts. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Workout"][];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    createWorkout: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                planId: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateWorkoutRequest"];
            };
        };
        responses: {
            /** @description The workout with every new exercise and set id. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FullWorkout"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listRecentWorkouts: {
        parameters: {
            query: {
                recent: "true";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The workouts, with student, plan and exercise count. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RecentWorkoutSummary"][];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getWorkout: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The workout. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Workout"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    deleteWorkout: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted; no body. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    updateWorkout: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["WorkoutRequest"];
            };
        };
        responses: {
            /** @description The workout. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Workout"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getFullWorkout: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The workout tree. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FullWorkout"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    cloneWorkout: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CloneWorkoutRequest"];
            };
        };
        responses: {
            /** @description The new workout. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Workout"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listWorkoutExercises: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workoutId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The workout exercises. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkoutExercise"][];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    replaceWorkoutExercises: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workoutId: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReplaceWorkoutExercisesRequest"];
            };
        };
        responses: {
            /** @description The workout with its new tree. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FullWorkout"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    addWorkoutExercise: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workoutId: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateWorkoutExerciseRequest"];
            };
        };
        responses: {
            /** @description The workout exercise. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkoutExercise"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    deleteWorkoutExercise: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted; no body. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    updateWorkoutExercise: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateWorkoutExerciseRequest"];
            };
        };
        responses: {
            /** @description The workout exercise. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkoutExercise"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listExerciseSets: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workoutExerciseId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The sets. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExerciseSet"][];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    createExerciseSet: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workoutExerciseId: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExerciseSetRequest"];
            };
        };
        responses: {
            /** @description The set. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExerciseSet"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    deleteExerciseSet: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted; no body. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    updateExerciseSet: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExerciseSetRequest"];
            };
        };
        responses: {
            /** @description The set. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ExerciseSet"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getWorkoutSession: {
        parameters: {
            query?: {
                /** @description A business date, and a Monday. Defaults to the current week’s Monday in America/Sao_Paulo. */
                weekStartDate?: string;
            };
            header?: never;
            path: {
                workoutId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The workout, its sets with last results, and the week’s log. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkoutSession"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    restartWorkoutSession: {
        parameters: {
            query?: {
                /** @description A business date, and a Monday. Defaults to the current week’s Monday in America/Sao_Paulo. */
                weekStartDate?: string;
            };
            header?: never;
            path: {
                workoutId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The workout, its sets and the redo session. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkoutSession"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listWorkoutLogs: {
        parameters: {
            query: {
                /** @description Required. */
                trainingPlanId: number;
                /** @description A business date, and a Monday. Defaults to the current week’s Monday in America/Sao_Paulo. */
                weekStartDate?: string;
                /** @description Required for a TRAINER. */
                clientId?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The logs of that week. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkoutLog"][];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    submitWorkoutFeedback: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workoutLogId: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SubmitFeedbackRequest"];
            };
        };
        responses: {
            /** @description The feedback. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkoutFeedback"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    recordSetLog: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workoutLogId: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RecordSetLogRequest"];
            };
        };
        responses: {
            /** @description The set log. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SetLog"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    discardWorkoutLog: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workoutLogId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Discarded. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    deleteSetLog: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workoutLogId: number;
                exerciseSetId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Unticked. */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict with the current state (`CONFLICT`, `PRECONDITION_FAILED`, `ACTIVE_CLIENTS`). */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    completeWorkoutLog: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                workoutLogId: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The completed log. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WorkoutLog"];
                };
            };
            /** @description A malformed path id, query or body (`VALIDATION_ERROR` with field `details`), or a route-specific 400 code. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not found (`NOT_FOUND`). */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    listFeedback: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Feedback with client, workout and plan names. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnrichedFeedback"][];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getDashboard: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The dashboard. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Dashboard"];
                };
            };
            /** @description Missing, invalid or expired token (`UNAUTHORIZED`), or the account no longer exists (`UNAUTHENTICATED`). */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description The role or the owner check refuses the caller (`FORBIDDEN`). */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getLegalVersions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The current versions. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LegalVersions"];
                };
            };
        };
    };
}
