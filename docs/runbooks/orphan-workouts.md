# Runbook: empty workouts left by failed creates

> **Read-only.** The query below is a `SELECT`. It changes nothing. Do not turn it into a
> `DELETE`: an empty workout can also be one a trainer created on purpose (the editor saves a
> workout as soon as it is named). Deleting is the trainer's call, from the app.

## Why these exist

Before the fix for XREPO-001 (2026-10-09 audit, plan item P0-06), the workout editor's nested
create (`POST /training-plans/:planId/workouts`) could succeed upstream and still fail on the web:
a BFF that dropped `exercises` returned a body the editor could not map, the editor showed
"Erro ao salvar", and every "Tentar novamente" created another workout. Each of those is a
workout with no `workout_exercises`, usually several with the same name and weekday in one
plan ("Novo treino", the default name). The editor now keeps the id the first create returned
and retries as an update instead. A create whose response never arrives (dropped connection)
can still leave a duplicate; see §0 of
[docs/specs/create-workout-with-exercises/spec.md](../specs/create-workout-with-exercises/spec.md).

## Query

Run it against the `vertice-api` Postgres database (schema from
[`vertice-api/src/main/resources/db/migration`](https://github.com/herbertpdl/vertice-api/tree/main/src/main/resources/db/migration):
`workouts` V9/V16, `workout_exercises` V10, `training_plans` V3/V15, `users` V14,
`workout_logs` V18). To limit it to one trainer, add `AND tp.trainer_id = <id>` to the `WHERE`.

```sql
-- READ-ONLY: lists workouts with no exercises, for a trainer to review. Changes nothing.
SELECT
    tp.trainer_id,
    trainer.name    AS trainer_name,
    tp.id           AS training_plan_id,
    tp.name         AS training_plan_name,
    client.name     AS client_name,
    w.id            AS workout_id,
    w.name          AS workout_name,
    w.day_of_week,
    -- Another workout in the same plan with the same name and weekday: most likely a retry duplicate.
    EXISTS (
        SELECT 1
        FROM workouts sibling
        WHERE sibling.training_plan_id = w.training_plan_id
          AND sibling.id <> w.id
          AND sibling.name = w.name
          AND sibling.day_of_week = w.day_of_week
    )               AS has_same_name_sibling,
    -- A client started a session on it: not a leftover, keep it.
    EXISTS (
        SELECT 1 FROM workout_logs wl WHERE wl.workout_id = w.id
    )               AS has_workout_logs
FROM workouts w
JOIN training_plans tp ON tp.id = w.training_plan_id
JOIN users trainer     ON trainer.id = tp.trainer_id
JOIN users client      ON client.id = tp.client_id
WHERE NOT EXISTS (
    SELECT 1 FROM workout_exercises we WHERE we.workout_id = w.id
)
ORDER BY tp.trainer_id, tp.id, w.day_of_week, w.name, w.id;
```

There is no `created_at` on `workouts`, so the query can't tell when a row was made. Workout ids
are an identity column, so within a group of same-name siblings the lowest id is the oldest.

## What to do with the result

Send each trainer their rows. Rows with `has_same_name_sibling = true` and
`has_workout_logs = false` are the likely leftovers. The trainer opens the plan
(`/planos/<training_plan_id>`) and deletes the extras (deleting from the web arrives with plan
item P1-06; until then, `DELETE /api/workouts/:id` on the BFF as that trainer). Leave any row the
trainer recognises as intentional.
