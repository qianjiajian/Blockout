interface JourneyPresentationResources<T> {
  panel: T;
  close: T;
  episodeButton: T;
  rewardButton: T;
  titleEpisodeUnlocked: T;
  titleJourneyRewards: T;
  rewards: { pulse: T; time: T; rocket: T; heart: T; coins: T };
}

export type JourneyPresentationArt = JourneyPresentationResources<HTMLImageElement>;
export type JourneyPresentationPaths = JourneyPresentationResources<string>;

interface JourneyDeferredArtOptions {
  episodePaths: readonly string[];
  presentationPaths: JourneyPresentationPaths;
  initialEpisodes?: readonly { index: number; image: HTMLImageElement }[];
  loadImage: (path: string) => Promise<HTMLImageElement>;
  releaseImage: (image: HTMLImageElement) => void;
  onChange: () => void;
}

interface ArtEntry {
  path: string;
  state: "idle" | "queued" | "loading" | "loaded" | "failed";
  image?: HTMLImageElement;
  error?: Error;
  promise?: Promise<void>;
  resolve?: () => void;
  reject?: (error: Error) => void;
}

const MAX_CONCURRENT_IMAGES = 6;
const disposedError = (): Error => new Error("Journey artwork has been disposed");

/** Owns only the chapter and popup images transferred to or requested from it. */
export class JourneyDeferredArt {
  private readonly entries = new Map<string, ArtEntry>();
  private readonly episodes: ArtEntry[];
  private readonly popup: JourneyPresentationResources<ArtEntry>;
  private readonly popupEntries: ArtEntry[];
  private readonly queue: ArtEntry[] = [];
  private readonly releasedImages = new Set<HTMLImageElement>();
  private activeLoads = 0;
  private disposed = false;

  constructor(private readonly options: JourneyDeferredArtOptions) {
    const entry = (path: string): ArtEntry => {
      let resource = this.entries.get(path);
      if (!resource) {
        resource = { path, state: "idle" };
        this.entries.set(path, resource);
      }
      return resource;
    };
    this.episodes = options.episodePaths.map(entry);
    const paths = options.presentationPaths;
    this.popup = {
      panel: entry(paths.panel),
      close: entry(paths.close),
      episodeButton: entry(paths.episodeButton),
      rewardButton: entry(paths.rewardButton),
      titleEpisodeUnlocked: entry(paths.titleEpisodeUnlocked),
      titleJourneyRewards: entry(paths.titleJourneyRewards),
      rewards: {
        pulse: entry(paths.rewards.pulse),
        time: entry(paths.rewards.time),
        rocket: entry(paths.rewards.rocket),
        heart: entry(paths.rewards.heart),
        coins: entry(paths.rewards.coins),
      },
    };
    this.popupEntries = [
      this.popup.panel, this.popup.close, this.popup.episodeButton, this.popup.rewardButton,
      this.popup.titleEpisodeUnlocked, this.popup.titleJourneyRewards,
      ...Object.values(this.popup.rewards),
    ];
    for (const initial of options.initialEpisodes ?? []) {
      const resource = this.episodes[initial.index];
      if (!resource || resource.image) {
        if (resource?.image !== initial.image) this.release(initial.image);
        continue;
      }
      resource.image = initial.image;
      resource.state = "loaded";
    }
  }

  episode(index: number): HTMLImageElement | undefined {
    return this.disposed ? undefined : this.episodes[index]?.image;
  }

  get presentation(): JourneyPresentationArt | undefined {
    if (this.disposed || this.popupEntries.some((entry) => !entry.image)) return undefined;
    const popup = this.popup;
    return {
      panel: popup.panel.image!,
      close: popup.close.image!,
      episodeButton: popup.episodeButton.image!,
      rewardButton: popup.rewardButton.image!,
      titleEpisodeUnlocked: popup.titleEpisodeUnlocked.image!,
      titleJourneyRewards: popup.titleJourneyRewards.image!,
      rewards: {
        pulse: popup.rewards.pulse.image!,
        time: popup.rewards.time.image!,
        rocket: popup.rewards.rocket.image!,
        heart: popup.rewards.heart.image!,
        coins: popup.rewards.coins.image!,
      },
    };
  }

