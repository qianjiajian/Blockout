import { describe, expect, it, vi } from "vitest";
import { CollectionArtworkStore } from "../src/game/CollectionArtworkStore";

const image = (src: string): HTMLImageElement => ({ src }) as HTMLImageElement;
const flush = async (): Promise<void> => { await Promise.resolve(); await Promise.resolve(); };

function createStore(paths: readonly string[] = Array.from({ length: 10 }, (_, index) => `atlas/${index}`)) {
  const pending = new Map<string, { resolve: (image: HTMLImageElement) => void; reject: (error: Error) => void }>();
  let active = 0;
  let maximumActive = 0;
  const loadImage = vi.fn((path: string) => {
    active += 1;
    maximumActive = Math.max(active, maximumActive);
    return new Promise<HTMLImageElement>((resolve, reject) => {
      pending.set(path, {
        resolve: (value) => { pending.delete(path); active -= 1; resolve(value); },
        reject: (error) => { pending.delete(path); active -= 1; reject(error); },
      });
    });
  });
  const releaseImage = vi.fn();
  const onChange = vi.fn();
  const store = new CollectionArtworkStore({ paths, loadImage, releaseImage, onChange });
  return {
    store, pending, loadImage, releaseImage, onChange,
    get maximumActive() { return maximumActive; },
    resolve(path: string) {
      const value = image(path);
      const request = pending.get(path);
      if (!request) throw new Error(`No pending image: ${path}`);
      request.resolve(value);
      return value;
    },
    async completeAll() {
      while (pending.size > 0) {
        for (const path of [...pending.keys()]) this.resolve(path);
        await flush();
      }
    },
  };
}

