# Spec: Client Anamnese (Web)

Status: Approved for implementation (design-ok 2026-11-25)
Owner: hebertpdl@gmail.com
Related: source PRD [vertice-api `docs/prds/client-anamnese/prd.md`](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/client-anamnese/prd.md)
(rules `R#`, edge cases `E#`; there is no web PRD for this slug), web assessment
[docs/assessments/client-anamnese/assessment.md](../../assessments/client-anamnese/assessment.md)
(findings `F#`, questions `Q#`), BFF spec
[vertice-bff `docs/specs/client-anamnese/spec.md`](https://github.com/herbertpdl/vertice-bff/blob/main/docs/specs/client-anamnese/spec.md),
[AI assistant spec](../ai-workout-assistant/spec.md). Design: `Vertice Web.pen`, section `c1tY9`
(frames `dqvZj`, `tIQlg`, `o5L6n`, `w43OJl`, `kTLc2`, `ik5C5`, `QSfhj`, `jKyn1`, `ZgCb4`, `h49po`,
`iDTb7`, `iIb3w`, `k1OeP5`, `x9k4ZI`, `s0yr3`). Ticket: VRT-60.

## 0. Scope decisions

- **D1 — The tab is in the URL (F3, Q5; R9, R28).** `/alunos/:id?aba=planos|feedbacks|progresso|anamnese`.
  `page.tsx` reads `searchParams.aba` and passes the initial tab; an absent or unknown value is
  "planos". Switching tabs calls `router.replace` (no history entry), so a reload keeps the tab and
  the panel's links can open the Anamnese tab directly. The map is closed (`src/lib/studentTabs.ts`).
- **D2 — Draft and baseline, no autosave (F5; R12, R15, R20).** `src/lib/anamnese/draft.ts` is a
  pure module: the tab keeps `{ draft, baseline, updatedAt }`, seeded once from the first read.
  `dirty = draft !== baseline`. A later read (refetch on focus, a save in another browser tab) is
  adopted only while the draft is clean; while dirty it is ignored. Only this tab's own `PUT`
  response rebases the baseline and `updatedAt`. Unit-tested.
- **D3 — The text box is a domain textarea from tokens, not a kit change (F15).** The kit
  `TextArea` stays as it is (no Pencil sync or audit). The box has no `maxLength` (E2: a 6,000
  character paste stays whole); the counter `N / 5.000` is always shown, in UTF-16 units
  (`ANAMNESE_MAX` in `bounds.ts`, helpers in `src/lib/validation/anamnese.ts`). Over the limit:
  red border and counter, "O texto passou do limite. Apague N caracteres para poder salvar.",
  "Salvar" disabled (R11, frame `h49po`). "Salvar" is also disabled while nothing changed.
- **D4 — Saving (R12–R14, R19, E4, E5; frames `jKyn1`, `ZgCb4`).** `PUT /clients/:id/anamnese`
  with the text as typed (never trimmed). While saving the box is read-only and the button shows
  "Salvando…". On success the query `["student", id, "anamnese"]` is set from the response,
  `["students"]` (the badge) and `["assistant", "anamnese-notice"]` (an editor's strip in this
  browser tab) are invalidated. A blank text comes back as the empty state (`updatedAt: null`),
  so "Atualizada em" disappears (R19). "Atualizada em dd/mm/aaaa" uses `formatInstantDate`.
- **D5 — Failures keep the text (F13; Q7).** A failed save is an inline line above the counter,
  "Não foi possível salvar a anamnese. Seu texto continua aqui." with "Tentar novamente"; never a
  redirect. A 403 on the save (the relationship ended mid-edit, R7) says "Você não acompanha mais
  este aluno. Seu texto continua aqui." with no retry. A failed read shows "Não foi possível
  carregar a anamnese" with "Tentar novamente" (`w43OJl`); loading shows skeletons (`o5L6n`). A
  403 on the read is left to the page's overview query, which already bounces to `/alunos`.
- **D6 — Leave guard, option B (F4, Q4, Q9; R15, E3, E24).** `useLeaveGuard(when)` in
  `src/lib/hooks/`, owned by `StudentDetailContent` (the tab reports `dirty` up):
  `beforeunload` while dirty (E24); a capture-phase click listener that intercepts same-origin,
  unmodified, primary-button, non-`_blank` links to another path, opens the designed dialog
  (`QSfhj`: "Sair sem salvar a anamnese?", "Continuar editando" / "Sair sem salvar") and
  `router.push`es the link on confirm; and `confirmLeave(action)` for the tab switch and
  "Encerrar acompanhamento" (asks before its own dialog). The link predicate is a pure function,
  unit-tested. Accepted gaps (owner, Q4): browser back/forward and the profile menu's "Sair".
  The workout editor keeps its own guard.
- **D7 — R39.** The tab reads `GET /assistant/status` (`assistantStatusQueryKey`); the side card's
  AI sentence shows only on `enabled: true`. Pending or failed hides it (`tIQlg`, E21).
- **D8 — Side card copy (F9, Q3).** "Só você vê no app. <primeiro nome> não vê este texto no
  aplicativo, mas pode recebê-lo se pedir uma cópia dos seus dados." The card and the "O que
  escrever" topics are static copy (R16, R17).
- **D9 — Roster badge (F14; R21, E5).** `Badge variant="warning"` "Sem anamnese" from
  `ClientSummary.hasAnamnese === false`, after "Suspenso", both `shrink-0` (`iDTb7`).
- **D10 — Panel strip (F8, Q2, Q8; R25–R29, E11–E13).** `WorkoutEditorSession` reads
  `GET /assistant/anamnese-notice?trainingPlanId=` under `["assistant", "anamnese-notice",
  planId]`, `staleTime: 0`, only while the assistant is enabled and its panel is open, so each
  panel open and each window focus while open refetches (the strip follows a save in another
  browser tab, E13). It never reads the anamnese text. `AiChatPanel` gets `anamneseNotice`:
  `present` → "A IA usa a anamnese de <nome> como referência para montar o treino." + "Ver
  anamnese" (`iIb3w`); `missing` → "<nome> ainda não tem anamnese." + the explanation + "Preencher
  anamnese" (`k1OeP5`); `unavailable` (a former trainer), pending or failed → no strip. Links are
  `target="_blank" rel="noopener noreferrer"` to `/alunos/<client.id>?aba=anamnese`; the editor's
  own link guard already ignores `_blank`, so the chat stays (R28).
- **D11 — Chat lines (F6, Q6; R30, R31, E15, E25).** `parseAssistantEvent` keeps a `text`
  event's `line` when it is `left_out` or `anamnese_conflict`, and drops any other value (the
  `delta` stays, appended as plain text). The chat store pushes each event with a known `line` as
  its own message (`kind: "left_out" | "conflict"`) and closes the open text bubble, so E25 shows
  two separate lines in arrival order, also after a text answer. The panel renders them as icon
  lines (`circle-minus` and the warning triangle, frames `x9k4ZI`, `s0yr3`). Both go into the
  history as assistant turns, like the ready line.
