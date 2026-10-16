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
  | "reward" | "gold" | "itemArrival" | "booster" | "unlock" | "time" | "rocket" | "pulse" | "mechanic" | "shell" | "shutter" | "timeover";

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

export type RewardedAdStatus = "completed" | "cancelled" | "unavailable" | "error";
export interface RewardedAdResult {
  status: RewardedAdStatus;
  requestId: string;
}

export interface GameHost {
  /** Optional IP-region service. Undefined means use the saved random fallback. */
  resolveLeaderboardProvince?(): Promise<import("./leaderboardRegion").LeaderboardProvinceResult | undefined>;
  /** Configuration/API readiness only; does not promise ad inventory. */
  isRewardedAdAvailable?(): boolean;
  /** Only a native full-view close callback may report completed. */
  showRewardedAd?(requestId: string): Promise<RewardedAdResult>;
  openTextInput?(options: { value: string; maxLength: number; rect: { x: number; y: number; width: number; height: number }; onChange(value: string): void }): () => void;
  copyText?(value: string): Promise<boolean>;
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
  /** Detached 2D canvas for small cached UI image effects. */
  createOffscreenCanvas?(): HTMLCanvasElement;
  /** Download native image packages ahead of decoding; does not allocate images. */
  prepareImages?(paths: readonly string[]): Promise<void>;
  releaseImage?(image: HTMLImageElement): void;
  storageRead<T>(key: string): StorageReadResult<T>;
  storageGet<T>(key: string, fallback: T): T;
  storageSet<T>(key: string, value: T): boolean;
  /** Preload the actual entry scene's recordings while startup artwork loads.
   * This prepares buffers without emitting a synthetic effect or user gesture. */
  prepareAudio?(scene: MusicScene, options: { music: boolean; sound: boolean }): Promise<void>;
  /**
   * Select the active soundtrack.  When a playlist is supplied, tracks are
   * played in order and wrapped at the end; an omitted playlist preserves the
   * single-track behaviour used by older callers.
   */
  music(scene: MusicScene, enabled: boolean, selectedTrack?: MusicTrack, playlist?: readonly MusicTrack[]): void;
  musicTransport(): MusicTransport;
  setMusicPaused(paused: boolean): void;
  seekMusic(positionSeconds: number): void;
  sound(kind: SoundKind): void;
  stopSound?(kind: SoundKind): void;
  vibrate(kind: "light" | "medium"): void;
}
