import { describe, expect, it, vi } from "vitest";
import { profileAvatarPath, profileFramePath } from "../src/core/playerProfile";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { GrayscaleImageCache } from "../src/game/GrayscaleImageCache";
import { PROFILE_SUPPLIED_ART } from "../src/game/profileSuppliedArt";

const expectedPaths = [
  ...Object.values(PROFILE_SUPPLIED_ART),
  ...Array.from({ length: 25 }, (_, index) => profileAvatarPath(index)),
  ...Array.from({ length: 19 }, (_, index) => profileFramePath(index)),
];
const image = (path: string) => ({ path, naturalWidth: 90, naturalHeight: 90 }) as unknown as HTMLImageElement;
const flush = async () => { for (let turn = 0; turn < 100; turn++) await Promise.resolve(); };
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};

/** Only invokes the production loaders, using an isolated reference-counted image host. */
function fixture() {
  const cache = new Map<string, HTMLImageElement>();
  const refs = new Map<HTMLImageElement, number>();
  const acquire = (path: string) => {
    const bitmap = cache.get(path) ?? image(path);
    cache.set(path, bitmap); refs.set(bitmap, (refs.get(bitmap) ?? 0) + 1);
    return bitmap;
  };
  const host = {
    createImage: vi.fn(async (path: string) => acquire(path)),
    prepareImages: vi.fn(async (_paths: readonly string[]) => undefined),
    releaseImage: vi.fn((bitmap: HTMLImageElement) => {
      const count = refs.get(bitmap) ?? 0;
      expect(count, "release must correspond to an owned image reference").toBeGreaterThan(0);
      refs.set(bitmap, count - 1);
    }),
    storageRead: vi.fn(), storageSet: vi.fn(), storageGet: vi.fn(),
  };
  const game = Object.create(ColorEscapeGame.prototype) as any;
  Object.assign(game, {
    host, save: { language: "zh-CN", playerProfile: { avatar: 0, frame: 0 } },
    profilePage: "stats", profileArt: undefined, profileArtLoading: false,
    profileGrayImages: new GrayscaleImageCache(() => undefined),
    profileArtRequestToken: 0, profileArtError: false, profileFeedback: undefined,
    homeProfileArt: undefined, homeProfileArtRevision: 0, artLoadedImageCount: 0,
    scheduleFrame: vi.fn(),
  });
  const assertNoStorage = () => {
    expect(host.storageRead).not.toHaveBeenCalled();
    expect(host.storageSet).not.toHaveBeenCalled();
    expect(host.storageGet).not.toHaveBeenCalled();
  };
  return { game, host, cache, refs, acquire, assertNoStorage };
}

