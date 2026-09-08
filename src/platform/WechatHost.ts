import type { GameHost, PointerHandlers, PointerSample, SoundKind, StorageReadResult, Viewport } from "./Host";

declare const wx: any;

interface WechatTouchLike {
  identifier?: unknown;
  clientX?: unknown;
  clientY?: unknown;
  pageX?: unknown;
  pageY?: unknown;
  x?: unknown;
  y?: unknown;
}

const touchArray = (value: unknown): WechatTouchLike[] => {
  if (!value || typeof value !== "object") return [];
  try { return Array.from(value as ArrayLike<WechatTouchLike>); } catch { return []; }
};

const touchSample = (touch: WechatTouchLike | undefined): PointerSample | undefined => {
  if (!touch) return undefined;
  const x = Number(touch.clientX ?? touch.pageX ?? touch.x);
  const y = Number(touch.clientY ?? touch.pageY ?? touch.y);
  const id = Number(touch.identifier ?? 0);
  if (!Number.isFinite(id) || !Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return { id, x, y };
};

/** Keeps one primary WeChat touch stable even when changedTouches is reordered. */
export class WechatTouchRouter {
  private activeId?: number;
  private lastSample?: PointerSample;

  constructor(private readonly handlers: PointerHandlers) {}

  start(event: any): void {
    if (this.activeId !== undefined) return;
    const touch = touchArray(event?.changedTouches)[0] ?? touchArray(event?.touches)[0];
    const sample = touchSample(touch);
    if (!sample) return;
    this.activeId = sample.id;
    this.lastSample = sample;
    this.handlers.down(sample);
  }

  move(event: any): void {
    if (this.activeId === undefined) return;
    const changed = touchArray(event?.changedTouches);
    const activeTouches = touchArray(event?.touches);
    const changedOwner = changed.find((touch) => Number(touch.identifier ?? 0) === this.activeId);
    const owner = changedOwner
      ?? activeTouches.find((touch) => Number(touch.identifier ?? 0) === this.activeId);
    const sample = touchSample(owner);
    if (!sample) return;
    if (!changedOwner && this.lastSample
      && sample.x === this.lastSample.x && sample.y === this.lastSample.y) return;
    this.lastSample = sample;
    this.handlers.move(sample);
  }

  end(event: any): void { this.finish(event, "up"); }
  cancel(event: any): void { this.finish(event, "cancel"); }

  reset(): void {
    this.activeId = undefined;
    this.lastSample = undefined;
  }

  private finish(event: any, kind: "up" | "cancel"): void {
    if (this.activeId === undefined) return;
    const changed = touchArray(event?.changedTouches);
    let sample = touchSample(changed.find((touch) => Number(touch.identifier ?? 0) === this.activeId));
    if (!sample) {
      const activeStillPresent = touchArray(event?.touches)
        .some((touch) => Number(touch.identifier ?? 0) === this.activeId);
      if (!activeStillPresent) sample = this.lastSample;
    }
    if (!sample) return;
    this.handlers[kind](sample);
    this.reset();
  }
}

export class WechatHost implements GameHost {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  private system: any;
  private audio?: any;
  private touchRouter?: WechatTouchRouter;

  constructor() {
    this.system = wx.getSystemInfoSync();
    this.canvas = wx.createCanvas() as HTMLCanvasElement;
    const pixelRatio = Math.min(this.system.pixelRatio || 1, 2);
    this.canvas.width = Math.round(this.system.screenWidth * pixelRatio);
    this.canvas.height = Math.round(this.system.screenHeight * pixelRatio);
    this.context = this.canvas.getContext("2d", { alpha: false })!;
  }

  viewport(): Viewport {
    const info = this.system;
    const safe = info.safeArea ?? { top: 0, bottom: info.screenHeight };
    return {
      width: info.screenWidth,
      height: info.screenHeight,
      pixelRatio: Math.min(info.pixelRatio || 1, 2),
      safeTop: safe.top ?? 0,
      safeBottom: Math.max(0, info.screenHeight - (safe.bottom ?? info.screenHeight)),
    };
  }

  onPointer(handlers: PointerHandlers): void {
    const router = new WechatTouchRouter(handlers);
    this.touchRouter = router;
    wx.onTouchStart((event: any) => router.start(event));
    wx.onTouchMove((event: any) => router.move(event));
    wx.onTouchEnd((event: any) => router.end(event));
    wx.onTouchCancel((event: any) => router.cancel(event));
  }

  onHide(callback: () => void): void {
    wx.onHide(() => {
      try { void this.audio?.suspend?.(); } catch { /* optional */ }
      this.touchRouter?.reset();
      callback();
    });
  }
  onShow(callback: () => void): void { wx.onShow(callback); }
  isVisible(): boolean { return true; }
  onResize(callback: () => void): void {
    wx.onWindowResize?.(() => {
      this.system = wx.getSystemInfoSync();
      const pixelRatio = Math.min(this.system.pixelRatio || 1, 2);
      this.canvas.width = Math.round(this.system.screenWidth * pixelRatio);
      this.canvas.height = Math.round(this.system.screenHeight * pixelRatio);
      callback();
    });
  }
  requestFrame(callback: FrameRequestCallback): number {
    const request = (this.canvas as any).requestAnimationFrame ?? requestAnimationFrame;
    return request.call(this.canvas, callback);
  }
  scheduleTimeout(callback: () => void, delayMs: number): number { return setTimeout(callback, delayMs); }
  cancelTimeout(handle: number): void { clearTimeout(handle); }

  createImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = ((this.canvas as any).createImage?.() ?? wx.createImage()) as HTMLImageElement;
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load image: ${src}`));
      image.src = src;
    });
  }

  storageRead<T>(key: string): StorageReadResult<T> {
    try {
      const value = wx.getStorageSync(key);
      return value === "" || value == null
        ? { status: "missing" }
        : { status: "ok", value: value as T };
    } catch {
      return { status: "unavailable" };
    }
  }

  storageGet<T>(key: string, fallback: T): T {
    const result = this.storageRead<T>(key);
    return result.status === "ok" ? result.value : fallback;
  }

  storageSet<T>(key: string, value: T): boolean {
    try {
      wx.setStorageSync(key, value);
      return true;
    } catch {
      return false;
    }
  }

  sound(kind: SoundKind): void {
    try {
      this.audio ??= wx.createWebAudioContext?.();
      if (!this.audio) return;
      const context = this.audio;
      if (context.state === "suspended") void context.resume?.();
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const frequencies: Record<SoundKind, number> = {
        select: 420, move: 520, blocked: 140, exit: 720, ice: 880, win: 1040, button: 600, fail: 110,
      };
      oscillator.type = kind === "blocked" || kind === "fail" ? "sawtooth" : "sine";
      oscillator.frequency.setValueAtTime(frequencies[kind], now);
      if (kind === "exit" || kind === "win") oscillator.frequency.exponentialRampToValueAtTime(frequencies[kind] * 1.8, now + 0.16);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(kind === "win" ? 0.13 : 0.07, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "win" ? 0.35 : 0.12));
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + (kind === "win" ? 0.36 : 0.14));
    } catch { /* sound is optional on older base libraries */ }
  }

  vibrate(kind: "light" | "medium"): void {
    try { wx.vibrateShort({ type: kind === "medium" ? "heavy" : "light" }); } catch { /* optional */ }
  }
}
