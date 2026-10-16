import { describe, expect, it, vi } from "vitest";
import { LEAGUE_SETTLEMENT_ART } from "../src/game/artManifest";
import {
  LeagueSettlementArtStore,
  LEAGUE_SETTLEMENT_ART_NAMES,
  LEAGUE_SETTLEMENT_ART_PATHS,
} from "../src/game/LeagueSettlementArtStore";

const settle = () => new Promise(resolve => setTimeout(resolve, 0));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
}
const image = (src: string) => ({ src }) as HTMLImageElement;

describe("supplied league settlement art ownership", () => {
  it("shares an in-flight request and retains each ready image until disposal", async () => {
    const gate = deferred<void>(), images = new Map<string, HTMLImageElement>();
    const load = vi.fn(async (path: string) => {
      await gate.promise;
      const value = image(path); images.set(path, value); return value;
    });
    const release = vi.fn(), changed = vi.fn();
    const store = new LeagueSettlementArtStore(load, release, changed);
    store.request(); store.request();
    expect(store.loading).toBe(true);
    expect(load).toHaveBeenCalledTimes(LEAGUE_SETTLEMENT_ART_NAMES.length);
    expect(store.art).toBeUndefined();
    gate.resolve(); await settle();
    expect(store.loading).toBe(false);
    expect(store.error).toBe(false);
    expect(Object.keys(store.art!)).toEqual(LEAGUE_SETTLEMENT_ART_NAMES);
    for (const name of LEAGUE_SETTLEMENT_ART_NAMES) {
      expect(store.art![name]).toBe(images.get(`/${LEAGUE_SETTLEMENT_ART[name]}`));
    }
    store.request();
    expect(load).toHaveBeenCalledTimes(LEAGUE_SETTLEMENT_ART_NAMES.length);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(release).not.toHaveBeenCalled();
    store.dispose(); store.dispose();
    expect(release).toHaveBeenCalledTimes(images.size);
    for (const value of images.values()) expect(release.mock.calls.filter(([released]) => released === value)).toHaveLength(1);
    expect(store.art).toBeUndefined();
    expect(store.loading).toBe(false);
    expect(store.error).toBe(false);
  });

  it("cleans up a partially failed batch and permits a complete manual retry", async () => {
    let fail = true;
    const loaded: HTMLImageElement[] = [], release = vi.fn(), changed = vi.fn();
    const load = vi.fn(async (path: string) => {
      if (fail && path === LEAGUE_SETTLEMENT_ART_PATHS[0]) throw Error("Synthetic image failure");
      const value = image(path); loaded.push(value); return value;
    });
    const store = new LeagueSettlementArtStore(load, release, changed);
    store.request(); await settle();
    expect(store.art).toBeUndefined();
    expect(store.loading).toBe(false);
    expect(store.error).toBe(true);
    expect(release.mock.calls.map(([value]) => value)).toEqual(loaded);
    expect(changed).toHaveBeenCalledTimes(1);
    fail = false; store.request();
    expect(store.error).toBe(false);
    await settle();
    expect(Object.keys(store.art!)).toHaveLength(LEAGUE_SETTLEMENT_ART_NAMES.length);
    expect(load).toHaveBeenCalledTimes(LEAGUE_SETTLEMENT_ART_NAMES.length * 2);
    expect(changed).toHaveBeenCalledTimes(2);
    store.dispose();
    expect(release.mock.calls.map(([value]) => value)).toEqual(loaded);
  });

  it("releases late successful images after closing without publishing or notifying", async () => {
    const gate = deferred<void>(), release = vi.fn(), changed = vi.fn();
    const store = new LeagueSettlementArtStore(async path => { await gate.promise; return image(path); }, release, changed);
    store.request(); store.dispose();
    gate.resolve(); await settle();
    expect(store.art).toBeUndefined();
    expect(store.loading).toBe(false);
    expect(store.error).toBe(false);
    expect(release).toHaveBeenCalledTimes(LEAGUE_SETTLEMENT_ART_NAMES.length);
    expect(changed).not.toHaveBeenCalled();
    store.dispose();
    expect(release).toHaveBeenCalledTimes(LEAGUE_SETTLEMENT_ART_NAMES.length);
  });

  it("keeps a reopened request active when the previous batch resolves late", async () => {
    const first = deferred<void>(), second = deferred<void>();
    const release = vi.fn(), changed = vi.fn();
    let batch = 1;
    const store = new LeagueSettlementArtStore(async path => {
      const requestedBatch = batch;
      await (requestedBatch === 1 ? first.promise : second.promise);
      return image(`${requestedBatch}:${path}`);
    }, release, changed);
    store.request(); store.dispose(); batch = 2; store.request();
    first.resolve(); await settle();
    expect(store.loading).toBe(true);
    expect(store.art).toBeUndefined();
    expect(store.error).toBe(false);
    expect(changed).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(LEAGUE_SETTLEMENT_ART_NAMES.length);
    second.resolve(); await settle();
    expect(store.loading).toBe(false);
    expect(Object.values(store.art!).every(value => value.src.startsWith("2:"))).toBe(true);
    expect(changed).toHaveBeenCalledTimes(1);
    store.dispose();
    expect(release).toHaveBeenCalledTimes(LEAGUE_SETTLEMENT_ART_NAMES.length * 2);
  });

  it("balances every acquired reference even when the host returns a shared image object", async () => {
    const shared = image("shared-cache-entry"), release = vi.fn();
    const load = vi.fn(async () => shared);
    const store = new LeagueSettlementArtStore(load, release, vi.fn());
    store.request(); await settle(); store.request(); store.dispose(); store.dispose();
    expect(load).toHaveBeenCalledTimes(LEAGUE_SETTLEMENT_ART_NAMES.length);
    expect(release).toHaveBeenCalledTimes(load.mock.calls.length);
    expect(release.mock.calls.every(([value]) => value === shared)).toBe(true);
  });
});
