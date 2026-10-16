import { describe, expect, it, vi } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { WELFARE_SUPPLIED_ART } from "../src/game/welfareSuppliedArt";

const expectedPaths = Object.values(WELFARE_SUPPLIED_ART);
const image = (path: string) => ({ path, naturalWidth: 90, naturalHeight: 90 }) as unknown as HTMLImageElement;
const flush = async () => { for (let turn = 0; turn < 100; turn++) await Promise.resolve(); };
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};

/** Exercises production page and batch loaders without constructing a game or accessing storage. */
function fixture() {
  const cache = new Map<string, HTMLImageElement>();
  const refs = new Map<HTMLImageElement, number>();
  const acquire = (path: string) => {
    const bitmap = cache.get(path) ?? image(path);
    cache.set(path, bitmap);
    refs.set(bitmap, (refs.get(bitmap) ?? 0) + 1);
    return bitmap;
  };
  const host = {
    createImage: vi.fn(async (path: string) => acquire(path)),
    prepareImages: vi.fn(async (_paths: readonly string[]) => undefined),
    releaseImage: vi.fn((bitmap: HTMLImageElement) => {
      const count = refs.get(bitmap) ?? 0;
      expect(count, "each release must own an acquired image reference").toBeGreaterThan(0);
      refs.set(bitmap, count - 1);
    }),
    storageRead: vi.fn(), storageSet: vi.fn(), storageGet: vi.fn(),
  };
  const game = Object.create(ColorEscapeGame.prototype) as any;
  Object.assign(game, {
    host, screen: "supply", formalPageArt: undefined, formalPageArtCache: {},
    formalPageArtRequest: undefined, formalPageArtRequestToken: 0,
    formalPageArtError: undefined, formalPageArtErrorScreen: undefined,
    artLoadedImageCount: 0, scheduleFrame: vi.fn(), playSound: vi.fn(),
  });
  const assertNoStorage = () => {
    expect(host.storageRead).not.toHaveBeenCalled();
    expect(host.storageSet).not.toHaveBeenCalled();
    expect(host.storageGet).not.toHaveBeenCalled();
  };
  return { game, host, cache, refs, acquire, assertNoStorage };
}

