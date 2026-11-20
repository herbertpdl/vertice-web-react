import { QueryClient, QueryObserver, notifyManager, onlineManager } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminKeys } from "./admin";
import { PAUSED_DEADLINE_MS, settleAfterWrite } from "./adminFeatureFlags";

/** A promise the test resolves by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets pending promise callbacks run (fake timers don't touch microtasks). */
const flush = () => vi.advanceTimersByTimeAsync(0);

const queryKey = adminKeys.featureFlags();

let client: QueryClient;
let unsubscribe: () => void = () => {};

/** The list query as the page has it: mounted (an observer), with data from before the write. */
async function mountList(queryFn: () => Promise<unknown>, retry: false | number = false) {
  const observer = new QueryObserver(client, { queryKey, queryFn, retry });
  unsubscribe = observer.subscribe(() => {});
  await vi.waitFor(() => expect(client.getQueryState(queryKey)?.status).toBe("success"));
}

/** Tracks whether a promise settled, without awaiting it. */
function track(promise: Promise<unknown>) {
  const state = { settled: false };
  void promise.then(() => {
    state.settled = true;
  });
  return state;
}

beforeEach(() => {
  notifyManager.setScheduler((callback) => callback());
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
  onlineManager.setOnline(true);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.mount(); // what QueryClientProvider does: reconnects resume paused fetches
});

afterEach(() => {
  unsubscribe();
  client.clear();
  client.unmount();
  onlineManager.setOnline(true);
  vi.useRealTimers();
});

/** Each landing a millisecond after the call, like a real round trip. */
function later<T>(value: T): Promise<T> {
  vi.setSystemTime(Date.now() + 1);
  return Promise.resolve(value);
}

describe("settleAfterWrite", () => {
  it("waits for the fetch that replaced a cancelled one, not the cancelled one", async () => {
    const held: ReturnType<typeof deferred<unknown>>[] = [];
    let calls = 0;
    const queryFn = vi.fn(() => {
      calls += 1;
      if (calls === 1) return later({ flags: [] });
      const gate = deferred<unknown>();
      held.push(gate);
      return gate.promise;
    });
    await mountList(queryFn);

    vi.setSystemTime(Date.now() + 10);
    const settle = track(settleAfterWrite(client));
    await flush();
    expect(held).toHaveLength(1); // row A's refetch, in flight

    // Row B's write: its invalidation cancels A's refetch and starts another.
    void client.invalidateQueries({ queryKey, exact: true });
    await flush();
    expect(held).toHaveLength(2);
    held[0].resolve({ flags: ["stale"] }); // the cancelled fetch: never written
    await flush();
    expect(settle.settled).toBe(false);

    vi.setSystemTime(Date.now() + 5);
    held[1].resolve({ flags: ["fresh"] });
    await flush();
    expect(settle.settled).toBe(true);
    expect(client.getQueryData(queryKey)).toEqual({ flags: ["fresh"] });
  });

  it("offline: doesn't spin, and resolves once back online and the fetch lands", async () => {
    const queryFn = vi.fn(() => later({ flags: [] }));
    await mountList(queryFn);
    expect(queryFn).toHaveBeenCalledTimes(1);

    onlineManager.setOnline(false);
    vi.setSystemTime(Date.now() + 10);
    const settle = track(settleAfterWrite(client));
    await flush();
    expect(client.getQueryState(queryKey)?.fetchStatus).toBe("paused");
    await vi.advanceTimersByTimeAsync(PAUSED_DEADLINE_MS - 1_000);
    expect(settle.settled).toBe(false);
    expect(queryFn).toHaveBeenCalledTimes(1);

    onlineManager.setOnline(true);
    await flush();
    await flush();
    expect(settle.settled).toBe(true);
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it("offline past the deadline: gives up without fetching again", async () => {
    const queryFn = vi.fn(() => later({ flags: [] }));
    await mountList(queryFn);

    onlineManager.setOnline(false);
    const settle = track(settleAfterWrite(client));
    await flush();
    expect(settle.settled).toBe(false);
    await vi.advanceTimersByTimeAsync(PAUSED_DEADLINE_MS + 1);
    expect(settle.settled).toBe(true);
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it("a retry that pauses (offline during the retry delay) still ends at the deadline", async () => {
    let calls = 0;
    const queryFn = vi.fn(() => {
      calls += 1;
      if (calls === 1) return later({ flags: [] });
      if (calls === 2) return Promise.reject(new Error("blip"));
      return later({ flags: [] });
    });
    // The production default: one retry, after TanStack's retry delay (1 s for the first).
    await mountList(queryFn, 1);

    vi.setSystemTime(Date.now() + 10);
    const settle = track(settleAfterWrite(client));
    await flush();
    expect(queryFn).toHaveBeenCalledTimes(2); // the first attempt failed; the retry is waiting
    onlineManager.setOnline(false);
    await vi.advanceTimersByTimeAsync(1_500); // the retry delay ends offline: the retryer pauses
    expect(client.getQueryState(queryKey)?.fetchStatus).toBe("paused");
    expect(settle.settled).toBe(false);

    await vi.advanceTimersByTimeAsync(PAUSED_DEADLINE_MS);
    expect(settle.settled).toBe(true);
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it("the query removed, or never created: resolves at once", async () => {
    await expect(settleAfterWrite(client)).resolves.toBeUndefined();

    const queryFn = vi.fn(() => later({ flags: [] }));
    await mountList(queryFn);
    unsubscribe();
    const pending = deferred<unknown>();
    queryFn.mockImplementationOnce(() => pending.promise as Promise<{ flags: never[] }>);
    const settle = track(settleAfterWrite(client));
    await flush();
    client.removeQueries({ queryKey, exact: true });
    await flush();
    pending.resolve({ flags: [] });
    await flush();
    expect(settle.settled).toBe(true);
  });

  it("stops after three refetches when no landing is newer than the write", async () => {
    let issuedAt = 0;
    let landings = 0;
    // Every landing is a distinct time, but before the write's: the clock never passes `issuedAt`.
    const queryFn = vi.fn(() => {
      if (issuedAt) vi.setSystemTime(issuedAt - 1_000 + ++landings);
      return Promise.resolve({ flags: [] });
    });
    await mountList(queryFn);
    unsubscribe(); // inactive: the invalidation itself doesn't refetch, only the loop does

    vi.setSystemTime(Date.now() + 10_000);
    issuedAt = Date.now();
    await settleAfterWrite(client);
    expect(queryFn).toHaveBeenCalledTimes(1 + 3);
  });

  it("resolves on a failed refetch", async () => {
    let fail = false;
    const queryFn = vi.fn(() => (fail ? (vi.setSystemTime(Date.now() + 1), Promise.reject(new Error("down"))) : later({ flags: [] })));
    await mountList(queryFn);
    fail = true;
    vi.setSystemTime(Date.now() + 10);
    await settleAfterWrite(client);
    expect(client.getQueryState(queryKey)?.status).toBe("error");
    expect(queryFn).toHaveBeenCalledTimes(2);
  });
});