  get images(): readonly HTMLImageElement[] {
    if (this.disposed) return [];
    return [...new Set([...this.entries.values()].flatMap((entry) => entry.image ? [entry.image] : []))];
  }

  get pendingEpisodeIndexes(): readonly number[] {
    return this.episodeIndexes((entry) => entry.state === "queued" || entry.state === "loading");
  }

  get failedEpisodeIndexes(): readonly number[] {
    return this.episodeIndexes((entry) => entry.state === "failed");
  }

  get presentationLoading(): boolean {
    return !this.disposed && this.popupEntries.some((entry) => entry.state === "queued" || entry.state === "loading");
  }

  get presentationError(): string | undefined {
    return this.disposed ? undefined : this.popupEntries.find((entry) => entry.state === "failed")?.error?.message;
  }

  requestEpisodes(indexes: readonly number[], retry = false): Promise<void> {
    if (this.disposed) return Promise.reject(disposedError());
    if (indexes.some((index) => !Number.isInteger(index) || !this.episodes[index])) {
      return Promise.reject(new Error("Invalid journey episode index"));
    }
    return this.request(indexes.map((index) => this.episodes[index]), retry);
  }

  requestPresentation(retry = false): Promise<void> {
    return this.request(this.popupEntries, retry);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.queue.length = 0;
    for (const entry of this.entries.values()) {
      entry.reject?.(disposedError());
      entry.resolve = undefined;
      entry.reject = undefined;
      if (entry.image) this.release(entry.image);
      entry.image = undefined;
    }
  }

  private episodeIndexes(matches: (entry: ArtEntry) => boolean): number[] {
    return this.disposed ? [] : this.episodes.flatMap((entry, index) => matches(entry) ? [index] : []);
  }

  private request(entries: readonly ArtEntry[], retry: boolean): Promise<void> {
    if (this.disposed) return Promise.reject(disposedError());
    const promises = [...new Set(entries)].map((entry) => {
      if (entry.state === "loaded") return Promise.resolve();
      if (entry.state === "queued" || entry.state === "loading") return entry.promise!;
      if (entry.state === "failed" && !retry) return Promise.reject(entry.error!);
      entry.state = "queued";
      entry.error = undefined;
      entry.promise = new Promise<void>((resolve, reject) => {
        entry.resolve = resolve;
        entry.reject = reject;
      });
      this.queue.push(entry);
      return entry.promise;
    });
    const result = Promise.all(promises).then(() => undefined);
    this.drain();
    return result;
  }

  private drain(): void {
    while (!this.disposed && this.activeLoads < MAX_CONCURRENT_IMAGES && this.queue.length > 0) {
      const entry = this.queue.shift()!;
      entry.state = "loading";
      this.activeLoads += 1;
      void this.load(entry);
    }
  }

  private async load(entry: ArtEntry): Promise<void> {
    try {
      const image = await this.options.loadImage(entry.path);
      if (this.disposed) {
        this.release(image);
        return;
      }
      entry.image = image;
      entry.state = "loaded";
      entry.resolve?.();
    } catch (error) {
      if (this.disposed) return;
      entry.error = error instanceof Error ? error : new Error(String(error));
      entry.state = "failed";
      entry.reject?.(entry.error);
    } finally {
      entry.resolve = undefined;
      entry.reject = undefined;
      this.activeLoads -= 1;
      this.drain();
    }
    if (!this.disposed) this.options.onChange();
  }

  private release(image: HTMLImageElement): void {
    if (this.releasedImages.has(image)) return;
    this.releasedImages.add(image);
    this.options.releaseImage(image);
  }
}