describe("supplied welfare image loading and ownership", () => {
  it("loads 23 distinct paths once and releases each owned image once despite compatibility aliases", async () => {
    const { game, host, refs, assertNoStorage } = fixture();
    expect(expectedPaths).toHaveLength(23);
    expect(new Set(expectedPaths).size).toBe(23);
    game.requestFormalPageArt("supply");
    game.requestFormalPageArt("supply");
    expect(game.formalPageReady("supply")).toBe(false);
    expect(game.formalPageArtRequest?.screen).toBe("supply");
    await flush();
    expect(host.prepareImages).toHaveBeenCalledTimes(1);
    expect(host.prepareImages).toHaveBeenCalledWith(expectedPaths);
    expect(host.createImage.mock.calls.map(([path]) => path)).toEqual(expectedPaths);
    expect(game.formalPageReady("supply")).toBe(true);
    expect(game.formalPageArtRequest).toBeUndefined();
    const art = game.formalPageArt;
    for (const [key, path] of Object.entries(WELFARE_SUPPLIED_ART)) expect(art.ui[key].path).toBe(path);
    expect(art.life).toBe(art.ui.rewardLife);
    expect(art.priceCoin).toBe(art.ui.rewardCoins);
    expect(art.inspiration).toBe(art.ui.rewardInspiration);
    expect(art.boosterIcons).toEqual({ time: art.ui.boosterTime, rocket: art.ui.boosterRocket, pulse: art.ui.boosterPulse });
    game.requestFormalPageArt("supply");
    expect(host.createImage).toHaveBeenCalledTimes(23);
    game.releaseFormalPageArt();
    game.releaseFormalPageArt();
    expect(host.releaseImage).toHaveBeenCalledTimes(23);
    expect(new Set(host.releaseImage.mock.calls.map(([bitmap]) => bitmap)).size).toBe(23);
    expect([...refs.values()].every(count => count === 0)).toBe(true);
    expect(game.formalPageReady("supply")).toBe(false);
    assertNoStorage();
  });

  it("reuses retained page art and releases only its reference to an independently owned cached image", async () => {
    const { game, host, refs, acquire, assertNoStorage } = fixture();
    const independent = acquire(WELFARE_SUPPLIED_ART.rewardCoins);
    game.requestFormalPageArt("supply"); await flush();
    const art = game.formalPageArt;
    expect(art.priceCoin).toBe(independent);
    expect(refs.get(independent)).toBe(2);
    game.retainCurrentFormalPageArt();
    expect(game.formalPageArt).toBeUndefined();
    expect(game.formalPageArtFor("supply")).toBe(art);
    game.requestFormalPageArt("supply"); await flush();
    expect(game.formalPageArt).toBe(art);
    expect(game.formalPageArtCache.supply).toBeUndefined();
    expect(host.createImage).toHaveBeenCalledTimes(23);
    game.pruneFormalPageArt("supply");
    expect(host.releaseImage).not.toHaveBeenCalled();
    game.pruneFormalPageArt();
    game.releaseFormalPageArt();
    expect(host.releaseImage).toHaveBeenCalledTimes(23);
    expect(refs.get(independent)).toBe(1);
    expect([...refs.values()].filter(count => count > 0)).toEqual([1]);
    assertNoStorage();
  });

  it("releases a late batch after leaving the page without restoring its ready state", async () => {
    const { game, host, refs, acquire, assertNoStorage } = fixture();
    const pending = deferred<HTMLImageElement>();
    host.createImage.mockImplementationOnce(() => pending.promise);
    game.requestFormalPageArt("supply"); await flush();
    expect(game.formalPageArt).toBeUndefined();
    game.releaseFormalPageArt();
    pending.resolve(acquire(expectedPaths[0])); await flush();
    expect(game.formalPageArt).toBeUndefined();
    expect(game.formalPageArtRequest).toBeUndefined();
    expect(game.formalPageArtError).toBeUndefined();
    expect(host.releaseImage).toHaveBeenCalledTimes(23);
    expect([...refs.values()].every(count => count === 0)).toBe(true);
    assertNoStorage();
  });

  it("keeps a reopened page alive when a superseded successful batch shares the same cached image objects", async () => {
    const { game, host, refs, acquire, assertNoStorage } = fixture();
    const old = deferred<HTMLImageElement>();
    host.createImage.mockImplementationOnce(() => old.promise);
    game.requestFormalPageArt("supply"); await flush();
    game.releaseFormalPageArt();
    game.requestFormalPageArt("supply"); await flush();
    const current = game.formalPageArt;
    expect(current?.screen).toBe("supply");
    old.resolve(acquire(expectedPaths[0])); await flush();
    expect(game.formalPageArt).toBe(current);
    expect(game.formalPageArtRequest).toBeUndefined();
    expect(game.formalPageArtError).toBeUndefined();
    expect(host.releaseImage).toHaveBeenCalledTimes(23);
    expect([...refs.values()].every(count => count === 1)).toBe(true);
    game.releaseFormalPageArt();
    expect(host.releaseImage).toHaveBeenCalledTimes(46);
    expect([...refs.values()].every(count => count === 0)).toBe(true);
    assertNoStorage();
  });

  it("cleans partial decode success and retries the whole page without storage writes or leaked references", async () => {
    const { game, host, refs, acquire, assertNoStorage } = fixture();
    let failOnce = true;
    const successful: HTMLImageElement[] = [];
    host.createImage.mockImplementation(async path => {
      if (failOnce && path === expectedPaths[4]) {
        failOnce = false;
        throw new Error("isolated welfare decode failure");
      }
      const bitmap = acquire(path); successful.push(bitmap); return bitmap;
    });
    game.requestFormalPageArt("supply"); await flush();
    expect(game.formalPageArt).toBeUndefined();
    expect(game.formalPageArtRequest).toBeUndefined();
    expect(game.formalPageFailed("supply")).toBe(true);
    expect(game.formalPageArtError).toBe("isolated welfare decode failure");
    const partialCount = successful.length;
    expect(partialCount).toBeGreaterThan(0); expect(partialCount).toBeLessThan(23);
    expect(host.releaseImage).toHaveBeenCalledTimes(partialCount);
    expect([...refs.values()].every(count => count === 0)).toBe(true);
    const failedAttempts = host.createImage.mock.calls.length;
    await flush();
    expect(host.createImage).toHaveBeenCalledTimes(failedAttempts);
    game.retryFormalPageArt("supply"); await flush();
    expect(game.formalPageReady("supply")).toBe(true);
    expect(game.formalPageFailed("supply")).toBe(false);
    expect(game.formalPageArtRequest).toBeUndefined();
    expect(successful).toHaveLength(partialCount + 23);
    expect(host.prepareImages).toHaveBeenCalledTimes(2);
    game.releaseFormalPageArt();
    expect(host.releaseImage).toHaveBeenCalledTimes(partialCount + 23);
    expect([...refs.values()].every(count => count === 0)).toBe(true);
    assertNoStorage();
  });

  it("ignores a stale decode failure and releases its partial batch without disturbing the new page", async () => {
    const { game, host, refs, assertNoStorage } = fixture();
    const old = deferred<HTMLImageElement>();
    host.createImage.mockImplementationOnce(() => old.promise);
    game.requestFormalPageArt("supply"); await flush();
    game.releaseFormalPageArt();
    game.requestFormalPageArt("supply"); await flush();
    const current = game.formalPageArt;
    old.reject(new Error("stale welfare decode failure")); await flush();
    expect(game.formalPageArt).toBe(current);
    expect(game.formalPageReady("supply")).toBe(true);
    expect(game.formalPageFailed("supply")).toBe(false);
    expect(game.formalPageArtError).toBeUndefined();
    expect(game.formalPageArtRequest).toBeUndefined();
    expect(host.releaseImage).toHaveBeenCalledTimes(22);
    expect([...refs.values()].every(count => count === 1)).toBe(true);
    game.releaseFormalPageArt();
    expect(host.releaseImage).toHaveBeenCalledTimes(45);
    expect([...refs.values()].every(count => count === 0)).toBe(true);
    assertNoStorage();
  });
});
