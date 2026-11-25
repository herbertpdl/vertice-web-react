import { describe, expect, it } from "vitest";
import { adoptServer, editDraft, isDirty, rebaseOnSave, seedDraft } from "./draft";

const stored = { text: "Dor no joelho.", updatedAt: "2026-11-20T12:00:00Z" };

describe("anamnese draft (spec D2)", () => {
  it("seeds clean from the first read", () => {
    const s = seedDraft(stored);
    expect(s).toEqual({ draft: "Dor no joelho.", baseline: "Dor no joelho.", updatedAt: stored.updatedAt });
    expect(isDirty(s)).toBe(false);
  });

  it("is dirty while the draft differs from the baseline, clean again when typed back", () => {
    const s = editDraft(seedDraft(stored), "Dor no joelho. Evitar impacto.");
    expect(isDirty(s)).toBe(true);
    expect(isDirty(editDraft(s, "Dor no joelho."))).toBe(false);
  });

  it("adopts a newer read only while clean", () => {
    const newer = { text: "Outro texto", updatedAt: "2026-11-21T12:00:00Z" };
    expect(adoptServer(seedDraft(stored), newer)).toEqual(seedDraft(newer));
    const dirty = editDraft(seedDraft(stored), "digitando");
    expect(adoptServer(dirty, newer)).toBe(dirty);
  });

  it("keeps the same object when the read did not change", () => {
    const s = seedDraft(stored);
    expect(adoptServer(s, { ...stored })).toBe(s);
  });

  it("rebases on its own save", () => {
    const s = editDraft(seedDraft(stored), "Novo texto ");
    const saved = { text: "Novo texto ", updatedAt: "2026-11-25T12:00:00Z" };
    const after = rebaseOnSave(s, "Novo texto ", saved);
    expect(after).toEqual({ draft: "Novo texto ", baseline: "Novo texto ", updatedAt: saved.updatedAt });
    expect(isDirty(after)).toBe(false);
  });

  it("keeps text typed during the save, dirty against the new baseline", () => {
    const sent = "Novo";
    const s = editDraft(seedDraft(stored), "Novo e mais");
    const after = rebaseOnSave(s, sent, { text: sent, updatedAt: "2026-11-25T12:00:00Z" });
    expect(after.draft).toBe("Novo e mais");
    expect(after.baseline).toBe("Novo");
    expect(isDirty(after)).toBe(true);
  });

  it("a blank save comes back as the empty state (R19, E5)", () => {
    const s = editDraft(seedDraft(stored), "   ");
    const after = rebaseOnSave(s, "   ", { text: "", updatedAt: null });
    expect(after).toEqual({ draft: "", baseline: "", updatedAt: null });
  });
});
