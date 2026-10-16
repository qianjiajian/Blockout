import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdleImageCache, IDLE_IMAGE_CACHE_BYTES, IDLE_IMAGE_MAX_BYTES, IDLE_IMAGE_TTL_MS } from "../src/platform/IdleImageCache";
import { WebHost } from "../src/platform/WebHost";

const image = (width = 64, height = 64) => ({ naturalWidth: width, naturalHeight: height, width, height, src: "loaded" }) as HTMLImageElement;
beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("bounded idle image reuse", () => {
  it("only reuses surrendered images, preserving independent active ownership", async () => {
    const release = vi.fn(), cache = new IdleImageCache({ release });
    const load = vi.fn(async () => image());
    const first = await cache.acquire("same", load), active = await cache.acquire("same", load);
    expect(first).not.toBe(active);
    cache.release(first);
    expect(await cache.acquire("same", load)).toBe(first);
    expect(load).toHaveBeenCalledTimes(2);
    expect(release).not.toHaveBeenCalled();
    expect(cache.stats).toMatchObject({ idleImages: 0, hits: 1, loads: 2 });
    cache.dispose(); cache.release(first); cache.release(active);
    expect(release).toHaveBeenCalledTimes(2);
  });

  it("does not merge concurrent loads or poison a retry after failure", async () => {
    const cache = new IdleImageCache({ release: vi.fn() });
    const images = [image(), image()];
    const load = vi.fn(async () => images.shift()!);
    const [a, b] = await Promise.all([cache.acquire("same", load), cache.acquire("same", load)]);
    expect(a).not.toBe(b);
    await expect(cache.acquire("failure", async () => { throw new Error("offline"); })).rejects.toThrow("offline");
    const recovered = image();
    expect(await cache.acquire("failure", async () => recovered)).toBe(recovered);
    cache.dispose();
  });

  it("caps decoded idle bytes, evicts oldest returns, and immediately drops large atlases", async () => {
    const release = vi.fn(), cache = new IdleImageCache({ release });
    const images: HTMLImageElement[] = [];
    for (let n = 0; n < 5; n++) {
      const entry = await cache.acquire(String(n), async () => image(512, 512));
      images.push(entry); cache.release(entry);
      expect(cache.stats.idleBytes).toBeLessThanOrEqual(IDLE_IMAGE_CACHE_BYTES);
    }
    expect(cache.stats).toMatchObject({ idleImages: 4, idleBytes: IDLE_IMAGE_CACHE_BYTES });
    expect(release).toHaveBeenCalledExactlyOnceWith(images[0]);
    const atlas = await cache.acquire("atlas", async () => image(512, 513));
    cache.release(atlas);
    expect(release).toHaveBeenLastCalledWith(atlas);
    expect(cache.stats.idleBytes).toBe(IDLE_IMAGE_MAX_BYTES * 4);
    cache.dispose();
  });

  it("expires unused entries on a timer but never expires an image already reacquired", async () => {
    const release = vi.fn(), cache = new IdleImageCache({ release });
    const a = await cache.acquire("a", async () => image()), b = await cache.acquire("b", async () => image());
    cache.release(a); cache.release(b);
    await vi.advanceTimersByTimeAsync(IDLE_IMAGE_TTL_MS - 1);
    expect(await cache.acquire("a", async () => image())).toBe(a);
    await vi.advanceTimersByTimeAsync(1);
    expect(release).toHaveBeenCalledExactlyOnceWith(b);
    expect(cache.stats.idleBytes).toBe(0);
    cache.dispose(); cache.release(a);
    expect(release).toHaveBeenLastCalledWith(a);
  });

  it("clears idle ownership on background/disposal and releases late decoded results", async () => {
    const release = vi.fn(), cache = new IdleImageCache({ release });
    const a = await cache.acquire("a", async () => image()), b = await cache.acquire("b", async () => image());
    cache.release(a); cache.setPaused(true); cache.release(b);
    expect(cache.stats.idleBytes).toBe(0);
    expect(release).toHaveBeenCalledTimes(2);
    cache.setPaused(false);
    let resolve!: (image: HTMLImageElement) => void;
    const pending = cache.acquire("late", () => new Promise< HTMLImageElement >(yes => { resolve = yes; }));
    const rejected = expect(pending).rejects.toThrow("disposed");
    cache.dispose(); const late = image(); resolve(late); await rejected;
    expect(release).toHaveBeenLastCalledWith(late);
    await expect(cache.acquire("new", async () => image())).rejects.toThrow("disposed");
  });

  it("rejects and releases an idle hit disposed before its asynchronous handoff", async () => {
    const release = vi.fn(), cache = new IdleImageCache({ release });
    const first = await cache.acquire("same", async () => image());
    cache.release(first);
    const pending = cache.acquire("same", async () => image());
    cache.dispose();
    await expect(pending).rejects.toThrow("disposed");
    expect(release).toHaveBeenCalledExactlyOnceWith(first);
    expect(cache.stats.idleBytes).toBe(0);
  });

  it("keeps one idle item per path and ignores duplicate releases before reuse", async () => {
    const release = vi.fn(), cache = new IdleImageCache({ release });
    const a = await cache.acquire("same", async () => image()), b = await cache.acquire("same", async () => image());
    cache.release(a); cache.release(a); cache.release(b);
    expect(release).toHaveBeenCalledExactlyOnceWith(a);
    expect(cache.stats).toMatchObject({ idleImages: 1, idleBytes: 64 * 64 * 4 });
    cache.dispose(); cache.release(a); cache.release(b);
    expect(release).toHaveBeenCalledTimes(2);
  });
});

