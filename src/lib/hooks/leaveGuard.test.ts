import { describe, expect, it } from "vitest";
import { guardedLinkPath, type LinkClick } from "./leaveGuard";

const here = new URL("https://www.vertice.fit/alunos/7?aba=anamnese");
const click: LinkClick = {
  button: 0,
  defaultPrevented: false,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
};
const link = (href: string, target = "", hasDownload = false) => ({ href, target, hasDownload });

describe("guardedLinkPath (spec D6)", () => {
  it("intercepts a plain click on an in-app link to another page", () => {
    expect(guardedLinkPath(click, link("/alunos"), here)).toBe("/alunos");
    expect(guardedLinkPath(click, link("https://www.vertice.fit/planos/3?x=1#a"), here)).toBe("/planos/3?x=1#a");
    expect(guardedLinkPath(click, link("/dashboard", "_self"), here)).toBe("/dashboard");
  });
  it("lets through modifier, non-primary and already handled clicks", () => {
    for (const key of ["metaKey", "ctrlKey", "shiftKey", "altKey"] as const) {
      expect(guardedLinkPath({ ...click, [key]: true }, link("/alunos"), here)).toBeNull();
    }
    expect(guardedLinkPath({ ...click, button: 1 }, link("/alunos"), here)).toBeNull();
    expect(guardedLinkPath({ ...click, defaultPrevented: true }, link("/alunos"), here)).toBeNull();
  });
  it("lets through new tabs, downloads, other origins and this same page", () => {
    expect(guardedLinkPath(click, link("/alunos", "_blank"), here)).toBeNull();
    expect(guardedLinkPath(click, link("/arquivo", "", true), here)).toBeNull();
    expect(guardedLinkPath(click, link("https://example.com/alunos"), here)).toBeNull();
    expect(guardedLinkPath(click, link("/alunos/7"), here)).toBeNull();
    expect(guardedLinkPath(click, null, here)).toBeNull();
  });
});
