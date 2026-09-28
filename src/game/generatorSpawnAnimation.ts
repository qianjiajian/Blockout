export type GeneratorSpawnDirection = "left" | "right" | "top" | "bottom";

export type GeneratorSpawnPhase =
  | "scheduled"
  | "delay"
  | "preview-blank"
  | "emerging"
  | "settled"
  | "complete";

export type GeneratorSpawnHeadPolicy = "outgoing" | "next";
export type GeneratorSpawnRemainingPolicy = "before" | "after";
export type GeneratorSpawnPreviewPolicy = "outgoing" | "blank" | "next";

export interface GeneratorSpawnDisplayPolicy {
  head: GeneratorSpawnHeadPolicy;
  remaining: GeneratorSpawnRemainingPolicy;
  preview: GeneratorSpawnPreviewPolicy;
}

export interface GeneratorSpawnTranslation {
  x: number;
  y: number;
}

export interface GeneratorSpawnAnimationOptions {
  elapsedSeconds: number;
  direction: GeneratorSpawnDirection;
  /** Distance from the generator mouth to the block's settled position. */
  travelDistance?: number;
  /**
   * Exact board-cell translation at first reveal. This is used for local or
   * inset rim anchors where a global board-edge distance cannot describe the
   * generator mouth. When present it takes precedence over direction/distance.
   */
  startTranslation?: GeneratorSpawnTranslation;
  reducedMotion?: boolean;
  /** Delays this item on a shared batch clock. */
  timeOffsetSeconds?: number;
}

export interface GeneratorSpawnAnimationState {
  phase: GeneratorSpawnPhase;
  localElapsedSeconds: number;
  durationSeconds: number;
  timelineProgress: number;
  /** Normalized travel progress: 0 at first reveal and 1 at full placement. */
  progress: number;
  translation: GeneratorSpawnTranslation;
  spawnProxyVisible: boolean;
  hideNormalBlock: boolean;
  interactionLocked: boolean;
  complete: boolean;
  display: GeneratorSpawnDisplayPolicy;
}

export interface GeneratorSpawnDisplayValues<T> {
  outgoingHead: T | null;
  nextHead: T | null;
  remainingBefore: number;
  remainingAfter: number;
}

export interface ResolvedGeneratorSpawnDisplay<T> {
  head: T | null;
  remaining: number;
  preview: T | null;
}

const FRAMES_PER_SECOND = 30;

export const GENERATOR_SPAWN_TIMING = Object.freeze({
  countChangeSeconds: 3 / FRAMES_PER_SECOND,
  appearanceSeconds: 7 / FRAMES_PER_SECOND,
  placementSeconds: 11 / FRAMES_PER_SECOND,
  endSeconds: 18 / FRAMES_PER_SECOND,
});

export const GENERATOR_SPAWN_REDUCED_MOTION_SCALE = 0.5;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const finiteOr = (value: number | undefined, fallback: number): number => (
  typeof value === "number" && Number.isFinite(value) ? value : fallback
);

const nonNegativeFiniteOr = (value: number | undefined, fallback: number): number => (
  Math.max(0, finiteOr(value, fallback))
);

export const generatorSpawnBatchOffset = (
  sequenceIndex: number,
  stepSeconds = GENERATOR_SPAWN_TIMING.endSeconds,
): number => {
  const safeIndex = Math.max(0, Math.floor(finiteOr(sequenceIndex, 0)));
  const safeStep = nonNegativeFiniteOr(stepSeconds, GENERATOR_SPAWN_TIMING.endSeconds);
  return safeIndex * safeStep;
};

export const generatorSpawnTranslation = (
  direction: GeneratorSpawnDirection,
  progress: number,
  travelDistance = 1,
): GeneratorSpawnTranslation => {
  const remainingDistance = (1 - clamp01(finiteOr(progress, 0)))
    * nonNegativeFiniteOr(travelDistance, 1);

  if (remainingDistance === 0) return { x: 0, y: 0 };

  switch (direction) {
    case "left":
      return { x: -remainingDistance, y: 0 };
    case "right":
      return { x: remainingDistance, y: 0 };
    case "top":
      return { x: 0, y: -remainingDistance };
    case "bottom":
      return { x: 0, y: remainingDistance };
  }
};

export const generatorSpawnVectorTranslation = (
  startTranslation: Readonly<GeneratorSpawnTranslation>,
  progress: number,
): GeneratorSpawnTranslation => {
  const remaining = 1 - clamp01(finiteOr(progress, 0));
  if (remaining === 0) return { x: 0, y: 0 };
  return {
    x: finiteOr(startTranslation.x, 0) * remaining,
    y: finiteOr(startTranslation.y, 0) * remaining,
  };
};

const outgoingDisplay: GeneratorSpawnDisplayPolicy = Object.freeze({
  head: "outgoing",
  remaining: "before",
  preview: "outgoing",
});

const blankDisplay: GeneratorSpawnDisplayPolicy = Object.freeze({
  head: "next",
  remaining: "after",
  preview: "blank",
});

const nextDisplay: GeneratorSpawnDisplayPolicy = Object.freeze({
  head: "next",
  remaining: "after",
  preview: "next",
});

export const resolveGeneratorSpawnDisplay = <T>(
  policy: GeneratorSpawnDisplayPolicy,
  values: GeneratorSpawnDisplayValues<T>,
): ResolvedGeneratorSpawnDisplay<T> => ({
  head: policy.head === "outgoing" ? values.outgoingHead : values.nextHead,
  remaining: policy.remaining === "before" ? values.remainingBefore : values.remainingAfter,
  preview: policy.preview === "blank"
    ? null
    : policy.preview === "outgoing"
      ? values.outgoingHead
      : values.nextHead,
});

export const generatorSpawnAnimation = (
  options: GeneratorSpawnAnimationOptions,
): GeneratorSpawnAnimationState => {
  const motionScale = options.reducedMotion ? GENERATOR_SPAWN_REDUCED_MOTION_SCALE : 1;
  const countChange = GENERATOR_SPAWN_TIMING.countChangeSeconds * motionScale;
  const appearance = GENERATOR_SPAWN_TIMING.appearanceSeconds * motionScale;
  const placement = GENERATOR_SPAWN_TIMING.placementSeconds * motionScale;
  const end = GENERATOR_SPAWN_TIMING.endSeconds * motionScale;
  const elapsed = finiteOr(options.elapsedSeconds, 0);
  const offset = nonNegativeFiniteOr(options.timeOffsetSeconds, 0);
  const localElapsedSeconds = elapsed - offset;

  let phase: GeneratorSpawnPhase;
  if (localElapsedSeconds < 0) phase = "scheduled";
  else if (localElapsedSeconds < countChange) phase = "delay";
  else if (localElapsedSeconds < appearance) phase = "preview-blank";
  else if (localElapsedSeconds < placement) phase = "emerging";
  else if (localElapsedSeconds < end) phase = "settled";
  else phase = "complete";

  const progress = localElapsedSeconds < appearance
    ? 0
    : clamp01((localElapsedSeconds - appearance) / (placement - appearance));
  const complete = phase === "complete";
  const display = phase === "scheduled" || phase === "delay"
    ? outgoingDisplay
    : complete
      ? nextDisplay
      : blankDisplay;

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
    hideNormalBlock: phase === "scheduled"
      || phase === "delay"
      || phase === "preview-blank"
      || phase === "emerging",
    // A scheduled item is already part of the active serialized batch. Keep
    // input locked until the whole item completes so queued cargo cannot be
    // interleaved with a second board action between batch entries.
    interactionLocked: !complete,
    complete,
    display,
  };
};
