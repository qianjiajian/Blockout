import type { GooglePlayLifecycleEvent } from "./lifecycle";
import type { NativeResult } from "./nativeBridge";

export const REVIEW_MIN_LEVEL = 8;
type Command = "reviewPrepare" | "reviewLaunch" | "reviewStore";

/** One automatic attempt per session. Native owns the persistent 90-day limit.
 * Preparing is non-blocking; recheck the live scene before presenting UI. */
export class GooglePlayReviews {
  pending = false;
  private attempted = false;
  private disposed = false;
  private generation = 0;
  private readonly listeners = new Set<() => void>();
  constructor(private readonly send: (command: Command) => Promise<NativeResult>, private readonly visible: () => boolean) {}
  observe(event: GooglePlayLifecycleEvent): void {
    if (this.disposed || this.attempted || this.pending || event.phase !== "success"
      || event.mode !== "campaign" || !Number.isSafeInteger(event.levelId) || event.levelId < REVIEW_MIN_LEVEL) return;
    this.pending = true;
    this.listeners.forEach(listener => listener());
  }
  onPending(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  async sync(ready: () => boolean): Promise<void> {
    if (this.disposed || !this.pending || !this.visible() || !ready()) return;
    this.pending = false; this.attempted = true;
    const generation = ++this.generation;
    try {
      const prepared = await this.send("reviewPrepare");
      if (this.disposed || generation !== this.generation || !prepared.ok || !this.visible() || !ready()) return;
      await this.send("reviewLaunch");
    } catch { /* Optional review never blocks progression or changes rewards. */ }
  }
  async openStore(): Promise<boolean> {
    if (this.disposed || !this.visible()) return false;
    this.pending = false; this.attempted = true; this.generation++;
    try { return (await this.send("reviewStore")).ok; } catch { return false; }
  }
  dispose(): void { this.disposed = true; this.pending = false; this.generation++; this.listeners.clear(); }
}