function hostHarness() {
  let loads = 0;
  class FakeImage {
    width = 64; height = 64; naturalWidth = 64; naturalHeight = 64;
    onload?: () => void; onerror?: () => void; private value = "";
    get src() { return this.value; }
    set src(value: string) { this.value = value; if (value) { loads++; void Promise.resolve().then(() => this.onload?.()); } }
  }
  const canvas = Object.assign(new EventTarget(), {
    width: 0, height: 0, setAttribute: vi.fn(), getContext: () => ({}), remove: vi.fn(),
    getBoundingClientRect: () => ({ width: 320, height: 568 }),
  });
  const page = Object.assign(new EventTarget(), { devicePixelRatio: 1, setTimeout, clearTimeout });
  const doc = Object.assign(new EventTarget(), { hidden: false, body: { append: vi.fn() }, createElement: () => canvas });
  vi.stubGlobal("window", page); vi.stubGlobal("document", doc); vi.stubGlobal("Image", FakeImage);
  const host = new WebHost();
  return { host, doc, loads: () => loads };
}

describe("Web page image cache integration", () => {
  it.each([
    "assets/art/ui/formal-pages/shop-supplied-v1/video.png",
    "assets/art/ui/profile-frames-supplied-v1/frame-0.png",
    "assets/art/ui/profile-frames-supplied-v1/frame-18.png",
  ])("reuses closed page image %s while preserving uncached collection/journey image identities", async (path) => {
    const h = hostHarness();
    const first = await h.host.createImage(path); h.host.releaseImage(first);
    const next = await h.host.createImage(path);
    expect(next).toBe(first); expect(h.loads()).toBe(1);
    for (const path of ["assets/art/ui/formal-pages/collection-card-atlases-v1/level-01.jpg", "assets/art/ui/formal-pages/journey/episode-01.webp"]) {
      const image = await h.host.createImage(path); h.host.releaseImage(image);
      expect(image.src).toBe("");
      expect(await h.host.createImage(path)).not.toBe(image);
    }
    h.host.dispose(); h.host.releaseImage(next); expect(next.src).toBe("");
  });

  it("drops idle images on real visibility callbacks and blocks reuse after host disposal", async () => {
    const h = hostHarness(), path = "assets/art/ui/formal-pages/leaderboard/star.png";
    const first = await h.host.createImage(path); h.host.releaseImage(first);
    h.doc.hidden = true; h.doc.dispatchEvent(new Event("visibilitychange"));
    expect(first.src).toBe("");
    h.doc.hidden = false; h.doc.dispatchEvent(new Event("visibilitychange"));
    const next = await h.host.createImage(path); expect(next).not.toBe(first);
    h.host.releaseImage(next); h.host.dispose(); expect(next.src).toBe("");
    await expect(h.host.createImage(path)).rejects.toThrow("disposed");
  });
});
