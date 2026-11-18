import { describe, expect, it } from "vitest";
import {
  currentCursor,
  cursorPagesReducer,
  DEFAULT_PAGE_SIZE,
  initialCursorPages,
  pageIndex,
  rowRange,
} from "./cursorPages";

describe("cursorPagesReducer", () => {
  it("starts on page 1, with no cursor, at 25 rows", () => {
    const state = initialCursorPages();
    expect(state.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(DEFAULT_PAGE_SIZE).toBe(25);
    expect(currentCursor(state)).toBeNull();
    expect(pageIndex(state)).toBe(0);
  });

  it("goes forward with the page's nextCursor and back to the cursor before it", () => {
    let state = initialCursorPages(10);
    state = cursorPagesReducer(state, { type: "next", nextCursor: "c2" });
    state = cursorPagesReducer(state, { type: "next", nextCursor: "c3" });
    expect(currentCursor(state)).toBe("c3");
    expect(pageIndex(state)).toBe(2);

    state = cursorPagesReducer(state, { type: "prev" });
    expect(currentCursor(state)).toBe("c2");
    state = cursorPagesReducer(state, { type: "prev" });
    expect(currentCursor(state)).toBeNull();
    expect(pageIndex(state)).toBe(0);
  });

  it("ignores prev on page 1 and next on the last page", () => {
    const first = initialCursorPages();
    expect(cursorPagesReducer(first, { type: "prev" })).toBe(first);
    expect(cursorPagesReducer(first, { type: "next", nextCursor: null })).toBe(first);
  });

  it("starts again at page 1 when the page size changes", () => {
    let state = cursorPagesReducer(initialCursorPages(10), { type: "next", nextCursor: "c2" });
    state = cursorPagesReducer(state, { type: "pageSize", pageSize: 50 });
    expect(state).toEqual({ pageSize: 50, stack: [null] });
  });

  it("keeps the same state for the same page size", () => {
    const state = cursorPagesReducer(initialCursorPages(10), { type: "next", nextCursor: "c2" });
    expect(cursorPagesReducer(state, { type: "pageSize", pageSize: 10 })).toBe(state);
  });

  it("reset (new filters) drops the cursors and keeps the page size", () => {
    let state = cursorPagesReducer(initialCursorPages(50), { type: "next", nextCursor: "c2" });
    state = cursorPagesReducer(state, { type: "reset" });
    expect(state).toEqual({ pageSize: 50, stack: [null] });
    expect(cursorPagesReducer(state, { type: "reset" })).toBe(state);
  });
});

describe("rowRange", () => {
  it("numbers the rows on screen from the page's offset", () => {
    expect(rowRange(0, 10, 10)).toEqual({ from: 1, to: 10 });
    expect(rowRange(1, 10, 10)).toEqual({ from: 11, to: 20 });
    expect(rowRange(2, 25, 7)).toEqual({ from: 51, to: 57 });
  });

  it("is null for an empty page", () => {
    expect(rowRange(0, 25, 0)).toBeNull();
  });
});