describe("supplied profile image loading and ownership", () => {
  it("loads exactly 70 distinct paths once and binds all formal and compatibility fields correctly", async () => {
    const { game, host, assertNoStorage } = fixture();
    expect(expectedPaths).toHaveLength(70);
    expect(new Set(expectedPaths).size).toBe(70);
    game.requestProfileArt(); game.requestProfileArt();
    expect(game.profileArtLoading).toBe(true);
    await flush();
    expect(host.createImage.mock.calls.map(([path]) => path)).toEqual(expectedPaths);
    expect(game.profileArtLoading).toBe(false);
    expect(game.profileArtError).toBe(false);
    const art = game.profileArt;
    for (const [key, path] of Object.entries(PROFILE_SUPPLIED_ART)) expect(art.ui[key].path).toBe(path);
    const uiCount = Object.keys(PROFILE_SUPPLIED_ART).length;
    expect(art.avatars.map((bitmap: any) => bitmap.path)).toEqual(expectedPaths.slice(uiCount, uiCount + 25));
    expect(art.frames.map((bitmap: any) => bitmap.path)).toEqual(expectedPaths.slice(uiCount + 25));
    expect(art.header).toBe(art.ui.titleZh); expect(art.panel).toBe(art.ui.statsPanel);
    expect(art.save).toBe(art.ui.saveButton); expect(art.coin).toBe(art.ui.coin);
    expect(art.stats).toEqual([art.ui.statHighest, art.ui.statStars, art.ui.statRank]);
    expect(art.edit).toBe(art.ui.editName);
    expect(art.edit.path).toBe(PROFILE_SUPPLIED_ART.editName);
    expect(expectedPaths).not.toContain("assets/art/ui/profile-reference-v1/edit.png");
    game.requestProfileArt(); expect(host.createImage).toHaveBeenCalledTimes(70);
    game.releaseProfileArt(); game.releaseProfileArt();
    expect(host.releaseImage).toHaveBeenCalledTimes(70);
    expect(new Set(host.releaseImage.mock.calls.map(([bitmap]) => bitmap)).size).toBe(70);
    expect(game.profileArt).toBeUndefined(); assertNoStorage();
  });

  it("releases popup ownership once without dropping the independently acquired Home avatar/frame", async () => {
    const { game, host, refs, assertNoStorage } = fixture();
    game.requestHomeProfileArt(); await flush();
    const resident = game.homeProfileArt;
    const avatar = resident.avatars[0], frame = resident.frames[0];
    game.requestProfileArt(); await flush();
    // A cached host may return the very same HTMLImageElement for both acquisitions.
    expect(game.profileArt.avatars[0]).toBe(avatar); expect(game.profileArt.frames[0]).toBe(frame);
    expect(refs.get(avatar)).toBe(2); expect(refs.get(frame)).toBe(2);
    game.releaseProfileArt();
    expect(game.homeProfileArt).toBe(resident);
    expect(refs.get(avatar)).toBe(1); expect(refs.get(frame)).toBe(1);
    expect([...refs.values()].filter(value => value > 0)).toEqual([1, 1]);
    expect(host.releaseImage.mock.calls.filter(([bitmap]) => bitmap === avatar)).toHaveLength(1);
    expect(host.releaseImage.mock.calls.filter(([bitmap]) => bitmap === frame)).toHaveLength(1);
    assertNoStorage();
  });

  it.each(["page-cleared", "release-token"])("discards every late result after %s", async mode => {
    const { game, host, acquire, assertNoStorage } = fixture();
    const batch = deferred<HTMLImageElement[]>();
    const handles = expectedPaths.map(acquire);
    game.loadImages = vi.fn(() => batch.promise);
    game.requestProfileArt();
    if (mode === "page-cleared") game.profilePage = undefined;
    else game.releaseProfileArt();
    batch.resolve(handles); await flush();
    expect(game.profileArt).toBeUndefined(); expect(game.profileArtLoading).toBe(false);
    expect(host.releaseImage.mock.calls.map(([bitmap]) => bitmap)).toEqual(handles);
    expect(game.profileArtError).toBe(false); assertNoStorage();
  });

  it("does not replace a reopened popup or clear its loading state when an older batch finishes", async () => {
    const { game, host, acquire, refs, assertNoStorage } = fixture();
    const oldBatch = deferred<HTMLImageElement[]>(), newBatch = deferred<HTMLImageElement[]>();
    const oldHandles = expectedPaths.map(acquire), newHandles = expectedPaths.map(acquire);
    game.loadImages = vi.fn().mockReturnValueOnce(oldBatch.promise).mockReturnValueOnce(newBatch.promise);
    game.requestProfileArt(); game.releaseProfileArt(); game.requestProfileArt();
    oldBatch.resolve(oldHandles); await flush();
    expect(game.profileArt).toBeUndefined(); expect(game.profileArtLoading).toBe(true);
    expect(host.releaseImage).toHaveBeenCalledTimes(70);
    expect([...refs.values()].every(count => count === 1)).toBe(true);
    newBatch.resolve(newHandles); await flush();
    expect(game.profileArt.ui.statsPanel).toBe(newHandles[0]);
    expect(game.profileArtLoading).toBe(false); expect(game.profileArtError).toBe(false);
    game.releaseProfileArt(); expect(host.releaseImage).toHaveBeenCalledTimes(140);
    expect([...refs.values()].every(count => count === 0)).toBe(true); assertNoStorage();
  });

  it("cleans partial decode success on failure and retries a complete batch without leaking images", async () => {
    const { game, host, acquire, refs, assertNoStorage } = fixture();
    let failOnce = true;
    const successful: HTMLImageElement[] = [];
    host.createImage.mockImplementation(async path => {
      if (failOnce && path === PROFILE_SUPPLIED_ART.statCard) { failOnce = false; throw new Error("isolated decode failure"); }
      const bitmap = acquire(path); successful.push(bitmap); return bitmap;
    });
    game.requestProfileArt(); await flush();
    expect(game.profileArt).toBeUndefined(); expect(game.profileArtLoading).toBe(false);
    expect(game.profileArtError).toBe(true); expect(game.profileFeedback).toBe("点击重试加载");
    const partialCount = successful.length;
    expect(partialCount).toBeGreaterThan(0); expect(partialCount).toBeLessThan(70);
    expect(host.releaseImage).toHaveBeenCalledTimes(partialCount);
    expect([...refs.values()].every(count => count === 0)).toBe(true);
    game.requestProfileArt(); await flush();
    expect(game.profileArt?.ui).toBeDefined(); expect(game.profileArtLoading).toBe(false);
    expect(game.profileArtError).toBe(false); expect(successful).toHaveLength(partialCount + 70);
    game.releaseProfileArt(); expect(host.releaseImage).toHaveBeenCalledTimes(partialCount + 70);
    expect([...refs.values()].every(count => count === 0)).toBe(true); assertNoStorage();
  });

  it("ignores a stale failure once a new popup has loaded successfully", async () => {
    const { game, acquire, assertNoStorage } = fixture();
    const stale = deferred<HTMLImageElement[]>();
    game.loadImages = vi.fn().mockReturnValueOnce(stale.promise).mockResolvedValueOnce(expectedPaths.map(acquire));
    game.requestProfileArt(); game.releaseProfileArt(); game.requestProfileArt(); await flush();
    const current = game.profileArt;
    stale.reject(new Error("stale decode failure")); await flush();
    expect(game.profileArt).toBe(current); expect(game.profileArtError).toBe(false);
    expect(game.profileArtLoading).toBe(false); expect(game.profileFeedback).toBeUndefined();
    game.releaseProfileArt(); assertNoStorage();
  });
});
