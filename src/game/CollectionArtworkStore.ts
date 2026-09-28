interface CollectionArtworkStoreOptions {
  paths: readonly string[];
  loadImage: (path: string) => Promise<HTMLImageElement>;
  releaseImage: (image: HTMLImageElement) => void;
  onChange: () => void;
}

interface ArtworkEntry {
  path: string;
  state: "idle" | "queued" | "loading" | "loaded" | "failed";
  image?: HTMLImageElement;
  error?: Error;
  promise?: Promise<void>;
  resolve?: () => void;
  reject?: (error: Error) => void;
}

const MAX_CONCURRENT_IMAGES = 2;
const disposedError = (): Error => new Error("Collection artwork has been disposed");

/** Keeps requested atlases for one collection visit; the owner disposes them on exit. */
export class CollectionArtworkStore {
  private readonly entries: ArtworkEntry[];
  private readonly uniqueEntries: readonly ArtworkEntry[];
  private readonly queue: ArtworkEntry[] = [];
  private readonly releasedImages = new Set<HTMLImageElement>();
  private activeLoads = 0;
  private disposed = false;

  constructor(private readonly options: CollectionArtworkStoreOptions) {
    const byPath = new Map<string, ArtworkEntry>();
    this.entries = options.paths.map((path) => {
      let entry = byPath.get(path);
      if (!entry) {
        entry = { path, state: "idle" };
        byPath.set(path, entry);
      }
      return entry;
    });
    this.uniqueEntries = [...byPath.values()];
  }

  image(index: number): HTMLImageElement | undefined {
    return this.disposed ? undefined : this.entries[index]?.image;
  }

  get images(): readonly HTMLImageElement[] {
    if (this.disposed) return [];
    return [...new Set(this.uniqueEntries.flatMap((entry) => entry.image ? [entry.image] : []))];
  }

  get loadedIndexes(): readonly number[] {
    return this.indexes((entry) => entry.state === "loaded");
  }

  get pendingIndexes(): readonly number[] {
    return this.indexes((entry) => entry.state === "queued" || entry.state === "loading");
  }

  get failedIndexes(): readonly number[] {
    return this.indexes((entry) => entry.state === "failed");
  }

  request(indexes: readonly number[], retry = false, priority = true): Promise<void> {
    if (this.disposed) return Promise.reject(disposedError());
    if (indexes.some((index) => !Number.isInteger(index) || !this.entries[index])) {
      return Promise.reject(new Error("Invalid collection artwork index"));
    }
    const requested = new Set(indexes.map((index) => this.entries[index]));
    const promises = [...requested].map((entry) => {
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
    if (priority) {
      const promoted = [...requested].filter((entry) => entry.state === "queued");
      const remaining = this.queue.filter((entry) => !requested.has(entry));
      this.queue.splice(0, this.queue.length, ...promoted, ...remaining);
    }
    const result = Promise.all(promises).then(() => undefined);
    this.drain();
    return result;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.queue.length = 0;
    for (const entry of this.uniqueEntries) {
      entry.reject?.(disposedError());
      entry.resolve = undefined;
      entry.reject = undefined;
      if (entry.image) this.release(entry.image);
      entry.image = undefined;
    }
  }

  private indexes(matches: (entry: ArtworkEntry) => boolean): number[] {
    return this.disposed ? [] : this.entries.flatMap((entry, index) => matches(entry) ? [index] : []);
  }

  private drain(): void {
    while (!this.disposed && this.activeLoads < MAX_CONCURRENT_IMAGES && this.queue.length > 0) {
      const entry = this.queue.shift()!;
      entry.state = "loading";
      this.activeLoads += 1;
      void this.load(entry);
    }
  }

  private async load(entry: ArtworkEntry): Promise<void> {
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
