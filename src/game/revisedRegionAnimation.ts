import {
  generatorSpawnTranslation,
  generatorSpawnVectorTranslation,
  type GeneratorSpawnAnimationOptions,
  type GeneratorSpawnAnimationState,
} from "./generatorSpawnAnimation";

/**
 * Presentation-only samples fitted to the supplied shutter/lift mechanism clips.
 * Elapsed time starts at the model's reveal event (or final cargo count change).
 * These values never decide occupancy, counters, reveal timing or input locks.
 * Frame registration is approximate: source recordings are 30 fps/compressed.
 */
export type RevisedRegionKind = "shutter" | "lift";

export interface RevisedRegionAnimationSample {
  kind: RevisedRegionKind;
  durationSeconds: number;
  complete: boolean;
  openProgress: number;
  coverFraction: number;
  counterScale: number;
  frameAlpha: number;
  revealScale: number;
  frameFragmentProgress: number;
}

export interface RevisedRegionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const FPS = 30;
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const finite = (value: number, fallback = 0): number => Number.isFinite(value) ? value : fallback;
const time = (seconds: number, reduced: boolean): number => Math.max(0, finite(seconds)) / (reduced ? 0.5 : 1);
const range = (value: number, start: number, end: number): number => clamp01((value - start) / (end - start));

// Native-frame bottom-edge measurements, normalized by the visible panel span.
// Interpolation intentionally does not claim the competitor's original easing.
const SHUTTER_OPEN_SAMPLES = [0, 0.0036, 0.0107, 0.025, 0.0464, 0.0679, 0.0964,
  0.1321, 0.1821, 0.2536, 0.3536, 0.5179, 0.775, 1];
const LIFT_OPEN_SAMPLES = [0, 0.005, 0.03, 0.058, 0.098, 0.16, 0.23,
  0.31, 0.415, 0.52, 0.665, 0.8, 0.93, 1];

const sampleFrames = (frames: readonly number[], frame: number): number => {
  const at = Math.max(0, Math.min(frames.length - 1, frame));
  const lower = Math.floor(at);
  const upper = Math.min(frames.length - 1, lower + 1);
  return frames[lower] + (frames[upper] - frames[lower]) * (at - lower);
};

export const REVISED_REGION_TIMING = Object.freeze({
  shutterCounterShrinkStart: 5 / FPS,
  shutterCounterGone: 8 / FPS,
  shutterOpeningStart: 7 / FPS,
  shutterOpen: 20 / FPS,
  shutterEnd: 35 / FPS,
  liftOpen: 13 / FPS,
  liftEnd: 16 / FPS,
  generatorBreakStart: 22 / FPS,
  generatorBreakEnd: 38 / FPS,
});

export const sampleRevisedRegionAnimation = (
  kind: RevisedRegionKind,
  elapsedSeconds: number,
  reducedMotion = false,
): RevisedRegionAnimationSample => {
  const elapsed = time(elapsedSeconds, reducedMotion);
  const shutter = kind === "shutter";
  const end = shutter ? REVISED_REGION_TIMING.shutterEnd : REVISED_REGION_TIMING.liftEnd;
  const open = shutter ? REVISED_REGION_TIMING.shutterOpen : REVISED_REGION_TIMING.liftOpen;
  const openProgress = shutter
    ? sampleFrames(SHUTTER_OPEN_SAMPLES, elapsed * FPS - 7)
    : sampleFrames(LIFT_OPEN_SAMPLES, elapsed * FPS);
  const frameFragmentProgress = shutter ? range(elapsed, open, end) : 0;
  return {
    kind,
    durationSeconds: end * (reducedMotion ? 0.5 : 1),
    complete: elapsed >= end,
    openProgress,
    coverFraction: 1 - openProgress,
    counterScale: shutter
      ? 1 - range(elapsed, REVISED_REGION_TIMING.shutterCounterShrinkStart, REVISED_REGION_TIMING.shutterCounterGone)
      : 0,
    // A shattered frame is replaced by fragments, not slowly faded as a whole.
    frameAlpha: shutter ? Number(elapsed < open) : 1 - range(elapsed, open, end),
    // The lift clip reveals a smaller/deeper cohort before it reaches full size.
    // It is a shared Canvas transform, never fractional model block coordinates.
    revealScale: shutter ? 1 : 0.5 + 0.5 * openProgress,
    frameFragmentProgress,
  };
};

