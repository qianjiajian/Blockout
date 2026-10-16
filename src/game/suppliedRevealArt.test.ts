import { describe, expect, it, vi } from "vitest";
import { SUPPLIED_REVEAL_ART, SuppliedRevealArtStore } from "./suppliedRevealArt";

const settle = async (): Promise<void> => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
const picture = (src: string): HTMLImageElement => ({ src }) as HTMLImageElement;

describe("supplied reveal decorations", () => {
  it("loads only the requested group once and keeps the group independently releasable", async () => {
    const load = vi.fn(async (path: string) => picture(path)), release = vi.fn(), changed = vi.fn();
    const store = new SuppliedRevealArtStore(load, release, changed);
    store.request("painting"); store.request("painting");
    await settle();
    expect(load.mock.calls.map(([path]) => path)).toEqual(Object.values(SUPPLIED_REVEAL_ART.painting));
    expect(store.imageGroup("painting")?.banner.src).toBe(SUPPLIED_REVEAL_ART.painting.banner);
    expect(store.imageGroup("scene")).toBeUndefined();
    store.dispose("scene");
    expect(release).not.toHaveBeenCalled();
    store.dispose("painting");
    expect(release).toHaveBeenCalledTimes(5);
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("releases a failed batch, does not retry on redraw, and supports explicit retry", async () => {
    let fail = true;
    const load = vi.fn(async (path: string) => {
      if (fail && path === SUPPLIED_REVEAL_ART.scene.button) throw new Error("offline");
      return picture(path);
    });
    const release = vi.fn(), store = new SuppliedRevealArtStore(load, release, vi.fn());
    store.request("scene"); await settle();
    expect(store.failed("scene")).toBe(true);
    expect(store.imageGroup("scene")).toBeUndefined();
    expect(release).toHaveBeenCalledTimes(4);
    store.request("scene"); await settle();
    expect(load).toHaveBeenCalledTimes(5);
    fail = false; store.request("scene", true); await settle();
    expect(store.failed("scene")).toBe(false);
    expect(store.imageGroup("scene")?.button.src).toBe(SUPPLIED_REVEAL_ART.scene.button);
    expect(load).toHaveBeenCalledTimes(10);
  });

  it("releases late images after leaving and cannot revive the disposed group", async () => {
    const pending: Array<() => void> = [];
    const load = vi.fn((path: string) => new Promise<HTMLImageElement>((resolve) => pending.push(() => resolve(picture(path)))));
    const release = vi.fn(), changed = vi.fn(), store = new SuppliedRevealArtStore(load, release, changed);
    store.request("painting"); store.dispose("painting");
    pending.forEach((resolve) => resolve()); await settle();
    expect(store.imageGroup("painting")).toBeUndefined();
    expect(release).toHaveBeenCalledTimes(5);
    expect(changed).not.toHaveBeenCalled();
  });
});
