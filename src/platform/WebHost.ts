import { ProceduralSoundscape, RECORDED_MUSIC_LOOP_DURATIONS } from "../audio/ProceduralSoundscape";
import type { MusicTrack } from "../audio/ProceduralSoundscape";
import { MUSIC_CATALOG, musicTrackForScene } from "../audio/musicCatalog";
import type { GameHost, MusicScene, MusicTransport, PointerHandlers, SoundKind, StorageReadResult, Viewport } from "./Host";
import { filteredRawLocales } from "./preferredLocales";

const IMAGE_LOAD_TIMEOUT_MS = 5_000;
const MUSIC_ASSETS: Record<MusicTrack, string> = Object.fromEntries(
  MUSIC_CATALOG.map((entry) => [entry.id, entry.assetPath]),
) as Record<MusicTrack, string>;
const RECORDED_SOUND_KINDS = [
  "blocked", "exit", "ice", "thaw", "win", "button", "putdown", "fail",
  "reward", "booster", "unlock",
  "time", "rocket", "pulse", "mechanic", "shell", "shutter",
] as const satisfies readonly SoundKind[];

export class WebHost implements GameHost {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  private audio?: AudioContext;
  private soundscape?: ProceduralSoundscape;
  private musicScene: MusicScene = "menu";
  private musicEnabled = false;
  private selectedMusicTrack?: MusicTrack;
  private retainedMusicTrack: MusicTrack = "menu";
  private readonly loadedMusicAssets = new Set<MusicTrack>();
  private readonly musicAssetsLoading: Partial<Record<MusicTrack, Promise<void>>> = {};
  private effectsAssetsLoading?: Promise<void>;
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
        this.soundscape?.suspend();
      } else {
        this.soundscape?.resume();
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

  preferredLocales(): readonly string[] {
    const candidates: unknown[] = [];
    if (typeof navigator !== "object" || navigator === null) return [];
    try {
      if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
    } catch { /* an embedded browser may deny access to locale preferences */ }
    try { candidates.push(navigator.language); } catch { /* use any collected language list */ }
    return filteredRawLocales(candidates);
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
      let settled = false;
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        image.onload = null;
        image.onerror = null;
        callback();
      };
      const timeout = window.setTimeout(() => {
        finish(() => {
          try { image.src = ""; } catch { /* best-effort request cancellation */ }
          reject(new Error(`Timed out loading image after ${IMAGE_LOAD_TIMEOUT_MS}ms: ${src}`));
        });
      }, IMAGE_LOAD_TIMEOUT_MS);
      image.onload = () => finish(() => resolve(image));
      image.onerror = () => finish(() => reject(new Error(`Could not load image: ${src}`)));
      image.src = src;
    });
  }

  releaseImage(image: HTMLImageElement): void {
    image.onload = null;
    image.onerror = null;
    image.src = "";
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

  music(scene: MusicScene, enabled: boolean, selectedTrack?: MusicTrack): void {
    this.musicScene = scene;
    this.musicEnabled = enabled;
    this.selectedMusicTrack = selectedTrack;
    const track = musicTrackForScene(scene, selectedTrack);
    if (track && track !== this.retainedMusicTrack) {
      const releasedTrack = this.retainedMusicTrack;
      this.retainedMusicTrack = track;
      this.soundscape?.releaseMusicBuffer(releasedTrack);
      this.loadedMusicAssets.delete(releasedTrack);
    }
    if (enabled && track) this.beginMusicAssetLoad(track);
    this.soundscape?.setMusic(scene, enabled, selectedTrack);
  }

  musicTransport(): MusicTransport { return this.soundscape?.musicTransport() ?? { positionSeconds: 0, durationSeconds: 0, playing: false }; }
  setMusicPaused(paused: boolean): void { this.soundscape?.setMusicPaused(paused); }
  seekMusic(positionSeconds: number): void { this.soundscape?.seekMusic(positionSeconds); }

  private decodeAudioAsset(path: string): Promise<AudioBuffer> {
    if (!this.audio || typeof this.audio.decodeAudioData !== "function" || typeof fetch !== "function") {
      return Promise.reject(new Error("Recorded WebAudio is unavailable"));
    }
    const context = this.audio;
    return (async () => {
      const response = await fetch(new URL(path, document.baseURI));
      if (!response.ok) throw new Error(`Could not load audio asset: ${path}`);
      return context.decodeAudioData(await response.arrayBuffer());
    })();
  }

  private beginMusicAssetLoad(track: MusicTrack): void {
    if (!this.audio || !this.soundscape || this.loadedMusicAssets.has(track) || this.musicAssetsLoading[track]) return;
    const soundscape = this.soundscape;
    soundscape.expectMusicBuffer(track);
    const pending = this.decodeAudioAsset(MUSIC_ASSETS[track])
      .then((buffer) => {
        if (this.musicAssetsLoading[track] !== pending || this.retainedMusicTrack !== track) return;
        this.loadedMusicAssets.add(track);
        soundscape.setMusicBuffer(track, buffer, RECORDED_MUSIC_LOOP_DURATIONS[track]);
      })
      .catch(() => {
        if (this.musicAssetsLoading[track] === pending) soundscape.useSynthMusicFallback(track);
      })
      .finally(() => {
        if (this.musicAssetsLoading[track] === pending) delete this.musicAssetsLoading[track];
      });
    this.musicAssetsLoading[track] = pending;
  }

  private beginEffectsAssetLoad(): void {
    if (this.effectsAssetsLoading || !this.audio || !this.soundscape) return;
    const soundscape = this.soundscape;
    this.effectsAssetsLoading = Promise.all(RECORDED_SOUND_KINDS.map(async (kind) => {
      try { soundscape.setSoundBuffer(kind, await this.decodeAudioAsset(`assets/audio/sfx/${kind}.mp3`)); } catch { /* one fallback recipe remains available */ }
    })).then(() => undefined);
  }

  sound(kind: SoundKind): void {
    try {
      this.audio ??= new AudioContext();
      this.soundscape ??= new ProceduralSoundscape(this.audio);
      const track = musicTrackForScene(this.musicScene, this.selectedMusicTrack);
      if (this.musicEnabled && track) this.beginMusicAssetLoad(track);
      this.beginEffectsAssetLoad();
      this.soundscape.setMusic(this.musicScene, this.musicEnabled, this.selectedMusicTrack);
      this.soundscape.play(kind);
    } catch { /* sound is a progressive enhancement */ }
  }

  vibrate(kind: "light" | "medium"): void {
    try { navigator.vibrate?.(kind === "medium" ? 28 : 10); } catch { /* optional */ }
  }
}
