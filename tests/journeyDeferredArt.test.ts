import { describe, expect, it, vi } from "vitest";
import { JourneyDeferredArt, type JourneyPresentationPaths } from "../src/game/JourneyDeferredArt";

const presentationPaths: JourneyPresentationPaths = {
  panel: "popup/panel", close: "popup/close", episodeButton: "popup/episode-button",
  rewardButton: "popup/reward-button", titleEpisodeUnlocked: "popup/episode-title",
  titleJourneyRewards: "popup/reward-title",
  rewards: { pulse: "popup/pulse", time: "popup/time", rocket: "popup/rocket", heart: "popup/heart", coins: "popup/coins" },
};

const image = (src: string): HTMLImageElement => ({ src }) as HTMLImageElement;
const flush = async (): Promise<void> => { await Promise.resolve(); await Promise.resolve(); };

function controlledLoader() {
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
  return {
    loadImage, pending,
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

function createStore(overrides: Partial<ConstructorParameters<typeof JourneyDeferredArt>[0]> = {}) {
  const loader = controlledLoader();
  const releaseImage = vi.fn();
  const onChange = vi.fn();
  const store = new JourneyDeferredArt({
    episodePaths: Array.from({ length: 10 }, (_, index) => `episode/${index}`),
    presentationPaths, loadImage: loader.loadImage, releaseImage, onChange, ...overrides,
  });
  return { store, loader, releaseImage, onChange };
}

describe("JourneyDeferredArt", () => {
  it("leaves the optional destination unloaded until requested and supports callers without one", async () => {
    const { store, loader } = createStore();
    await store.requestDestination();
    await store.requestDestination(true);
    expect(store.destination).toBeUndefined();
    expect(store.destinationLoading).toBe(false);
    expect(store.destinationError).toBeUndefined();
    expect(loader.loadImage).not.toHaveBeenCalled();
    store.dispose();
    await store.requestDestination();
    expect(loader.loadImage).not.toHaveBeenCalled();

    const configured = createStore({ destinationPath: "destination" });
    expect(configured.store.destination).toBeUndefined();
    expect(configured.store.destinationLoading).toBe(false);
    expect(configured.loader.loadImage).not.toHaveBeenCalled();
    configured.store.dispose();
  });

  it("queues the destination behind active chapters under the shared six-image limit", async () => {
    const { store, loader, onChange } = createStore({ destinationPath: "destination" });
    const chapters = store.requestEpisodes([0, 1, 2, 3, 4, 5]);
    const destination = store.requestDestination();
    const duplicate = store.requestDestination();
    const popup = store.requestPresentation();
    expect(store.destinationLoading).toBe(true);
    expect(store.destination).toBeUndefined();
    expect(loader.loadImage).toHaveBeenCalledTimes(6);
    expect(loader.pending.has("destination")).toBe(false);
    loader.resolve("episode/0");
    await flush();
    expect(loader.loadImage).toHaveBeenCalledTimes(7);
    expect(loader.pending.has("destination")).toBe(true);
    const destinationImage = loader.resolve("destination");
    await Promise.all([destination, duplicate]);
    expect(store.destination).toBe(destinationImage);
    expect(store.destinationLoading).toBe(false);
    await loader.completeAll();
    await Promise.all([chapters, popup]);
    expect(loader.maximumActive).toBe(6);
    expect(loader.loadImage).toHaveBeenCalledTimes(18);
    expect(loader.loadImage.mock.calls.filter(([path]) => path === "destination")).toHaveLength(1);
    expect(store.images).toHaveLength(18);
    expect(onChange).toHaveBeenCalledTimes(18);
  });

  it("requires an explicit destination retry and preserves loaded chapters after its failure", async () => {
    const { store, loader, onChange } = createStore({ destinationPath: "destination" });
    const chapter = store.requestEpisodes([0]);
    const retained = loader.resolve("episode/0");
    await chapter;
    const request = store.requestDestination();
    const failed = expect(request).rejects.toThrow("destination unavailable");
    loader.pending.get("destination")!.reject(new Error("destination unavailable"));
    await failed;
    expect(store.destination).toBeUndefined();
    expect(store.destinationError).toBe("destination unavailable");
    expect(store.destinationLoading).toBe(false);
    expect(store.episode(0)).toBe(retained);
    await expect(store.requestDestination()).rejects.toThrow("destination unavailable");
    expect(loader.loadImage).toHaveBeenCalledTimes(2);
    const retry = store.requestDestination(true);
    expect(store.destinationError).toBeUndefined();
    expect(store.destinationLoading).toBe(true);
    const destination = loader.resolve("destination");
    await retry;
    expect(store.destination).toBe(destination);
    expect(store.episode(0)).toBe(retained);
    expect(loader.loadImage).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("releases a destination that arrives after disposal without notifying or retaining it", async () => {
    const { store, loader, releaseImage, onChange } = createStore({ destinationPath: "destination" });
    const requested = store.requestDestination();
    const cancelled = expect(requested).rejects.toThrow("disposed");
    store.dispose();
    await cancelled;
    expect(store.destinationLoading).toBe(false);
    expect(store.destinationError).toBeUndefined();
    const late = loader.resolve("destination");
    await flush();
    expect(releaseImage).toHaveBeenCalledExactlyOnceWith(late);
    expect(onChange).not.toHaveBeenCalled();
    expect(store.destination).toBeUndefined();
    expect(store.images).toEqual([]);
    store.dispose();
    expect(releaseImage).toHaveBeenCalledTimes(1);
    await expect(store.requestDestination(true)).rejects.toThrow("disposed");
  });

  it("deduplicates a destination shared with a chapter and popup across loading and disposal", async () => {
    const { store, loader, releaseImage } = createStore({
      episodePaths: [presentationPaths.panel], destinationPath: presentationPaths.panel,
    });
    const requested = Promise.all([
      store.requestEpisodes([0]), store.requestDestination(), store.requestPresentation(),
    ]);
    await loader.completeAll();
    await requested;
    expect(loader.loadImage).toHaveBeenCalledTimes(11);
    expect(store.destination).toBe(store.episode(0));
    expect(store.destination).toBe(store.presentation?.panel);
    store.dispose();
    expect(releaseImage).toHaveBeenCalledTimes(11);
  });

  it("takes ownership of initial visible chapters without loading other art", async () => {
    const first = image("first-visible");
    const { store, loader, releaseImage, onChange } = createStore({ initialEpisodes: [{ index: 4, image: first }] });
    expect(store.episode(4)).toBe(first);
    expect(store.episode(3)).toBeUndefined();
    expect(store.images).toEqual([first]);
    expect(store.presentation).toBeUndefined();
    await store.requestEpisodes([4, 4]);
    expect(loader.loadImage).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    store.dispose();
    store.dispose();
    expect(releaseImage).toHaveBeenCalledExactlyOnceWith(first);
    expect(store.images).toEqual([]);
  });

  it("shares in-flight requests and applies one six-image limit to chapters and popups", async () => {
    const { store, loader, onChange } = createStore();
    const chapters = store.requestEpisodes([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const duplicate = store.requestEpisodes([0, 0, 4, 9]);
    const popup = store.requestPresentation();
    const duplicatePopup = store.requestPresentation();
    expect(loader.loadImage).toHaveBeenCalledTimes(6);
    expect(store.pendingEpisodeIndexes).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(store.presentationLoading).toBe(true);
    expect(store.presentation).toBeUndefined();
    loader.resolve("episode/0");
    await flush();
    expect(loader.loadImage).toHaveBeenCalledTimes(7);
    expect(store.pendingEpisodeIndexes).not.toContain(0);
    await loader.completeAll();
    await Promise.all([chapters, duplicate, popup, duplicatePopup]);
    expect(loader.maximumActive).toBe(6);
    expect(loader.loadImage).toHaveBeenCalledTimes(21);
    expect(new Set(loader.loadImage.mock.calls.map(([path]) => path)).size).toBe(21);
    expect(store.images).toHaveLength(21);
    expect(store.pendingEpisodeIndexes).toEqual([]);
    expect(store.presentationLoading).toBe(false);
    expect(store.presentation?.rewards.coins.src).toBe(presentationPaths.rewards.coins);
    expect(onChange).toHaveBeenCalledTimes(21);
  });

  it("does not retry a failed chapter until explicitly requested", async () => {
    const { store, loader, onChange } = createStore();
    const first = store.requestEpisodes([1, 2]);
    const failed = expect(first).rejects.toThrow("offline");
    loader.pending.get("episode/1")!.reject(new Error("offline"));
    const retained = loader.resolve("episode/2");
    await failed;
    expect(store.failedEpisodeIndexes).toEqual([1]);
    expect(store.episode(2)).toBe(retained);
    await expect(store.requestEpisodes([1, 2])).rejects.toThrow("offline");
    expect(loader.loadImage).toHaveBeenCalledTimes(2);
    const retry = store.requestEpisodes([1, 2], true);
    expect(store.failedEpisodeIndexes).toEqual([]);
    expect(store.pendingEpisodeIndexes).toEqual([1]);
    expect(loader.loadImage).toHaveBeenCalledTimes(3);
    loader.resolve("episode/1");
    await retry;
    expect(store.episode(2)).toBe(retained);
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("keeps partial popup success, exposes no incomplete popup, and retries only the failed image", async () => {
    const { store, loader, onChange } = createStore();
    const requested = store.requestPresentation();
    const failed = expect(requested).rejects.toThrow("missing panel");
    loader.pending.get(presentationPaths.panel)!.reject(new Error("missing panel"));
    await failed;
    await loader.completeAll();
    expect(store.presentationError).toBe("missing panel");
    expect(store.presentationLoading).toBe(false);
    expect(store.presentation).toBeUndefined();
    const retained = store.images;
    expect(retained).toHaveLength(10);
    await expect(store.requestPresentation()).rejects.toThrow("missing panel");
    expect(loader.loadImage).toHaveBeenCalledTimes(11);
    const retry = store.requestPresentation(true);
    expect(store.presentationError).toBeUndefined();
    expect(store.presentationLoading).toBe(true);
    expect(loader.loadImage).toHaveBeenCalledTimes(12);
    loader.resolve(presentationPaths.panel);
    await retry;
    expect(store.presentation?.panel.src).toBe(presentationPaths.panel);
    expect(store.images).toEqual(expect.arrayContaining([...retained]));
    expect(onChange).toHaveBeenCalledTimes(12);
  });

  it("disposes queued and in-flight requests promptly and releases late images without notifying", async () => {
    const initial = image("initial");
    const { store, loader, releaseImage, onChange } = createStore({ initialEpisodes: [{ index: 9, image: initial }] });
    const chapters = store.requestEpisodes([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const popup = store.requestPresentation();
    const chaptersCancelled = expect(chapters).rejects.toThrow("disposed");
    const popupCancelled = expect(popup).rejects.toThrow("disposed");
    expect(loader.loadImage).toHaveBeenCalledTimes(6);
    store.dispose();
    await Promise.all([chaptersCancelled, popupCancelled]);
    expect(releaseImage).toHaveBeenCalledExactlyOnceWith(initial);
    expect(store.pendingEpisodeIndexes).toEqual([]);
    expect(store.presentationLoading).toBe(false);
    await loader.completeAll();
    expect(loader.loadImage).toHaveBeenCalledTimes(6);
    expect(releaseImage).toHaveBeenCalledTimes(7);
    expect(onChange).not.toHaveBeenCalled();
    expect(store.images).toEqual([]);
    expect(store.episode(0)).toBeUndefined();
    expect(store.presentation).toBeUndefined();
    store.dispose();
    expect(releaseImage).toHaveBeenCalledTimes(7);
    await expect(store.requestEpisodes([0], true)).rejects.toThrow("disposed");
    await expect(store.requestPresentation(true)).rejects.toThrow("disposed");
  });

  it("deduplicates paths shared by chapters and the popup and releases each image once", async () => {
    const { store, loader, releaseImage } = createStore({ episodePaths: [presentationPaths.panel, presentationPaths.panel] });
    const requests = Promise.all([store.requestEpisodes([0, 1]), store.requestPresentation()]);
    await loader.completeAll();
    await requests;
    expect(loader.loadImage).toHaveBeenCalledTimes(11);
    expect(store.episode(0)).toBe(store.episode(1));
    expect(store.presentation?.panel).toBe(store.episode(0));
    store.dispose();
    expect(releaseImage).toHaveBeenCalledTimes(11);
  });

  it("turns a synchronous loader exception into a retryable failure", async () => {
    const recovered = image("recovered");
    const loadImage = vi.fn<(_: string) => Promise<HTMLImageElement>>()
      .mockImplementationOnce(() => { throw new Error("loader unavailable"); })
      .mockResolvedValueOnce(recovered);
    const { store, onChange } = createStore({ loadImage });
    await expect(store.requestEpisodes([0])).rejects.toThrow("loader unavailable");
    expect(store.failedEpisodeIndexes).toEqual([0]);
    await store.requestEpisodes([0], true);
    expect(store.episode(0)).toBe(recovered);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid indexes without starting a partial request", async () => {
    const { store, loader } = createStore();
    await expect(store.requestEpisodes([0, -1])).rejects.toThrow("Invalid journey episode index");
    await expect(store.requestEpisodes([10])).rejects.toThrow("Invalid journey episode index");
    await expect(store.requestEpisodes([0.5])).rejects.toThrow("Invalid journey episode index");
    expect(loader.loadImage).not.toHaveBeenCalled();
  });
});