export const revisedRegionOpeningGeometry = (
  rect: Readonly<RevisedRegionRect>,
  sample: Pick<RevisedRegionAnimationSample, "kind" | "openProgress" | "revealScale">,
) => {
  const clip: RevisedRegionRect = {
    x: finite(rect.x), y: finite(rect.y),
    width: Math.max(0, finite(rect.width)), height: Math.max(0, finite(rect.height)),
  };
  const progress = clamp01(finite(sample.openProgress));
  const half = clip.width / 2;
  return {
    clip,
    leftPanel: { x: clip.x - half * progress, y: clip.y, width: half, height: clip.height },
    rightPanel: { x: clip.x + half + half * progress, y: clip.y, width: half, height: clip.height },
    shutterOffsetY: -clip.height * progress,
    shutterVisibleHeight: clip.height * (1 - progress),
    // Registration fit from the partially visible layer; not an exact 3D camera.
    revealOrigin: { x: clip.x + half, y: clip.y + clip.height * 0.83 },
    revealScale: clamp01(finite(sample.revealScale, 1)),
  };
};

/** Final-stock presentation only. Never return or enforce an input lock. */
export const sampleRevisedGeneratorExhaustion = (
  elapsedSinceCountZero: number,
  reducedMotion = false,
) => {
  const elapsed = time(elapsedSinceCountZero, reducedMotion);
  const start = REVISED_REGION_TIMING.generatorBreakStart;
  const end = REVISED_REGION_TIMING.generatorBreakEnd;
  const fragmentProgress = range(elapsed, start, end);
  return {
    durationSeconds: end * (reducedMotion ? 0.5 : 1),
    complete: elapsed >= end,
    bodyAlpha: Number(elapsed < start),
    counterVisible: elapsed < start,
    fragmentProgress,
    fragmentAlpha: elapsed >= start && elapsed < end ? 1 - fragmentProgress : 0,
    flashAlpha: elapsed < start ? 0 : Math.sin(Math.PI * range(elapsed, start, start + 4 / FPS)),
  };
};

export interface RevisedGeneratorSpawnOptions extends GeneratorSpawnAnimationOptions {
  /** Full shape span normal to the machine mouth, not its tangential width. */
  normalSpan: number;
}

/**
 * Observed top-mouth samples: one/two/three cells take 6/8/11 source frames.
 * Other spans interpolate/extrapolate; this is not the competitor's formula.
 */
export const revisedGeneratorPlacementSeconds = (normalSpan: number): number => {
  const span = Math.max(1, finite(normalSpan, 1));
  return (span <= 2 ? 6 + (span - 1) * 2 : 8 + (span - 2) * 3) / FPS;
};

/** Drop-in visual sampler; only the caller decides whether a profile opts in. */
export const sampleRevisedGeneratorSpawn = (
  options: RevisedGeneratorSpawnOptions,
): GeneratorSpawnAnimationState => {
  const scale = options.reducedMotion ? 0.5 : 1;
  const placement = revisedGeneratorPlacementSeconds(options.normalSpan) * scale;
  const end = Math.max(15 / FPS * scale, placement);
  const localElapsedSeconds = finite(options.elapsedSeconds)
    - Math.max(0, finite(options.timeOffsetSeconds ?? 0));
  const rawProgress = clamp01(localElapsedSeconds / placement);
  const progress = (1 - Math.cos(Math.PI * rawProgress)) / 2;
  const phase = localElapsedSeconds < 0 ? "scheduled"
    : localElapsedSeconds < placement ? "emerging"
      : localElapsedSeconds < end ? "settled" : "complete";
  const complete = phase === "complete";
  return {
    phase,
    localElapsedSeconds,
    durationSeconds: end,
    timelineProgress: clamp01(localElapsedSeconds / end),
    progress,
    translation: options.startTranslation
      ? generatorSpawnVectorTranslation(options.startTranslation, progress)
      : generatorSpawnTranslation(options.direction, progress, options.travelDistance),
    spawnProxyVisible: phase === "emerging",
    hideNormalBlock: phase === "scheduled" || phase === "emerging",
    // Compatibility field for new-grab/initial presentation only. A currently
    // held drag MUST NOT be stopped by another item's animation (A09/A11).
    interactionLocked: !complete,
    complete,
    display: phase === "scheduled"
      ? { head: "outgoing", remaining: "before", preview: "outgoing" }
      : complete
        ? { head: "next", remaining: "after", preview: "next" }
        : { head: "next", remaining: "after", preview: "blank" },
  };
};
