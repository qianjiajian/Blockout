import type { GameHost, PointerHandlers, SoundKind, StorageReadResult, Viewport } from "./Host";

export class WebHost implements GameHost {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  private audio?: AudioContext;
  private hiddenCallbacks: Array<() => void> = [];
  private shownCallbacks: Array<() => void> = [];
  private resizeCallbacks: Array<() => void> = [];

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-label", "方块出逃游戏画布");
    this.context = this.canvas.getContext("2d", { alpha: false })!;
    document.body.append(this.canvas);
    this.resize();
    window.addEventListener("resize", () => {
      this.resize();
      this.resizeCallbacks.forEach((callback) => callback());
    }, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        try { void this.audio?.suspend(); } catch { /* optional */ }
      }
      const callbacks = document.hidden ? this.hiddenCallbacks : this.shownCallbacks;
      callbacks.forEach((callback) => callback());
    });
  }

  private resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
    this.canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
  }

  viewport(): Viewport {
    const bounds = this.canvas.getBoundingClientRect();
    const params = new URLSearchParams(window.location.search);
    const rootStyle = getComputedStyle(document.documentElement);
    const cssInset = (name: string): number => {
      const value = Number.parseFloat(rootStyle.getPropertyValue(name));
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    };
    const requestedInset = (queryName: string, cssName: string): number => (
      params.has(queryName)
        ? Math.max(0, Number(params.get(queryName)) || 0)
        : cssInset(cssName)
    );
    return {
      width: bounds.width,
      height: bounds.height,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      safeTop: requestedInset("safeTop", "--color-escape-safe-top"),
      safeBottom: requestedInset("safeBottom", "--color-escape-safe-bottom"),
    };
  }

  prefersReducedMotion(): boolean {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }

  onPointer(handlers: PointerHandlers): void {
    const activePointers = new Set<number>();
    const sample = (event: PointerEvent) => {
      const bounds = this.canvas.getBoundingClientRect();
      return { id: event.pointerId, x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };
    this.canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      activePointers.add(event.pointerId);
      this.canvas.setPointerCapture(event.pointerId);
      handlers.down(sample(event));
    });
    this.canvas.addEventListener("pointermove", (event) => {
      if (!activePointers.has(event.pointerId)) return;
      event.preventDefault();
      const coalesced = event.getCoalescedEvents?.() ?? [];
      let lastX = Number.NaN;
      let lastY = Number.NaN;
      for (const candidate of coalesced) {
        if (candidate.pointerId !== event.pointerId) continue;
        handlers.move(sample(candidate));
        lastX = candidate.clientX;
        lastY = candidate.clientY;
      }
      if (event.clientX !== lastX || event.clientY !== lastY) handlers.move(sample(event));
    });
    this.canvas.addEventListener("pointerup", (event) => {
      if (!activePointers.delete(event.pointerId)) return;
      event.preventDefault();
      handlers.up(sample(event));
      try { this.canvas.releasePointerCapture(event.pointerId); } catch { /* capture may already be gone */ }
    });
    this.canvas.addEventListener("pointercancel", (event) => {
      if (!activePointers.delete(event.pointerId)) return;
      event.preventDefault();
      handlers.cancel(sample(event));
    });
    this.canvas.addEventListener("lostpointercapture", (event) => {
      if (!activePointers.delete(event.pointerId)) return;
      handlers.cancel(sample(event));
    });
  }

  onHide(callback: () => void): void { this.hiddenCallbacks.push(callback); }
  onShow(callback: () => void): void { this.shownCallbacks.push(callback); }
  isVisible(): boolean { return !document.hidden; }
  onResize(callback: () => void): void { this.resizeCallbacks.push(callback); }
  requestFrame(callback: FrameRequestCallback): number { return requestAnimationFrame(callback); }
  scheduleTimeout(callback: () => void, delayMs: number): number { return window.setTimeout(callback, delayMs); }
  cancelTimeout(handle: number): void { window.clearTimeout(handle); }

  createImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load image: ${src}`));
      image.src = src;
    });
  }

  storageRead<T>(key: string): StorageReadResult<T> {
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return { status: "unavailable" };
    }
    if (raw === null) return { status: "missing" };
    try {
      return { status: "ok", value: JSON.parse(raw) as T };
    } catch {
      return { status: "corrupt" };
    }
  }

  storageGet<T>(key: string, fallback: T): T {
    const result = this.storageRead<T>(key);
    return result.status === "ok" ? result.value : fallback;
  }

  storageSet<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  sound(kind: SoundKind): void {
    try {
      this.audio ??= new AudioContext();
      if (this.audio.state === "suspended") void this.audio.resume();
      const now = this.audio.currentTime;
      const oscillator = this.audio.createOscillator();
      const gain = this.audio.createGain();
      const frequencies: Record<SoundKind, number> = {
        select: 420, move: 520, blocked: 140, exit: 720, ice: 880, win: 1040, button: 600, fail: 110,
      };
      oscillator.type = kind === "blocked" || kind === "fail" ? "sawtooth" : "sine";
      oscillator.frequency.setValueAtTime(frequencies[kind], now);
      if (kind === "exit" || kind === "win") oscillator.frequency.exponentialRampToValueAtTime(frequencies[kind] * 1.8, now + 0.16);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(kind === "win" ? 0.13 : 0.07, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "win" ? 0.35 : 0.12));
      oscillator.connect(gain).connect(this.audio.destination);
      oscillator.start(now);
      oscillator.stop(now + (kind === "win" ? 0.36 : 0.14));
    } catch { /* sound is a progressive enhancement */ }
  }

  vibrate(kind: "light" | "medium"): void {
    try { navigator.vibrate?.(kind === "medium" ? 28 : 10); } catch { /* optional */ }
  }
}
