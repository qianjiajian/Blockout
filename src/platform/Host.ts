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

export type SoundKind = "select" | "move" | "blocked" | "exit" | "ice" | "win" | "button" | "fail";

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
  onPointer(handlers: PointerHandlers): void;
  onHide(callback: () => void): void;
  onShow(callback: () => void): void;
  isVisible?(): boolean;
  onResize(callback: () => void): void;
  requestFrame(callback: FrameRequestCallback): number;
  scheduleTimeout(callback: () => void, delayMs: number): number;
  cancelTimeout(handle: number): void;
  createImage(src: string): Promise<HTMLImageElement>;
  storageRead<T>(key: string): StorageReadResult<T>;
  storageGet<T>(key: string, fallback: T): T;
  storageSet<T>(key: string, value: T): boolean;
  sound(kind: SoundKind): void;
  vibrate(kind: "light" | "medium"): void;
}