- **D12 — Out of scope.** The privacy text (web#109, live), the chat request (the BFF reads the
  anamnese, E14), export, deletion, admin and mobile.

## 1. Files

- `src/lib/api/.bff-ref` → vertice-bff `8c9048744f86c4aa223a992b0fc666cec38ece0d` (bff#80);
  `schema.ts` regenerated. `types.ts`: `ClientAnamnese`, `SaveClientAnamneseRequest`,
  `AnamneseNotice`.
- `src/lib/api/anamnese.ts`: `anamneseQueryKey`, `fetchAnamnese`, `saveAnamnese`.
  `src/lib/api/assistant.ts`: `anamneseNoticeQueryKey`, `fetchAnamneseNotice`.
- `src/lib/validation/bounds.ts` (`ANAMNESE_MAX`), `src/lib/validation/anamnese.ts`,
  `src/lib/anamnese/draft.ts`, `src/lib/studentTabs.ts`, `src/lib/hooks/useLeaveGuard.ts`.
- `src/app/(app)/alunos/[studentId]/AnamneseTab.tsx` (+ stories), `StudentDetailContent.tsx`
  (+ stories), `page.tsx`; `AlunosContent.tsx` (+ stories).
- `src/lib/assistant/{contract,chat,copy}.ts`, `AiChatPanel.tsx` (+ stories), `WorkoutEditor.tsx`.

## 2. Tests

- `unit`: `anamnese.test.ts` (blank rule with U+00A0/line breaks, UTF-16 counter at the
  boundary with a surrogate pair, the over-limit count), `draft.test.ts` (seed, dirty, refetch
  adopted only when clean, rebase on own save, blank save), `studentTabs.test.ts`,
  `useLeaveGuard` predicate test, `chat.test.ts` (E25 order, conflict after a text answer, unknown
  `line` appended, history), `contract.test.ts` cases for `line`.
- `storybook`: `AnamneseTab` (empty with AI on/off, saved, dirty, over limit with a 6,000
  character paste, loading, load error, save error, saving), `StudentDetailContent` (E3 dialog,
  `?aba=anamnese`), `AlunosContent` badge rows, `AiChatPanel` strip states and E25 lines.
- By hand on a running stack: `beforeunload` (E24) and the cross-tab flow (E13).

## 3. Merge and deploy order

`vertice-api` (api#109) → web privacy text (web#109) → `vertice-ai` (ai#14) → `vertice-bff`
(bff#80) → **this PR**, last: its types come from the BFF's merged `docs/openapi.json`, and every
route it calls must already be live. All upstream PRs are merged and deployed. Rollback: revert
this PR first; the BFF's routes are additive, so an older web simply doesn't call them (and an
older web merges `left_out`/`anamnese_conflict` lines into one text bubble, never losing text).
