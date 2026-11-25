import type { ClientAnamnese } from "@/lib/api/types";

/**
 * The Anamnese tab's text (client-anamnese spec D2, assessment F5). `baseline` is the last text this
 * tab knows is stored; `draft` is what the box shows. Seeded once from the first read; a later read
 * (window focus, a save in another browser tab) is adopted only while the draft is clean, so a
 * refetch never overwrites what the trainer is typing; only this tab's own save rebases.
 */
export interface AnamneseDraft {
  draft: string;
  baseline: string;
  updatedAt: string | null;
}

export function seedDraft(stored: ClientAnamnese): AnamneseDraft {
  return { draft: stored.text, baseline: stored.text, updatedAt: stored.updatedAt };
}

export function isDirty(state: AnamneseDraft): boolean {
  return state.draft !== state.baseline;
}

export function editDraft(state: AnamneseDraft, text: string): AnamneseDraft {
  return state.draft === text ? state : { ...state, draft: text };
}

/** A newer read: shown only while nothing is unsaved (R12, R15, R20). */
export function adoptServer(state: AnamneseDraft, stored: ClientAnamnese): AnamneseDraft {
  if (isDirty(state)) return state;
  if (state.baseline === stored.text && state.updatedAt === stored.updatedAt) return state;
  return seedDraft(stored);
}

/**
 * This tab's `PUT` answered `saved` for the text it sent (`sent`). Typing during the save keeps the
 * newer draft (still dirty against the new baseline); otherwise the box shows what was stored
 * (a blank save comes back as `""`, R19).
 */
export function rebaseOnSave(state: AnamneseDraft, sent: string, saved: ClientAnamnese): AnamneseDraft {
  const draft = state.draft === sent ? saved.text : state.draft;
  return { draft, baseline: saved.text, updatedAt: saved.updatedAt };
}
