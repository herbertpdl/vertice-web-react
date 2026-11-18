# PRD: AI Workout Assistant (Web)

Status: Approved (owner, 2026-11-18)
Design: pending — frames drafted in pen.dev section "Web — Assistente de IA no editor de treino (ai-workout-assistant)" (`kswLu`), awaiting the owner's review.
Owner: hebertpdl@gmail.com
Related: none in `docs/requirements.md` (new requirement from the owner: an AI assistant in the
workout editor that answers training questions and builds workout changes for the trainer to
review), [docs/prds/create-workout-with-exercises/prd.md](../create-workout-with-exercises/prd.md)
(the workout editor this adds to; its rules are referred to below as `WE-R#`/`WE-E#` and not
restated, except where §4 "Effect on the workout editor" says otherwise),
[vertice-api/docs/prds/create-workout-with-exercises/prd.md](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/create-workout-with-exercises/prd.md)
(the 20-exercise and 10-set limits and the recorded-data protection, `API-R8`/`R9`/`R12`),
[vertice-ai/docs/assessments/vertice-ai-foundation/assessment.md](https://github.com/herbertpdl/vertice-ai/blob/main/docs/assessments/vertice-ai-foundation/assessment.md)
(the AI platform this feature is the first user of)
Spec: not yet written (will be `docs/specs/ai-workout-assistant/spec.md`)

## 1. Summary

Building or adjusting a workout today means picking every exercise and typing every set by hand.
This feature puts an AI assistant inside the workout editor. The trainer opens a chat from an AI
icon, asks anything about training or about the workout on screen, and gets an answer. When the
trainer asks for a change ("add a finisher for legs", "make it 4 sets of 8 to 10"), the assistant
does not reply with text: it builds the changed workout and the editor shows it as real exercise
cards and sets, which the trainer reviews, adjusts and applies without adding anything manually.
Because the assistant can take a while, every step shows what is happening, and the trainer
cannot send another message until the current one is finished.

## 2. Actors

**Trainer**
- Can open the assistant from the workout editor, on a new or an existing workout.
- Can ask questions about training, exercise and the workout, and receive text answers.
- Can ask for changes to the workout's exercises and sets, review the proposal in the editor,
  adjust it by hand, then apply or discard it.
- Can stop a message that is still being processed.
- Cannot send a new message while one is being processed.
- Cannot edit the workout by hand while the assistant is building a change.
- Cannot use the assistant outside the workout editor, or on the mobile app.
- Cannot recover a conversation after leaving the editor.

**Client**
- Unaffected. Never sees the assistant and is never told that a workout was built with it.

## 3. Flows

**Trainer: ask a question**
1. In the workout editor, the trainer clicks the AI icon; the chat panel opens.
2. The trainer types a question and sends it. The send button turns into "Parar" and the input is
   locked; the editor stays usable.
3. The answer appears word by word as it is written. When it is complete, the input unlocks.

**Trainer: ask for a change and apply it**
1. In the open chat, the trainer asks for a change to the workout and sends it.
2. The input is locked, the send button turns into "Parar", and the editor becomes read-only
   under a "IA montando o treino…" overlay. The chat shows each stage as it happens (for
   example "Analisando o treino", "Escolhendo exercícios", "Montando séries").
3. The editor shows the proposed workout in review: new exercises and sets are marked "Novo",
   changed values are highlighted, removed exercises are shown struck through. The chat shows a
   one-line message that the proposal is ready to review.
4. The trainer reviews the proposal and, if they want, edits it by hand or asks the assistant
   for further changes in the chat.
5. The trainer presses "Aplicar". The workout is saved as it now stands on screen and the editor
   goes back to saving every change automatically (WE-R7).

**Trainer: discard a proposal**
1. With a proposal in review, the trainer presses "Descartar".
2. The editor shows the workout exactly as it was before the proposal; nothing was saved.

## 4. Rules

**Access**

- R1: Only trainers can use the assistant, and only in the web workout editor.
- R2: The assistant is available on a new workout that does not exist yet and on an existing
  workout alike.
- R3: The trainer opens the chat panel from an AI icon in the editor.
- R4: Closing and reopening the chat panel without leaving the editor keeps the conversation.
- R5: Leaving the editor ends the conversation; reopening the workout starts an empty chat.
- R6: Nothing a client sees shows whether the assistant was used to build a workout.

**Asking**

- R7: The assistant answers questions about training, exercise and the workout on screen.
- R8: When the trainer asks about something unrelated to training, the assistant politely says
  it only helps with training and invites a related question.
- R9: The assistant replies in the language the trainer writes in; Portuguese is the default.
- R10: A trainer's message has at most 2,000 characters; a counter appears near the limit and
  sending is blocked above it.
- R11: A permanent note under the chat input reads "A IA pode cometer erros. Revise antes de
  aplicar."
- R12: The assistant knows the workout on screen, its training plan's name, description, level
  and dates, and the plan's other workouts.
- R13: The assistant never receives the client's profile (name, email), recorded weights,
  workout logs or feedback; free text the trainer wrote (plan name and description, notes) is
  sent as written.

**While a message is being processed**

- R14: While a message is being processed, the trainer cannot send another message.
- R15: While a message is being processed, the send button is replaced by "Parar".
- R16: "Parar" ends the current message; the chat says it was stopped, the editor is unchanged,
  and the trainer can send a new message.
- R17: A text answer appears word by word as it is written.
- R18: While the assistant builds a change, the chat shows each stage of the work as it happens.
- R19: While the assistant builds a change, the editor is read-only and shows a "IA montando o
  treino…" overlay.
- R20: While the assistant answers a question, only the chat input is locked; the editor stays
  usable.
- R21: When a message fails, or shows no progress (no new stage and no new text) for 60
  seconds, the chat shows an error with "Tentar novamente",
  the trainer's message stays in the chat, and the editor is unchanged and unlocked.
- R22: "Tentar novamente" sends the same message again.
- R47: The trainer can close the chat panel while a message is being processed; the processing
  continues.
- R48: Reopening the chat panel while a message is being processed shows its current progress
  and "Parar".
- R49: The AI icon stays usable while the editor is read-only (R19), so the trainer can always
  reopen the panel and stop a change being built.
- R50: Leaving the editor while a message is being processed ("Concluir", navigating away,
  reloading or closing the tab) warns that the assistant's progress will be lost; leaving
  anyway stops the message.

**Changes proposed by the assistant**

- R23: The assistant decides from the message whether the trainer asked a question or a change.
- R24: When it is unclear whether the trainer wants a change, the assistant asks in the chat
  before changing anything.
- R25: A change is always delivered as a workout proposal shown in the editor, never as a text
  description of the workout.
- R26: When a proposal arrives, the chat shows only a one-line message that it is ready to
  review; the assistant does not explain what it changed or why.
- R27: A proposal can change the workout's exercises, their order, rest, notes and sets.
- R28: A proposal never changes the workout's name or weekday.
- R29: A proposal uses only exercises from the trainer's catalog (the starter catalog and the
  trainer's own exercises).
- R30: When no catalog exercise fits what the trainer asked for, the assistant says so in the
  chat instead of proposing.
- R31: A proposal never has more than 20 exercises or more than 10 sets in an exercise
  (API-R8/R9); when the trainer asks for more, the assistant explains the limit in the chat.
- R32: A proposal that cannot be shown as a valid workout is never shown; the chat says the
  assistant could not build the workout and offers "Tentar novamente".

**Reviewing a proposal**

- R33: In review, added exercises and sets are marked "Novo", changed values are highlighted,
  and removed exercises are shown struck through; the markers always compare against the last
  saved workout, also after several chained proposals.
- R34: In review, nothing is saved until the trainer presses "Aplicar".
- R35: In review, the trainer can edit the proposal by hand like any workout in the editor.
- R36: In review, the trainer can keep chatting; a new change builds on the proposal as it
  stands on screen, including the trainer's own edits to it.
- R37: There is at most one proposal in review at a time.
- R38: "Aplicar" saves the workout as it stands on screen, and automatic saving resumes (WE-R7).
- R39: "Descartar" puts the editor back to the last saved workout, dropping every proposal and
  every manual edit made during review.
- R40: Applying a proposal on a workout that does not exist yet creates it, named "Novo
  treino" (WE-R3/R4).
- R41: When applying would remove an exercise or set a client has already recorded data against,
  that exercise or set stays in the workout and a message names it; everything else is saved
  (WE-R27).
- R42: Leaving the editor with a proposal in review ("Concluir", navigating away, reloading or
  closing the tab) warns that the proposal has not been applied; leaving anyway discards it.

**Effect on the workout editor (WE)**

These rules follow from R34–R42 and override the editor PRD only while a proposal is in review;
outside review the editor behaves exactly as WE describes.

- R43: While a proposal is in review, automatic saving (WE-R7/R8) is suspended; it resumes after
  "Aplicar" or "Descartar".
- R44: While a proposal is in review, "Aplicar" and "Descartar" are offered in addition to
  "Concluir" (WE-R11), and WE-§6's exclusion of a discard action and of other editing modes does
  not apply to review.
- R45: While a proposal is in review, the editor may say that the proposal is not saved yet
  (WE-R13 does not apply to review).
- R46: The leave warnings of R42 and R50 are extra cases of WE-R12, on top of a save in progress or a
  failed save.

## 5. Edge cases

| # | Scenario | Expected outcome | Rule |
|---|---|---|---|
| E1 | Trainer asks "what's the capital of France?". | The assistant declines politely and invites a training question. | R8 |
| E2 | Trainer writes in English. | The assistant answers in English. | R9 |
| E3 | Trainer pastes a 2,500-character message. | Sending is blocked; the counter shows the excess. | R10 |
| E4 | Trainer tries to send a second message while the first is being processed. | Not possible; the input is locked and only "Parar" is available. | R14, R15 |
| E5 | Trainer presses "Parar" while a change is being built. | The message ends, the chat says it was stopped, the editor unlocks unchanged. | R16, R19 |
| E6 | Trainer edits a set while the assistant is answering a question. | Allowed and saved automatically as usual. | R20 |
| E7 | Trainer tries to edit a set while the assistant is building a change. | Not possible; the editor is read-only under the overlay. | R19 |
| E8 | The assistant fails, or shows no new stage or text for 60 seconds. | Error with "Tentar novamente" in the chat; message kept; editor unchanged and unlocked. | R21, R22 |
| E9 | Trainer writes "my client hates squats", which may or may not be a change. | The assistant asks whether to change the workout before proposing. | R24 |
| E10 | Trainer asks to rename the workout or move it to Friday. | No proposal changes the name or weekday; the assistant says it can only change exercises and sets. | R28 |
| E11 | Trainer asks for an exercise that is not in their catalog. | The assistant says no catalog exercise fits; no proposal. | R29, R30 |
| E12 | Trainer asks for 25 exercises. | The assistant explains the 20-exercise limit in the chat. | R31 |
| E13 | The assistant produces something that is not a valid workout. | Nothing appears in the editor; the chat offers "Tentar novamente". | R32 |
| E14 | Trainer changes a weight inside the proposal, then asks "now add a drop set to the last exercise". | The new proposal keeps the trainer's weight change and adds the drop set. | R36 |
| E15 | Trainer asks for a change while a proposal is already in review. | The new proposal replaces the current one; still only one in review; its markers compare against the last saved workout, not the previous proposal. | R33, R36, R37 |
| E15a | Two chained proposals with manual edits in between, then "Descartar". | The editor shows the last saved workout; both proposals and the manual edits are dropped. | R39 |
| E15b | Trainer edits a set inside a proposal in review. | The edit is not saved until "Aplicar". | R34, R43 |
| E16 | Trainer applies a proposal that removes an exercise a client already recorded data against. | Everything else is saved; that exercise stays and a message names it. | R41 |
| E17 | Trainer presses "Concluir" with a proposal in review. | Warning that the proposal is not applied; leaving anyway discards it. | R42 |
| E18 | Trainer closes and reopens the chat panel in the same editor visit. | The conversation is still there. | R4 |
| E19 | Trainer leaves the editor and comes back to the same workout. | Empty chat. | R5 |
| E20 | On a new workout that doesn't exist yet, the trainer asks for a full workout and applies it. | The workout is created as "Novo treino" with the proposed exercises and sets. | R40 |
| E21 | On a new workout, the trainer discards the proposal without other changes. | No workout is created (WE-R5). | R39 |
| E22 | Another tab saves changes to the same workout while a proposal is in review here. | Applying saves this screen's version; last write wins, as in the editor today (WE-E19). | R38 |
| E23 | A client opens the workout after the trainer applied a proposal. | The client sees a normal workout, with no mention of the assistant. | R6 |
| E24 | Trainer closes the chat panel while a change is being built. | The work continues; the editor stays read-only under the overlay. | R19, R47 |
| E25 | Trainer then reopens the panel with the AI icon. | The panel shows the current stage and "Parar"; pressing it unlocks the editor unchanged. | R16, R48, R49 |
| E26 | Trainer presses "Concluir" or closes the tab while an answer or a change is still being processed. | Warning that the assistant's progress will be lost; leaving anyway stops the message and nothing is changed. | R50 |

## 6. Out of scope

- **A usage or cost limit per trainer.** The owner wants a token- or cost-based approach rather
  than a message count; it gets its own PRD. This version ships without a limit.
- **The mobile app.** The owner asked for the web workout editor; mobile can follow in a later
  PRD.
- **Keeping chat history** after leaving the editor. Not asked for.
- **Any client data** (name, recorded weights, logs, feedback) reaching the assistant. Owner's
  choice for this version.
- **The assistant creating new catalog exercises.** Proposals use the existing catalog only.
- **The assistant changing the workout's name or weekday.**
- **An assistant anywhere other than the workout editor** (plan page, client pages). Not asked
  for.
- **Explanations of why the assistant changed the workout.** Owner's choice, to save cost; the
  change markers in the editor show what changed.

## 7. Decisions

| Question | Decision | Why |
|---|---|---|
| The editor saves every change automatically; how does a proposal fit? | Review first; nothing is saved until "Aplicar"; "Descartar" restores the previous workout | Keeps the assistant from overwriting a workout a client may be using. (proposed, accepted) |
| Exercise not in the catalog | Catalog exercises only; otherwise the assistant says so | Every proposed card is a real exercise with its video. (proposed, accepted) |
| Chat history | Lost on leaving the editor | Simplest; no stored AI history. (proposed, accepted) |
| What the assistant knows | Workout on screen, its plan's name, description, level and dates, and the plan's other workouts | Owner's choice, so the assistant can balance the week; no client history. |
| Editing by hand while the assistant works | Editor read-only while it builds a change; usable during plain questions | A proposal built on an outdated workout would silently undo the trainer's edits. (proposed, accepted) |
| Stopping a long message | "Parar" replaces the send button | (proposed, accepted) |
| What a proposal may change | Exercises and sets only, never name or weekday | Name and weekday are plan-level choices. (proposed, accepted) |
| Applying a proposal that removes recorded data | Save the rest, keep the protected item, name it | Same as the editor's existing refusal (WE-R27). (proposed, accepted) |
| Progress feedback | Named stages for changes, word-by-word text answers | (proposed, accepted) |
| Chatting while a proposal is in review | Allowed; builds on the proposal as it stands | (proposed, accepted) |
| Usage limit | None in this version; token/cost-based limit in a later PRD | Owner: a message count is not enough to control cost. |
| Off-topic questions | Politely declined | (proposed, accepted) |
| Leaving with a proposal in review | Warn, then discard | (proposed, accepted) |
| Closing the chat panel while a message is processing | Allowed; the work continues; leaving the page warns that the progress will be lost | Owner's choice after PR #83. The AI icon staying usable (R49) is (proposed) so a closed panel never leaves a locked editor with no way to stop it. |
| Question or change | The assistant decides and asks when unclear | (proposed, accepted) |
| Message on arrival of a proposal | One line saying it is ready; no explanation of what or why | Owner: save cost; the editor marks the changes. |
| Showing what changed | "Novo" marks, highlighted values, struck-through removals | (proposed, accepted) |
| Mobile | Web only | (proposed, accepted) |
| Message length | 2,000 characters | (proposed, accepted) |
| Mistake disclaimer | Permanent note under the input | (proposed, accepted) |
| Baseline for change markers and "Descartar" after chained proposals | Always the last saved workout | Owner's choice in PR review. (proposed, accepted) |
| When a message counts as "too long" | No new stage or text for 60 seconds | Owner's choice in PR review; it also caps how long the editor stays locked. (proposed, accepted) |
| Reply language, error handling, new-workout apply, the 20/10 limits, invalid proposals, client never told | As in R9, R21–R22, R40, R31, R32, R6 | (proposed, accepted) |

## 8. Open questions

- **Personal data.** The prescribed loads and the trainer's notes in the workouts the assistant
  sees are listed as health-related data in vertice-api's data inventory (D4). Whether the
  client consent and the data inventory must name the AI provider (and the trace store, if
  used) before launch is a legal question for the technical assessment, not a product rule.
  The same goes for the free text the assistant receives (R13): plan names, plan descriptions
  and notes can name the client or describe their condition. Meanwhile, the spec author should
  assume the feature does not reach trainers until the assessment settles it.
- **Footer and "Usar treino existente como base" during review.** What the footer save status
  shows during review, and whether "Usar treino existente como base" (WE-R24) is hidden then,
  are settled at the design review. Meanwhile, assume the footer says the proposal is not saved
  yet and the action is hidden during review.
- **Partly possible requests.** Not decided whether the assistant proposes what it can (for
  example, the exercises found in the catalog, or up to the 20/10 limits) and says what it left
  out, or proposes nothing. The same question applies when applying would remove several
  recorded exercises or sets (R41). Meanwhile, assume it proposes what it can and names what it
  left out in one line, and that R41 keeps every protected item.

## 9. Technical constraints (stated by the owner)

- "In this case it should ALWAYS return a JSON format with the workout data to the webpage that
  then will use it to render the components on the screen automatically."
- "For now don't focus on the AI service, but on the others that will consume it, like the BFF
  and WEB." (The assessments for this PRD cover vertice-bff and vertice-web-react first; the
  AI service's side comes later.)
