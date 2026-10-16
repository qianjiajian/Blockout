export const IDLE_IMAGE_CACHE_BYTES = 4 * 1024 * 1024;
export const IDLE_IMAGE_MAX_BYTES = 1024 * 1024;
export const IDLE_IMAGE_TTL_MS = 10_000;

interface Entry {
  path: string;
  image: HTMLImageElement;
  state: "active" | "idle" | "released";
  bytes: number;
  expiresAt: number;
}

interface Options {
  release(image: HTMLImageElement): void;
  maxBytes?: number;
  maxImageBytes?: number;
  ttlMs?: number;
}

/** Reuses only surrendered small images. Active acquisitions never share an
 * image, so callers retain their existing independent release ownership. */
export class IdleImageCache {
  private readonly owners = new WeakMap<HTMLImageElement, Entry>();
  private readonly idle = new Map<string, Entry>();
  private bytes = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private paused = false;
  private disposed = false;
  private hits = 0;
  private loads = 0;

  constructor(private readonly options: Options) {}

  get stats() {
    return { idleImages: this.idle.size, idleBytes: this.bytes, hits: this.hits, loads: this.loads };
  }

  async acquire(path: string, load: () => Promise<HTMLImageElement>): Promise<HTMLImageElement> {
    if (this.disposed) throw new Error("Image cache disposed");
    this.expire();
    const cached = this.idle.get(path);
    if (cached) {
      this.idle.delete(path);
      this.bytes -= cached.bytes;
      cached.state = "active";
      this.hits++;
      this.scheduleExpiry();
      // Match the load path's asynchronous handoff: the host may be disposed
      // after acquisition starts but before the caller receives this image.
      await Promise.resolve();
      if (this.disposed) {
        this.destroy(cached);
        throw new Error("Image cache disposed during loading");
      }
      return cached.image;
    }
    this.loads++;
    const image = await load();
    if (this.disposed) {
      this.options.release(image);
      throw new Error("Image cache disposed during loading");
    }
    this.owners.set(image, { path, image, state: "active", bytes: 0, expiresAt: 0 });
    return image;
  }

  release(image: HTMLImageElement): void {
    const entry = this.owners.get(image);
    if (!entry) { this.options.release(image); return; }
    if (entry.state !== "active") return;
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const bytes = width * height * 4;
    if (this.disposed || this.paused || !Number.isFinite(bytes) || bytes <= 0
      || bytes > (this.options.maxImageBytes ?? IDLE_IMAGE_MAX_BYTES)
      || bytes > (this.options.maxBytes ?? IDLE_IMAGE_CACHE_BYTES)) {
      this.destroy(entry);
      return;
    }
    this.expire();
    const previous = this.idle.get(entry.path);
    if (previous) this.evict(previous);
    entry.state = "idle";
    entry.bytes = bytes;
    entry.expiresAt = Date.now() + (this.options.ttlMs ?? IDLE_IMAGE_TTL_MS);
    this.idle.set(entry.path, entry);
    this.bytes += bytes;
    while (this.bytes > (this.options.maxBytes ?? IDLE_IMAGE_CACHE_BYTES)) {
      this.evict(this.idle.values().next().value!);
    }
    this.scheduleExpiry();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) this.clear();
  }

  dispose(): void {
    this.disposed = true;
    this.clear();
  }

  private destroy(entry: Entry): void {
    entry.state = "released";
    this.options.release(entry.image);
  }

  private evict(entry: Entry): void {
    this.idle.delete(entry.path);
    this.bytes -= entry.bytes;
    this.destroy(entry);
  }

  private expire(): void {
    const now = Date.now();
    for (const entry of this.idle.values()) {
      if (entry.expiresAt <= now) this.evict(entry);
    }
  }

  private clear(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    for (const entry of this.idle.values()) this.evict(entry);
  }

  private scheduleExpiry(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    const next = this.idle.values().next().value;
    if (!next) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.expire();
      this.scheduleExpiry();
    }, Math.max(0, next.expiresAt - Date.now()));
  }
}
