# PRD: Client First Access by Email (Web)

Status: Draft
Design: design-ok — approved by the owner on 2026-11-11 after reviewing the pen.dev section "Web — Primeiro acesso por e-mail (client-first-access-email)" (`taE0o`).
Owner: hebertpdl@gmail.com
Related: none in `docs/requirements.md` (this repo has none); the product rules are `vertice-api`'s
approved
[`docs/prds/client-first-access-email/prd.md`](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/client-first-access-email/prd.md)
(referred to below as `API-R#`/`API-E#` and not restated);
[docs/assessments/client-first-access-email/assessment.md](../../assessments/client-first-access-email/assessment.md)
(the web assessment that asked for this PRD)
Spec: not yet written (will be `docs/specs/client-first-access-email/spec.md`)

## 1. Summary

The first-access link now goes to the client by email, and the trainer never sees it (`API-R2`).
This PRD pins what the trainer sees on the web: the "Aluno criado" step after adding a client,
a first-access strip on the student page that replaces today's "Link de acesso" button, the
email lock in "Editar aluno", and the wording the client reads on the "definir senha" page. It
exists so these screens get designed and approved before they are built.

## 2. Actors

- **Trainer**
  - Sees, after adding a client, whether the first-access email went out and to which address.
  - Sees, on the page of a client who has not set a password, the first-access strip with where
    and when the last email was sent, or that it failed.
  - Can resend the first-access email from that strip, without a confirmation step.
  - Can correct a pending client's email in "Editar aluno" and is told a new email will go out.
  - Cannot see, copy or create a first-access link anywhere on the web.
  - Cannot edit the email of a client who has set a password.
- **Client**
  - Reads, on the "definir senha" page, what to do when their link is invalid, expired or
    incomplete.

## 3. Flows

**Trainer adds a client**

1. The trainer fills in "Novo aluno" and saves.
2. The dialog switches to "Aluno criado": "Enviamos um e-mail para {email} com o link para {nome}
   definir a senha. O link vale por 72 horas."
3. The trainer presses "Concluir".

**Trainer resends from the student page**

1. On the page of a client who has not set a password, the strip under the header shows
   "Aguardando primeiro acesso" with "E-mail enviado para {email} em {data} às {hora}".
2. The trainer presses "Reenviar e-mail"; the button shows "Enviando…".
3. The strip shows the new send time.

**Trainer corrects a pending client's email**

1. In "Editar aluno", the trainer changes the email; the dialog shows "Ao salvar, enviaremos um
   novo e-mail de primeiro acesso para o novo endereço."
2. The trainer saves; the dialog closes.
3. The strip shows the new address and send time.

## 4. Rules

### No link on the web

- R1. No screen shows, copies or creates a client's first-access link.
- R2. The "Link de acesso" button and its dialog on the student page no longer exist.

### "Aluno criado" step

- R3. When the first-access email was sent, the step reads "Enviamos um e-mail para {email} com o
  link para {nome} definir a senha. O link vale por 72 horas." with a "Concluir" button.
- R4. When the first-access email could not be sent, the step reads "{nome} foi cadastrado, mas não
  conseguimos enviar o e-mail de primeiro acesso." with "Tentar novamente" and "Concluir" buttons.
- R5. When "Tentar novamente" on the step succeeds, the step switches to the message in R3.
- R6. When "Tentar novamente" on the step fails, the step keeps the message in R4.
- R7. When "Tentar novamente" on the step is refused by the sending limit (`API-R16`, `API-R17`),
  the step shows the wait message of R14 or R15 under the button.

### First-access strip on the student page

- R8. The page of a client who has not set a password shows a full-width strip right below the
  header, with the client's name and actions.
- R9. The page of a client who has set a password shows no strip.
- R10. While the last email was sent, the strip reads "Aguardando primeiro acesso", then "E-mail
  enviado para {email} em {dd/mm/aaaa} às {HH:MM}", with a "Reenviar e-mail" button.
- R11. The date and time on the strip are in Brazil's time zone, whatever the trainer's device
  zone is.
- R12. While the last send failed, the strip uses the danger color and reads "Falha no envio do
  e-mail", then "Não conseguimos enviar o e-mail para {email}.", with a "Tentar novamente" button.
- R13. Pressing the strip's button sends the email without asking for confirmation, and the button
  shows "Enviando…" until the result is known.
- R14. When a resend is refused by the one-per-minute limit, the strip shows "Aguarde 1 minuto
  para reenviar." under the button.
- R15. When a resend is refused by the five-per-day limit, the strip shows "Limite de envios
  atingido. Tente novamente amanhã." under the button.
- R16. The strip's button stays enabled after a limit refusal, with no countdown.
- R17. When a resend from the failed state fails again, the strip stays in the failed state and
  adds "Tente novamente em instantes."
- R18. When a resend succeeds, the strip shows the pending state with the new send time.

### "Editar aluno"

