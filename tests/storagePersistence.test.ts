import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { WebHost } from "../src/platform/WebHost";
import { WechatHost } from "../src/platform/WechatHost";
import type { GameHost } from "../src/platform/Host";

const NOW = Date.parse("2026-10-14T04:00:00.000Z");
const SAVE_KEY = "color-escape-save-v1";
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
type WriteMode = "commit" | "reject" | "write-then-throw";

/** Real Web/Wechat storage adapters against fresh, exclusively in-memory stores. */
function memoryHost(platform: "web" | "wechat", initial: unknown) {
  const storage = {
    value: initial === undefined ? undefined : clone(initial),
    mode: "commit" as WriteMode,
    unavailable: false,
    corrupt: false,
    reads: 0,
    writes: 0,
  };
  const read = () => {
    storage.reads++;
    if (storage.unavailable) throw new Error("read denied");
    return storage.value;
  };
  const write = (value: unknown) => {
    storage.writes++;
    if (storage.mode === "reject") throw new Error("write denied");
    storage.value = clone(value);
    if (storage.mode === "write-then-throw") throw new Error("acknowledgement lost");
  };
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => {
      expect(key).toBe(SAVE_KEY);
      const value = read();
      return storage.corrupt ? "{bad json" : value === undefined ? null : JSON.stringify(value);
    },
    setItem: (key: string, raw: string) => { expect(key).toBe(SAVE_KEY); write(JSON.parse(raw)); },
  });
  vi.stubGlobal("wx", {
    getStorageSync: (key: string) => { expect(key).toBe(SAVE_KEY); const value = read(); return value === undefined ? "" : clone(value); },
    setStorageSync: (key: string, value: unknown) => { expect(key).toBe(SAVE_KEY); write(value); },
  });
  const adapter = platform === "web" ? WebHost.prototype : WechatHost.prototype;
  const host = {
    canvas: { setAttribute: vi.fn() }, context: {},
    viewport: () => ({ width: 496, height: 1078, pixelRatio: 1, safeTop: 0, safeBottom: 0 }),
    isVisible: () => true, preferredLocales: () => ["zh-CN"], prefersReducedMotion: () => false,
    onPointer: vi.fn(), onResize: vi.fn(), onShow: vi.fn(), onHide: vi.fn(),
    requestFrame: vi.fn(() => 1), scheduleTimeout: vi.fn(() => 1), cancelTimeout: vi.fn(),
    createImage: vi.fn(() => new Promise<HTMLImageElement>(() => {})),
    storageRead: adapter.storageRead, storageSet: adapter.storageSet,
    music: vi.fn(), musicTransport: () => ({ positionSeconds: 0, durationSeconds: 0, playing: false }),
    sound: vi.fn(), stopSound: vi.fn(), vibrate: vi.fn(),
  };
  return { storage, host: host as unknown as GameHost };
}

