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
const evictedError = (): Error => new Error("Collection artwork is outside the retained window");

/** Owns requested atlases until disposal or an explicit retained-window change. */
export class CollectionArtworkStore {
  private readonly entries: ArtworkEntry[];
  private readonly uniqueEntries: readonly ArtworkEntry[];
  private readonly queue: ArtworkEntry[] = [];
  private readonly releasedImages = new WeakSet<HTMLImageElement>();
  private retainedEntries?: ReadonlySet<ArtworkEntry>;
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

  /** The owner includes every visible atlas and any desired adjacent-page prefetch. */
  retain(indexes: readonly number[]): void {
    if (this.disposed) return;
    if (indexes.some((index) => !Number.isInteger(index) || !this.entries[index])) {
      throw new Error("Invalid collection artwork index");
    }
    this.retainedEntries = new Set(indexes.map((index) => this.entries[index]));
    for (const entry of this.uniqueEntries) {
      if (this.retainedEntries.has(entry)) continue;
      if (entry.state === "loaded") {
        if (entry.image) this.release(entry.image);
        entry.image = undefined;
        entry.promise = undefined;
        entry.state = "idle";
      } else if (entry.state === "queued") {
        entry.reject?.(evictedError());
        entry.resolve = undefined;
        entry.reject = undefined;
        entry.promise = undefined;
        entry.state = "idle";
      }
      // A running request keeps its identity: navigation back can reuse it.
      // Its completion below releases the image if it is still out of view.
      // Failed entries keep their explicit-retry contract across navigation.
    }
    for (let index = this.queue.length - 1; index >= 0; index--) {
      if (this.queue[index].state !== "queued") this.queue.splice(index, 1);
    }
  }

  request(indexes: readonly number[], retry = false, priority = true): Promise<void> {
    if (this.disposed) return Promise.reject(disposedError());
    if (indexes.some((index) => !Number.isInteger(index) || !this.entries[index])) {
      return Promise.reject(new Error("Invalid collection artwork index"));
    }
    const requested = new Set(indexes.map((index) => this.entries[index]));
    const retained = this.retainedEntries;
    if (retained && [...requested].some((entry) => !retained.has(entry))) {
      return Promise.reject(evictedError());
    }
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
      if (this.retainedEntries && !this.retainedEntries.has(entry)) {
        this.release(image);
        entry.state = "idle";
        entry.reject?.(evictedError());
        entry.promise = undefined;
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
    if (!this.disposed && (!this.retainedEntries || this.retainedEntries.has(entry))) this.options.onChange();
  }

  private release(image: HTMLImageElement): void {
    if (this.releasedImages.has(image)) return;
    this.releasedImages.add(image);
    this.options.releaseImage(image);
  }
}
