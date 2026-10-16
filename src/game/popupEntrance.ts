import type { HitTargetRect as Rect } from "./hitTargets";

export const POPUP_ENTRANCE_PEAK_TIME = 0.18;
export const POPUP_ENTRANCE_DURATION = 0.32;
export const POPUP_EXIT_PEAK_TIME = 0.14;
export const POPUP_EXIT_DURATION = 0.32;

export function samplePopupEntrance(age: number): { scale: number; alpha: number } {
  const rise = Math.max(0, Math.min(1, age / POPUP_ENTRANCE_PEAK_TIME));
  const fade = 1 - (1 - rise) ** 3;
  if (age <= POPUP_ENTRANCE_PEAK_TIME) return { scale: 0.8 + 0.3 * fade, alpha: fade };
  const settle = Math.min(1, (age - POPUP_ENTRANCE_PEAK_TIME) / (POPUP_ENTRANCE_DURATION - POPUP_ENTRANCE_PEAK_TIME));
  const eased = settle * settle * (3 - 2 * settle);
  return { scale: 1.1 - 0.1 * eased, alpha: 1 };
}

export function samplePopupExit(age: number): { scale: number; alpha: number } {
  const rise = Math.max(0, Math.min(1, age / POPUP_EXIT_PEAK_TIME));
  if (age <= POPUP_EXIT_PEAK_TIME) return { scale: 1 + 0.1 * (1 - (1 - rise) ** 3), alpha: 1 };
  const shrink = Math.min(1, (age - POPUP_EXIT_PEAK_TIME) / (POPUP_EXIT_DURATION - POPUP_EXIT_PEAK_TIME));
  const eased = shrink * shrink * (3 - 2 * shrink);
  return { scale: 1.1 - 0.3 * eased, alpha: 1 - eased };
}

export function popupBounds(...rects: Rect[]): Rect {
  const x = Math.min(...rects.map(rect => rect.x)), y = Math.min(...rects.map(rect => rect.y));
  return { x, y, width: Math.max(...rects.map(rect => rect.x + rect.width)) - x,
    height: Math.max(...rects.map(rect => rect.y + rect.height)) - y };
}

type Entry = { age: number; bounds: Rect; identity?: unknown };
type Exit = { entries: Map<string, Entry>; age: number; complete: () => void };

/** Visible-frame lifecycle, independent of save transactions and popup content. */
export class PopupEntranceController {
  private entries = new Map<string, Entry>();
  private seen = new Set<string>();
  private exit?: Exit;

  beginFrame(): void { this.seen.clear(); }

  endFrame(): void {
    for (const key of this.entries.keys()) if (!this.seen.has(key)) this.entries.delete(key);
  }

  startExit(keys: readonly string[], complete: () => void, reducedMotion: boolean): boolean {
    if (this.exit) return true;
    const entries = new Map<string, Entry>();
    for (const key of keys) {
      const entry = this.entries.get(key);
      if (entry) {
        entry.age = POPUP_ENTRANCE_DURATION;
        entries.set(key, entry);
      }
    }
    if (!entries.size) return false;
    this.exit = { entries, age: reducedMotion ? POPUP_EXIT_DURATION : 0, complete };
    if (reducedMotion) this.flushExits();
    return true;
  }

  /** Flush only after the transparent terminal frame has been painted. */
  flushExits(): boolean {
    const exit = this.exit;
    if (!exit || exit.age < POPUP_EXIT_DURATION) return false;
    this.exit = undefined;
    for (const [key, entry] of exit.entries) {
      if (this.entries.get(key) === entry) this.entries.delete(key);
    }
    exit.complete();
    return true;
  }

  update(delta: number, visible: boolean, reducedMotion: boolean): boolean {
    if (!visible) return false;
    let changed = false;
    if (this.exit) {
      const age = reducedMotion ? POPUP_EXIT_DURATION
        : Math.min(POPUP_EXIT_DURATION, this.exit.age + Math.max(0, delta));
      changed = age !== this.exit.age;
      this.exit.age = age;
    }
    for (const entry of this.entries.values()) {
      const age = reducedMotion ? POPUP_ENTRANCE_DURATION
        : Math.min(POPUP_ENTRANCE_DURATION, entry.age + Math.max(0, delta));
      changed ||= age !== entry.age;
      entry.age = age;
    }
    return changed;
  }

  get active(): boolean {
    return Boolean(this.exit) || [...this.entries.values()].some(entry => entry.age < POPUP_ENTRANCE_DURATION);
  }

  snapshot() {
    return [...this.entries].map(([key, entry]) => {
      const exit = this.exit?.entries.get(key) === entry ? this.exit : undefined;
      const age = exit ? exit.age : entry.age;
      const phase = exit ? "exit" : entry.age < POPUP_ENTRANCE_DURATION ? "enter" : "idle";
      return { key, phase, age, ...(exit ? samplePopupExit(age) : samplePopupEntrance(age)), bounds: { ...entry.bounds } };
    });
  }

  draw(ctx: CanvasRenderingContext2D, key: string, bounds: Rect, draw: () => void, reducedMotion: boolean, identity?: unknown): void {
    this.seen.add(key);
    let entry = this.entries.get(key);
    if (!entry || entry.identity !== identity) {
      entry = { age: 0, bounds, identity };
      this.entries.set(key, entry);
    }
    entry.bounds = bounds;
    if (reducedMotion) entry.age = POPUP_ENTRANCE_DURATION;
    const exit = this.exit?.entries.get(key) === entry ? this.exit : undefined;
    if (exit && reducedMotion) exit.age = POPUP_EXIT_DURATION;
    const { scale, alpha } = exit ? samplePopupExit(exit.age) : samplePopupEntrance(entry.age);
    const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
    ctx.save();
    try {
      ctx.globalAlpha *= alpha;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.translate(-x, -y);
      draw();
    } finally { ctx.restore(); }
  }
}