- R19. For a client who has set a password, the email field is shown disabled, with the hint "Só
  o aluno pode alterar o e-mail depois do primeiro acesso."
- R20. For a client who has set a password, name and CPF stay editable.
- R21. For a client who has not set a password, once the trainer changes the email, the dialog
  shows "Ao salvar, enviaremos um novo e-mail de primeiro acesso para o novo endereço."
- R22. After saving a changed email for a pending client, the dialog closes as it does today.
- R23. After saving a changed email for a pending client, the strip shows the new address with
  the new send time, or the failed state of R12.
- R24. When the changed email is saved but the limit stops the email (`API` assessment's
  assumption for `API-E10`), the strip reads "Aguardando primeiro acesso", then "E-mail ainda não
  enviado para {novo endereço}", with the wait message of R14 or R15.
- R25. When the client set a password while "Editar aluno" was open and the trainer saves a
  changed email, the save is refused, the email field shows the hint of R19, and the page shows
  the client as active.

### "Definir senha" page (client)

- R26. An invalid or expired link shows "Link inválido ou expirado — peça ao seu treinador para
  reenviar o e-mail de acesso."
- R27. An incomplete link shows "Link incompleto — abra o link completo do e-mail que você
  recebeu."

## 5. Edge cases

| # | Scenario | Expected outcome | Rule |
|---|---|---|---|
| E1 | Adding a client, the email fails | "Aluno criado" with the failure message and "Tentar novamente" | R4 |
| E2 | The trainer presses "Concluir" after a failed send | The dialog closes; the student page shows the red strip | R4, R12 |
| E3 | "Tentar novamente" on "Aluno criado" works | The step switches to the sent message | R5 |
| E4 | "Tentar novamente" on "Aluno criado" hits the one-per-minute limit | "Aguarde 1 minuto para reenviar." under the button | R7, R14 |
| E5 | A day later, the trainer opens the client's page after a failed send | Red strip with "Tentar novamente" | R12 |
| E6 | The trainer presses "Reenviar e-mail" twice quickly | The second press shows "Aguarde 1 minuto para reenviar." | R14 |
| E7 | Sixth resend in a day | "Limite de envios atingido. Tente novamente amanhã." | R15 |
| E8 | Resend from the failed state fails again | Strip stays red, adds "Tente novamente em instantes." | R17 |
| E9 | The client sets their password while the trainer is on their page | The strip stays until the page's data refreshes; nothing else special | R9 |
| E10 | The trainer opens "Editar aluno" for an active client | Email disabled with the hint; name and CPF editable | R19, R20 |
| E11 | Pending client, the trainer changes only the name | No hint about a new email; nothing is sent | R21 |
| E12 | Pending client, the trainer fixes the email | Hint before saving; dialog closes; strip shows the new address and time | R21, R22, R23 |
| E13 | Pending client, email fixed while over the limit | Saved; strip says "E-mail ainda não enviado para {novo endereço}" with the wait message | R24 |
| E14 | The client became active while "Editar aluno" was open | Save of the changed email refused; hint shown; strip gone | R25 |
| E15 | A client created before first-access links existed | No strip; email locked in "Editar aluno" | R9, R19 |
| E16 | The trainer ended the relationship | The page is no longer reachable, as today; nothing new | — |
| E17 | The strip on a phone-width screen | Text and button stack; no horizontal scroll | R8 |
| E18 | The client opens an expired or already used link | The R26 message | R26 |
| E19 | The client opens a link cut short by their mail app | The R27 message | R27 |

## 6. Out of scope

- First-access status on the student list (`/alunos`): the owner placed it on the client's page only.
- Toast notifications: feedback stays inline where the action happened.
- A live countdown on the resend button: a plain wait message is enough.
- The email's own look: a placeholder for now (`API-R30`).
- Any client-side screen in the web: clients use the mobile app.

## 7. Decisions

| Question | Decision | Why |
|---|---|---|
| Where the status lives on the student page | A full-width strip under the header | Hard to miss, and it goes away once the client is active (proposed, accepted) |
| What "Aluno criado" says | The address and the 72-hour validity | The trainer can spot a typo right away (proposed, accepted) |
| Confirmation before resending | None | Harmless and capped by the limits (proposed, accepted) |
| The email of an active client in "Editar aluno" | A disabled field with a hint | The trainer sees why it can't change (proposed, accepted) |
| What the limit refusal looks like | An inline wait message, the button enabled, no countdown | (proposed, accepted) |
| What the failed state looks like | A red strip whose button reads "Tentar novamente" | (proposed, accepted) |
| What the trainer sees when an email fix is saved | The dialog closes and the strip updates, with a hint before saving | (proposed, accepted) |
| An email fix over the limit | Saved, with the strip saying the email wasn't sent yet | (proposed, accepted; matches the `vertice-api` assessment's assumption for `API-E10`) |

## 8. Open questions

None.