function persistenceGame(value: unknown = { schemaVersion: 1, coins: 100, nested: { b: 2, a: [1, 2] } }) {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  const host = memoryHost("web", value);
  game.host = host.host;
  game.save = clone(value);
  game.storageReadAttempts = 0;
  game.storageBaselineReady = game.establishStorageBaseline(host.host.storageRead(SAVE_KEY), game.save);
  host.storage.reads = 0;
  host.storage.writes = 0;
  return { game, ...host };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.spyOn(ColorEscapeGame.prototype as any, "loadArt").mockResolvedValue(undefined);
  vi.spyOn(ColorEscapeGame.prototype as any, "requestJourneyHomeThemeArt").mockResolvedValue(undefined);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe.each(["web", "wechat"] as const)("%s normalized startup storage IO", platform => {
  it("reads once without rewriting a stable existing profile; migration still writes once", () => {
    const h = memoryHost(platform, { schemaVersion: 1, highestLevel: 8, currentLevel: 8,
      rewardedLevels: Array.from({ length: 7 }, (_, i) => i + 1), coins: 321, language: "zh-CN" });
    const first = new ColorEscapeGame(h.host) as any;
    expect(first.storageBaselineReady).toBe(true);
    expect([h.storage.reads, h.storage.writes]).toEqual([1, 1]);
    const saved = clone(h.storage.value);
    h.storage.reads = 0; h.storage.writes = 0;
    vi.setSystemTime(NOW + 60_000);
    const reloaded = new ColorEscapeGame(h.host) as any;
    expect(reloaded.storageBaselineReady).toBe(true);
    expect(clone(reloaded.save)).toEqual(saved);
    expect([h.storage.reads, h.storage.writes]).toEqual([1, 0]);
    expect(h.storage.value).toEqual(saved);
  });

  it("still writes when a returning league player's monotonic clock advances", () => {
    const h = memoryHost(platform, { schemaVersion: 1, highestLevel: 43, currentLevel: 43,
      rewardedLevels: Array.from({ length: 42 }, (_, i) => i + 1), coins: 321, language: "zh-CN" });
    new ColorEscapeGame(h.host);
    h.storage.reads = 0; h.storage.writes = 0;
    vi.setSystemTime(NOW + 60_000);
    const reloaded = new ColorEscapeGame(h.host) as any;
    expect(reloaded.storageBaselineReady).toBe(true);
    expect(reloaded.save.league.lastNowMs).toBe(NOW + 60_000);
    expect(h.storage.value).toEqual(clone(reloaded.save));
    expect([h.storage.reads, h.storage.writes]).toEqual([1, 1]);
  });

  it("still creates a missing account, and never writes through an unavailable initial read", () => {
    const h = memoryHost(platform, undefined);
    const created = new ColorEscapeGame(h.host) as any;
    expect(created.storageBaselineReady).toBe(true);
    expect([h.storage.reads, h.storage.writes]).toEqual([1, 1]);
    h.storage.unavailable = true; h.storage.reads = 0; h.storage.writes = 0;
    const unavailable = new ColorEscapeGame(h.host) as any;
    expect(unavailable.storageBaselineReady).toBe(false);
    expect([h.storage.reads, h.storage.writes]).toEqual([1, 0]);
  });

  it("persists interrupted-run recovery instead of treating it as unchanged", () => {
    const h = memoryHost(platform, { schemaVersion: 1, highestLevel: 43, currentLevel: 43, coins: 321,
      language: "zh-CN", activeRun: { levelId: 43, returnLevelId: 43, daily: false, lifeStarted: true,
        boosterSpent: { time: 1, rocket: 0, pulse: 0 } } });
    const game = new ColorEscapeGame(h.host) as any;
    expect(game.save.activeRun).toBeUndefined();
    expect((h.storage.value as any).activeRun).toBeUndefined();
    expect([h.storage.reads, h.storage.writes]).toEqual([1, 1]);
  });
});

describe("trusted baseline normalization", () => {
  it("repairs actual corrupt Web storage instead of skipping the normalization write", () => {
    const h = memoryHost("web", undefined);
    h.storage.corrupt = true;
    const game = new ColorEscapeGame(h.host) as any;
    expect(game.storageBaselineReady).toBe(true);
    expect((h.storage.value as any).schemaVersion).toBe(1);
    expect([h.storage.reads, h.storage.writes]).toEqual([1, 1]);
  });

  it("compares every stored field, independent of key order and absent undefined properties", () => {
    const { game, storage } = persistenceGame();
    const normalized = { nested: { a: [1, 2], b: 2 }, coins: 100, schemaVersion: 1, omitted: undefined };
    expect(game.establishStorageBaseline({ status: "ok", value: clone(game.save) }, normalized)).toBe(true);
    expect(storage.writes).toBe(0);
    normalized.nested.a[0] = 9;
    expect(game.durableStorageBaseline.value.nested.a).toEqual([1, 2]);
    for (const change of [{ coins: 101 }, { nested: { a: [2, 1], b: 2 } }, { added: 0 }]) {
      const changed = { ...game.save, ...change };
      expect(game.establishStorageBaseline({ status: "ok", value: game.save }, changed)).toBe(true);
    }
    expect(storage.writes).toBe(3);
  });

  it("detaches trusted initial and normalized aliases before either can be mutated", () => {
    const { game } = persistenceGame();
    const aliased = { schemaVersion: 1, coins: 20, nested: { items: [1, 2] } };
    expect(game.establishStorageBaseline({ status: "ok", value: aliased }, aliased)).toBe(true);
    aliased.nested.items.push(3); aliased.coins = 999;
    expect(game.durableStorageBaseline.value).toEqual({ schemaVersion: 1, coins: 20, nested: { items: [1, 2] } });
  });

  it("keeps the original durable baseline when normalization is rejected", () => {
    const { game, storage } = persistenceGame();
    const raw = clone(storage.value);
    storage.mode = "reject";
    expect(game.establishStorageBaseline({ status: "ok", value: raw }, { ...game.save, coins: 101 })).toBe(true);
    expect(game.durableStorageBaseline.value).toEqual(raw);
    expect([storage.reads, storage.writes]).toEqual([1, 1]);
  });

  it("accepts normalization only after a real matching read when acknowledgement is lost", () => {
    const { game, storage } = persistenceGame();
    storage.mode = "write-then-throw";
    const candidate = { ...game.save, coins: 101 };
    expect(game.establishStorageBaseline({ status: "ok", value: clone(game.save) }, candidate)).toBe(true);
    expect(game.durableStorageBaseline.value).toEqual(candidate);
    expect([storage.reads, storage.writes]).toEqual([1, 1]);
  });

  it("protects startup when failed normalization reads back a third value", () => {
    const { game, storage } = persistenceGame();
    const initial = clone(storage.value);
    storage.mode = "reject";
    storage.value = { ...game.save, coins: 777 };
    expect(game.establishStorageBaseline({ status: "ok", value: initial }, { ...game.save, coins: 101 })).toBe(false);
    expect(game.durableStorageBaseline).toBeUndefined();
    expect([storage.reads, storage.writes]).toEqual([1, 1]);
  });
});

describe("actual persistence acknowledgement and candidate ownership", () => {
  it("always performs an ordinary native write, including identical repeated values", () => {
    const { game, storage } = persistenceGame();
    expect(game.persist()).toBe(true);
    storage.value = { ...game.save, coins: 777 };
    expect(game.persist()).toBe(true);
    expect(storage.value).toEqual(game.save);
    expect([storage.reads, storage.writes]).toEqual([0, 2]);
  });

  it.each(["web", "wechat"] as const)("%s confirms a write that landed before its bridge threw", platform => {
    const { game } = persistenceGame();
    const h = memoryHost(platform, game.save); game.host = h.host;
    h.storage.mode = "write-then-throw";
    const candidate = { ...game.save, coins: 101 };
    expect(game.persistVerified(candidate)).toBe("committed");
    expect([h.storage.reads, h.storage.writes]).toEqual([1, 1]);
    candidate.nested.a.push(9);
    expect(game.durableStorageBaseline.value.nested.a).toEqual([1, 2]);
  });

  it("rejects only the exact live or durable baseline after a failed write", () => {
    const { game, storage } = persistenceGame(); storage.mode = "reject";
    const candidate = { ...game.save, coins: 101 };
    expect(game.persistVerified(candidate)).toBe("rejected");
    const live = { ...game.save, coins: 102 };
    expect(game.persistVerified(candidate, live)).toBe("rejected");
    storage.value = live;
    expect(game.persistVerified(candidate, live)).toBe("rejected");
    expect(game.durableStorageBaseline.value).toEqual(live);
    expect([storage.reads, storage.writes]).toEqual([3, 3]);
  });

  it("reads again for every retry, preserving a candidate through unavailable and third-party values", () => {
    const { game, storage } = persistenceGame();
    const candidate = { ...game.save, coins: 101 };
    game.pendingSettlement = { candidateSave: candidate };
    storage.mode = "reject"; storage.unavailable = true;
    expect(game.persistVerified(candidate)).toBe("unknown");
    storage.unavailable = false; storage.value = { ...game.save, coins: 777 };
    expect(game.persistVerified(candidate)).toBe("unknown");
    expect(storage.value).toMatchObject({ coins: 777 });
    storage.value = clone(candidate);
    expect(game.persistVerified(candidate)).toBe("committed");
    expect([storage.reads, storage.writes]).toEqual([3, 3]);
  });

  it("does not allow a concurrent transaction to overwrite the unresolved candidate", () => {
    const { game, storage } = persistenceGame();
    const pending = { ...game.save, coins: 101 }, other = { ...game.save, coins: 102 };
    game.pendingSettlement = { candidateSave: pending };
    storage.value = clone(pending);
    expect(game.persistVerified(other)).toBe("unknown");
    expect(game.persist(game.save)).toBe(false);
    expect([storage.reads, storage.writes]).toEqual([1, 0]);
    expect(storage.value).toEqual(pending);
    expect(game.persistVerified(pending)).toBe("committed");
    expect([storage.reads, storage.writes]).toEqual([1, 1]);
  });

  it("never replaces an unavailable read with the prior trusted value", () => {
    const { game, storage } = persistenceGame();
    storage.mode = "reject"; storage.unavailable = true;
    expect(game.persistVerified({ ...game.save, coins: 101 })).toBe("unknown");
    expect([storage.reads, storage.writes]).toEqual([1, 1]);
  });

  it.each(["missing", "corrupt"] as const)("recognizes %s only when it is the trusted durable baseline", status => {
    const { game } = persistenceGame();
    game.host = { storageSet: vi.fn(() => false), storageRead: vi.fn(() => ({ status })) };
    const candidate = { ...game.save, coins: 101 };
    expect(game.persistVerified(candidate)).toBe("unknown");
    game.durableStorageBaseline = { status };
    expect(game.persistVerified(candidate)).toBe("rejected");
    expect(game.host.storageRead).toHaveBeenCalledTimes(2);
  });

  it("does not reread or recanonicalize an actual third-value read for each comparison", () => {
    const { game } = persistenceGame();
    const readBack = { ...clone(game.save), coins: 777 };
    game.host = { storageSet: vi.fn(() => false), storageRead: vi.fn(() => ({ status: "ok", value: readBack })) };
    const stringify = vi.spyOn(JSON, "stringify");
    expect(game.persistVerified({ ...game.save, coins: 101 })).toBe("unknown");
    expect(game.host.storageRead).toHaveBeenCalledOnce();
    // Read, candidate, live baseline and already-canonical durable baseline.
    // The former implementation serialized the same read three times (six total).
    expect(stringify.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it("keeps read exceptions unknown and temporary test saves isolated", () => {
    const { game } = persistenceGame();
    game.host = { storageSet: vi.fn(() => false), storageRead: vi.fn(() => { throw new Error("bridge denied"); }) };
    expect(game.persistVerified({ ...game.save, coins: 101 })).toBe("unknown");
    game.host.storageSet.mockClear(); game.host.storageRead.mockClear();
    game.temporaryLevelTestSession = {};
    expect(game.persistVerified({ ...game.save, coins: 102 })).toBe("committed");
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.host.storageRead).not.toHaveBeenCalled();
  });
});