describe("CollectionArtworkStore", () => {
  it("loads only requested atlases and keeps them ready for revisiting pages", async () => {
    const { store, loadImage, resolve, onChange } = createStore();
    expect(loadImage).not.toHaveBeenCalled();
    const requested = store.request([2, 3]);
    expect(store.pendingIndexes).toEqual([2, 3]);
    const atlas2 = resolve("atlas/2");
    const atlas3 = resolve("atlas/3");
    await requested;
    expect(store.loadedIndexes).toEqual([2, 3]);
    expect(store.images).toEqual([atlas2, atlas3]);
    expect(store.image(2)).toBe(atlas2);
    expect(store.image(1)).toBeUndefined();
    await store.request([3, 2, 2]);
    expect(loadImage).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("shares duplicate requests and uses at most two image loads across pages", async () => {
    const control = createStore();
    const { store, loadImage } = control;
    const all = store.request([0, 1, 2, 3, 4, 5]);
    const repeated = store.request([0, 0, 1, 5]);
    expect(loadImage).toHaveBeenCalledTimes(2);
    expect(store.pendingIndexes).toEqual([0, 1, 2, 3, 4, 5]);
    control.resolve("atlas/0");
    await flush();
    expect(loadImage).toHaveBeenCalledTimes(3);
    expect(store.loadedIndexes).toEqual([0]);
    await control.completeAll();
    await Promise.all([all, repeated]);
    expect(control.maximumActive).toBe(2);
    expect(loadImage).toHaveBeenCalledTimes(6);
    expect(new Set(loadImage.mock.calls.map(([path]) => path)).size).toBe(6);
    expect(store.loadedIndexes).toEqual([0, 1, 2, 3, 4, 5]);
    expect(store.pendingIndexes).toEqual([]);
  });

  it("promotes a new current page ahead of old prefetch while preserving current-page order", async () => {
    const control = createStore();
    const { store, loadImage } = control;
    const oldPrefetch = store.request([0, 1, 2, 3, 4], false, false);
    const currentPage = store.request([4, 6, 3]);
    const newPrefetch = store.request([5], false, false);
    expect(loadImage.mock.calls.map(([path]) => path)).toEqual(["atlas/0", "atlas/1"]);
    control.resolve("atlas/0");
    await flush();
    expect(loadImage.mock.calls.at(-1)).toEqual(["atlas/4"]);
    control.resolve("atlas/1");
    await flush();
    expect(loadImage.mock.calls.at(-1)).toEqual(["atlas/6"]);
    control.resolve("atlas/4");
    await flush();
    expect(loadImage.mock.calls.at(-1)).toEqual(["atlas/3"]);
    await control.completeAll();
    await Promise.all([oldPrefetch, currentPage, newPrefetch]);
    expect(loadImage.mock.calls.map(([path]) => path)).toEqual([
      "atlas/0", "atlas/1", "atlas/4", "atlas/6", "atlas/3", "atlas/2", "atlas/5",
    ]);
    expect(control.maximumActive).toBe(2);
  });

  it("retains partial success and retries failures only after an explicit retry", async () => {
    const { store, loadImage, pending, resolve, onChange } = createStore();
    const requested = store.request([0, 1]);
    const failed = expect(requested).rejects.toThrow("offline");
    const retained = resolve("atlas/0");
    pending.get("atlas/1")!.reject(new Error("offline"));
    await failed;
    expect(store.loadedIndexes).toEqual([0]);
    expect(store.failedIndexes).toEqual([1]);
    await expect(store.request([0, 1])).rejects.toThrow("offline");
    expect(loadImage).toHaveBeenCalledTimes(2);
    const retry = store.request([0, 1], true);
    expect(store.failedIndexes).toEqual([]);
    expect(store.pendingIndexes).toEqual([1]);
    resolve("atlas/1");
    await retry;
    expect(store.image(0)).toBe(retained);
    expect(store.loadedIndexes).toEqual([0, 1]);
    expect(loadImage).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("cancels promises immediately, drops queued work, and releases late images without callbacks", async () => {
    const control = createStore();
    const { store, loadImage, releaseImage, onChange } = control;
    const current = store.request([0]);
    const retained = control.resolve("atlas/0");
    await current;
    const prefetch = store.request([1, 2, 3, 4], false, false);
    const duplicate = store.request([1, 3]);
    const cancelled = expect(prefetch).rejects.toThrow("disposed");
    const duplicateCancelled = expect(duplicate).rejects.toThrow("disposed");
    expect(loadImage).toHaveBeenCalledTimes(3);
    store.dispose();
    await Promise.all([cancelled, duplicateCancelled]);
    expect(releaseImage).toHaveBeenCalledExactlyOnceWith(retained);
    expect(store.loadedIndexes).toEqual([]);
    expect(store.pendingIndexes).toEqual([]);
    expect(store.failedIndexes).toEqual([]);
    await control.completeAll();
    expect(loadImage).toHaveBeenCalledTimes(3);
    expect(releaseImage).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(store.images).toEqual([]);
    expect(store.image(1)).toBeUndefined();
    store.dispose();
    expect(releaseImage).toHaveBeenCalledTimes(3);
    await expect(store.request([1], true)).rejects.toThrow("disposed");
  });

  it("ignores a failed image arriving after disposal without reviving error state", async () => {
    const { store, pending, onChange, releaseImage } = createStore();
    const request = store.request([0]);
    const cancelled = expect(request).rejects.toThrow("disposed");
    store.dispose();
    await cancelled;
    pending.get("atlas/0")!.reject(new Error("late network failure"));
    await flush();
    expect(store.failedIndexes).toEqual([]);
    expect(onChange).not.toHaveBeenCalled();
    expect(releaseImage).not.toHaveBeenCalled();
  });

  it("deduplicates aliases of one path for loading, indexing, and releasing", async () => {
    const control = createStore(["shared", "other", "shared"]);
    const requested = control.store.request([0, 1, 2]);
    await control.completeAll();
    await requested;
    expect(control.loadImage).toHaveBeenCalledTimes(2);
    expect(control.store.image(0)).toBe(control.store.image(2));
    expect(control.store.loadedIndexes).toEqual([0, 1, 2]);
    expect(control.store.images).toHaveLength(2);
    control.store.dispose();
    expect(control.releaseImage).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid indexes before starting any part of the request", async () => {
    const { store, loadImage } = createStore();
    for (const invalid of [-1, 10, 0.5, NaN, Infinity]) {
      await expect(store.request([0, invalid])).rejects.toThrow("Invalid collection artwork index");
    }
    await store.request([]);
    expect(loadImage).not.toHaveBeenCalled();
    expect(store.pendingIndexes).toEqual([]);
  });

  it("reports synchronous loader failures and permits their explicit retry", async () => {
    const recovered = image("recovered");
    const loadImage = vi.fn<(_: string) => Promise<HTMLImageElement>>()
      .mockImplementationOnce(() => { throw new Error("image API unavailable"); })
      .mockResolvedValueOnce(recovered);
    const onChange = vi.fn();
    const store = new CollectionArtworkStore({ paths: ["atlas"], loadImage, releaseImage: vi.fn(), onChange });
    await expect(store.request([0])).rejects.toThrow("image API unavailable");
    expect(store.failedIndexes).toEqual([0]);
    await store.request([0], true);
    expect(store.image(0)).toBe(recovered);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("bounds a long visit to its visible and adjacent atlas window and reloads evicted pages", async () => {
    const control = createStore();
    const { store, releaseImage, loadImage } = control;
    for (let current = 0; current < 10; current++) {
      const window = [current - 1, current, current + 1].filter(index => index >= 0 && index < 10);
      store.retain(window);
      const requested = store.request(window);
      await control.completeAll();
      await requested;
      expect(store.loadedIndexes).toEqual(window);
      expect(store.images.length).toBeLessThanOrEqual(3);
      expect(store.image(current)).toBeDefined();
    }
    expect(loadImage).toHaveBeenCalledTimes(10);
    expect(releaseImage).toHaveBeenCalledTimes(8);
    store.retain([0, 1]);
    const revisit = store.request([0, 1]);
    await control.completeAll();
    await revisit;
    expect(store.loadedIndexes).toEqual([0, 1]);
    expect(loadImage).toHaveBeenCalledTimes(12);
    store.dispose();
    expect(releaseImage).toHaveBeenCalledTimes(12);
    expect(new Set(releaseImage.mock.calls.map(([value]) => value)).size).toBe(12);
  });

  it("drops obsolete queued prefetch and releases late images without publishing them", async () => {
    const control = createStore();
    const { store, loadImage, releaseImage, onChange } = control;
    store.retain([0, 1, 2, 3]);
    const stale = store.request([0, 1, 2, 3], false, false);
    const rejected = expect(stale).rejects.toThrow("retained window");
    store.retain([7, 8]);
    const current = store.request([7, 8]);
    await rejected;
    expect(loadImage.mock.calls.map(([path]) => path)).toEqual(["atlas/0", "atlas/1"]);
    const late0 = control.resolve("atlas/0");
    await flush();
    expect(releaseImage).toHaveBeenCalledExactlyOnceWith(late0);
    expect(store.image(0)).toBeUndefined();
    expect(onChange).not.toHaveBeenCalled();
    const late1 = control.resolve("atlas/1");
    await flush();
    expect(releaseImage).toHaveBeenCalledWith(late1);
    expect(onChange).not.toHaveBeenCalled();
    await control.completeAll();
    await current;
    expect(loadImage.mock.calls.map(([path]) => path)).toEqual(["atlas/0", "atlas/1", "atlas/7", "atlas/8"]);
    expect(store.loadedIndexes).toEqual([7, 8]);
    expect(control.maximumActive).toBe(2);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("reuses an in-flight image when navigation returns before it finishes", async () => {
    const control = createStore();
    const { store, loadImage, releaseImage } = control;
    store.retain([0]);
    const first = store.request([0]);
    store.retain([1]);
    const middle = store.request([1]);
    const obsolete = expect(middle).rejects.toThrow("retained window");
    store.retain([0]);
    const revisit = store.request([0]);
    const kept = control.resolve("atlas/0");
    const dropped = control.resolve("atlas/1");
    await Promise.all([first, revisit, obsolete]);
    expect(loadImage).toHaveBeenCalledTimes(2);
    expect(store.image(0)).toBe(kept);
    expect(store.image(1)).toBeUndefined();
    expect(releaseImage).toHaveBeenCalledExactlyOnceWith(dropped);
  });

  it("keeps failed slots behind explicit retry after they leave and reenter the window", async () => {
    const control = createStore();
    const { store, pending, loadImage, onChange } = control;
    store.retain([0]);
    const initial = store.request([0]);
    const failed = expect(initial).rejects.toThrow("offline");
    store.retain([1]);
    pending.get("atlas/0")!.reject(new Error("offline"));
    await failed;
    expect(onChange).not.toHaveBeenCalled();
    store.retain([0]);
    await expect(store.request([0])).rejects.toThrow("offline");
    expect(loadImage).toHaveBeenCalledTimes(1);
    const retry = store.request([0], true);
    control.resolve("atlas/0");
    await retry;
    expect(store.loadedIndexes).toEqual([0]);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("retains a shared path by either alias and rejects invalid windows before releasing anything", async () => {
    const control = createStore(["shared", "other", "shared"]);
    const { store, releaseImage } = control;
    const initial = store.request([0, 1]);
    await control.completeAll();
    await initial;
    for (const invalid of [-1, 3, 0.5, NaN, Infinity]) {
      expect(() => store.retain([2, invalid])).toThrow("Invalid collection artwork index");
    }
    expect(releaseImage).not.toHaveBeenCalled();
    store.retain([2]);
    expect(store.image(0)).toBe(store.image(2));
    expect(store.loadedIndexes).toEqual([0, 2]);
    expect(releaseImage).toHaveBeenCalledTimes(1);
    await expect(store.request([1])).rejects.toThrow("retained window");
    expect(control.loadImage).toHaveBeenCalledTimes(2);
    store.retain([]);
    expect(store.images).toEqual([]);
    expect(releaseImage).toHaveBeenCalledTimes(2);
  });
});
