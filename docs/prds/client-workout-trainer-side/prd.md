# PRD: Client workout experience — trainer side (Web)

Status: Draft
Design: design-ok — approved by the owner on 2026-10-23 after reviewing the pen.dev frame "Web — Treinador: ajustes para o app do aluno" (`YICJ0`).
Owner: hebertpdl@gmail.com
Related: [vertice-mobile/docs/prds/client-workout-experience/prd.md](https://github.com/herbertpdl/vertice-mobile/blob/main/docs/prds/client-workout-experience/prd.md)
(source PRD: its rules R24, R61, R62, R71, R72, R77–R79 and edge cases E9, E30, E36 are the product
rules this document applies to the web, referred to below as `APP-R#`/`APP-E#`),
[vertice-mobile/docs/specs/client-workout-experience/spec.md](https://github.com/herbertpdl/vertice-mobile/blob/main/docs/specs/client-workout-experience/spec.md)
(§2.4 lists these web items; the API and BFF changes they rely on are merged: vertice-api #73, #74
and vertice-bff #50).
Spec: not needed beyond this PRD and the source spec's §2.4 (no new contract; the web adopts the
BFF changes already merged).

## 1. Summary

Clients now train in the mobile app and rate each workout. The trainer works in both the app and
the web, so the web shows the same things the app does: the client's rating on every feedback,
whether a feedback came from a session the client later redid, the contacts a trainer chooses to
show their clients, and the rule that exercise videos are YouTube links.

## 2. Actors

- **Trainer** (web): sees ratings on feedback, edits their contacts and which ones clients see,
  and saves exercise videos as YouTube links only.
- The client has no web screens in this PRD.

## 3. Flows

1. The trainer opens the dashboard or a student's Feedbacks tab and sees each feedback with the
   client's rating.
2. The trainer opens "Meu perfil", fills in WhatsApp and Instagram, switches on the ones clients
   may see, and saves.
3. The trainer creates or edits an exercise and pastes a YouTube link; any other link is refused
   with a message.

## 4. Rules

- R1. Every feedback the trainer sees on the web (the dashboard's "Feedbacks recentes", a
  student's Feedbacks tab) shows the client's rating as an emoji with its label, when the
  feedback has one (APP-R71). Feedback from before ratings shows no rating.
- R2. A feedback with a rating and no comment shows "Sem comentário" in place of the text
  (APP-R72).
- R3. A feedback from a session the client later redid is shown with a "Sessão substituída" tag
  (APP-R24, APP-E9).
- R4. "Meu perfil" has a "Contato para alunos" section for trainers with WhatsApp (area code and
  number, 10 or 11 digits) and Instagram (the handle, with or without "@"), both optional
  (APP-R77).
- R5. The section has a switch for each of e-mail, WhatsApp and Instagram, each showing the value
  it shares; all are off until the trainer turns them on (APP-R78).
- R6. The section says that the trainer's name is always shown to their clients (APP-R79).
- R7. Emptying a contact removes it.
- R8. A trainer cannot save an exercise video link that isn't YouTube; the field says "Só aceitamos
  vídeos do YouTube (youtube.com ou youtu.be)." (APP-R61).
- R9. An exercise with an older non-YouTube link stays as it is until the trainer edits it; it is
  not shown to clients (APP-R62, APP-E30).

## 5. Edge cases

| # | Scenario | Expected outcome | Rule |
|---|---|---|---|
| E1 | Feedback with a rating and a comment | Comment and rating chip | R1 |
| E2 | Feedback with a rating, no comment | "Sem comentário" and the chip | R2 |
| E3 | Feedback from before ratings | Comment only, no chip | R1 |
| E4 | A redone session's feedback | Shown, tagged "Sessão substituída" | R3 |
| E5 | Trainer pastes "+55 11 98765-4321" | Stored as the 11-digit number, shown masked | R4 |
| E6 | Trainer hides every contact | Clients see only the name | R6 |
| E7 | Trainer edits an exercise whose old link is Vimeo and saves without changing the link | Refused until the link is a YouTube one or empty | R8, R9 |

## 6. Out of scope

- Client screens on the web: the client experience is the mobile app's.
- Uploaded videos: a later feature, using the same in-app player.

## 7. Decisions

| Question | Decision | Why |
|---|---|---|
| Web designs | Follow the mobile trainer frames (Row L) in the web's own style; frame `YICJ0` | The mobile spec's §2.4 (owner) |
| Where the contacts live | Inside the existing "Meu perfil" form, saved with it | The page already has one form and one save (proposed) |

## 8. Open questions

None.
