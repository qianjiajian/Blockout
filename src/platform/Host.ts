import type { MusicTrack } from "../audio/ProceduralSoundscape";

export interface Viewport {
  width: number;
  height: number;
  pixelRatio: number;
  safeTop: number;
  safeBottom: number;
}

export interface PointerSample {
  id: number;
  x: number;
  y: number;
}

export interface PointerHandlers {
  down(sample: PointerSample): void;
  move(sample: PointerSample): void;
  up(sample: PointerSample): void;
  cancel(sample: PointerSample): void;
}

export type SoundKind = "blocked" | "exit" | "ice" | "thaw" | "win" | "button" | "putdown" | "fail"
  | "reward" | "booster" | "unlock" | "time" | "rocket" | "pulse" | "mechanic" | "shell" | "shutter";

export type MusicScene = "menu" | "gameplay" | "danger" | "victory" | "defeat" | "silent";
export interface MusicTransport {
  track?: MusicTrack;
  positionSeconds: number;
  durationSeconds: number;
  playing: boolean;
}

export type StorageReadResult<T> =
  | { status: "ok"; value: T }
  | { status: "missing" }
  | { status: "corrupt" }
  | { status: "unavailable" };

export interface GameHost {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  viewport(): Viewport;
  prefersReducedMotion?(): boolean;
  preferredLocales?(): readonly string[];
  onPointer(handlers: PointerHandlers): void;
  onHide(callback: () => void): void;
  onShow(callback: () => void): void;
  isVisible?(): boolean;
  onResize(callback: () => void): void;
  requestFrame(callback: FrameRequestCallback): number;
  scheduleTimeout(callback: () => void, delayMs: number): number;
  cancelTimeout(handle: number): void;
  createImage(src: string): Promise<HTMLImageElement>;
  releaseImage?(image: HTMLImageElement): void;
  storageRead<T>(key: string): StorageReadResult<T>;
  storageGet<T>(key: string, fallback: T): T;
  storageSet<T>(key: string, value: T): boolean;
  music(scene: MusicScene, enabled: boolean, selectedTrack?: MusicTrack): void;
  musicTransport(): MusicTransport;
  setMusicPaused(paused: boolean): void;
  seekMusic(positionSeconds: number): void;
  sound(kind: SoundKind): void;
  vibrate(kind: "light" | "medium"): void;
}
