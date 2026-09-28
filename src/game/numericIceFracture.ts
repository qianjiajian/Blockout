export interface NumericIcePoint {
  x: number;
  y: number;
}

export interface NumericIceFractureTiming {
  duration: number;
  counterRevealAt: number;
  flashPeakAt: number;
  flashEndAt: number;
  crackEndAt: number;
}

export type NumericIceFractureIntensity = "decrement" | "shatter";

export interface NumericIceImpactGeometry {
  cellIndex: number;
  x: number;
  y: number;
  radius: number;
}

export interface NumericIceShardGeometry {
  index: number;
  cellIndex: number;
  origin: NumericIcePoint;
  vertices: readonly NumericIcePoint[];
  velocity: NumericIcePoint;
  gravity: number;
  rotation: number;
  angularVelocity: number;
  delay: number;
  lifetime: number;
  tint: 0 | 1 | 2;
  tail: boolean;
}

export interface NumericIceSpeckGeometry {
  index: number;
  cellIndex: number;
  origin: NumericIcePoint;
  velocity: NumericIcePoint;
  radius: number;
  delay: number;
  lifetime: number;
  phase: number;
  kind: "dot" | "glint";
  tail: boolean;
}

export interface NumericIceCrackGeometry {
  index: number;
  cellIndex: number;
  start: NumericIcePoint;
  elbow: NumericIcePoint;
  end: NumericIcePoint;
  width: number;
  delay: number;
}

export interface NumericIceFractureLayout {
  seed: number;
  cellCount: number;
  reducedMotion: boolean;
  intensity: NumericIceFractureIntensity;
  timing: NumericIceFractureTiming;
  impacts: readonly NumericIceImpactGeometry[];
  shards: readonly NumericIceShardGeometry[];
  specks: readonly NumericIceSpeckGeometry[];
  cracks: readonly NumericIceCrackGeometry[];
}

export interface NumericIceShardSample {
  geometry: NumericIceShardGeometry;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  alpha: number;
  visible: boolean;
}

export interface NumericIceSpeckSample {
  geometry: NumericIceSpeckGeometry;
  x: number;
  y: number;
  radius: number;
  alpha: number;
  visible: boolean;
}

export interface NumericIceCrackSample {
  geometry: NumericIceCrackGeometry;
  reveal: number;
  alpha: number;
  visible: boolean;
}

export interface NumericIceCounterSample {
  showPrevious: boolean;
  showNext: boolean;
  previousAlpha: number;
  nextAlpha: number;
  nextScale: number;
  glowAlpha: number;
}

export interface NumericIceFractureSample {
  age: number;
  progress: number;
  easedProgress: number;
  started: boolean;
  finished: boolean;
  flashAlpha: number;
  flashScale: number;
  frostVeilAlpha: number;
  /** The original ice skin remains briefly, then clears before the dense burst peaks. */
  iceSheetAlpha: number;
  /** Outward skin displacement in board cells; reduced motion always stays still. */
  sheetLift: number;
  counter: NumericIceCounterSample;
  shards: readonly NumericIceShardSample[];
  specks: readonly NumericIceSpeckSample[];
  cracks: readonly NumericIceCrackSample[];
}

export interface NumericIceFractureOptions {
  seed: string | number;
  cellCount: number;
  reducedMotion?: boolean;
  intensity?: NumericIceFractureIntensity;
}

export interface GateIceParticleProjectionOptions {
  side: "top" | "right" | "bottom" | "left";
  cellIndex: number;
  origin: Readonly<NumericIcePoint>;
  velocity: Readonly<NumericIcePoint>;
  gravity?: number;
  /** Particle-local age, after the counter reveal and this particle's delay. */
  age: number;
  cellSize: number;
  normalSize: number;
}

/**
 * Pixel offsets from a gate's tangent start and normal centre. All mouths use
 * origin.x/velocity.x along their length and origin.y/velocity.y across it.
 * The normal is signed in canvas coordinates: top/left negative, bottom/right
 * positive. Its launch and acceleration point out of the board on every side.
 */
export const projectGateIceParticle = ({
  side, cellIndex, origin, velocity, gravity = 0, age, cellSize, normalSize,
}: GateIceParticleProjectionOptions): { tangent: number; normal: number } => {
  const finite = (value: number): number => Number.isFinite(value) ? value : 0;
  const seconds = Math.max(0, finite(age));
  const cell = Math.max(0, finite(cellSize));
  const thickness = Math.max(0, finite(normalSize));
  const outward = side === "top" || side === "left" ? -1 : 1;
  return {
    tangent: (Math.max(0, Math.floor(finite(cellIndex))) + finite(origin.x)
      + finite(velocity.x) * seconds) * cell,
    normal: outward * ((finite(origin.y) - 0.5) * thickness
      + (Math.abs(finite(velocity.y)) * seconds
        + Math.max(0, finite(gravity)) * seconds * seconds * 0.5) * cell),
  };
};

const SHATTER_TIMING: NumericIceFractureTiming = {
  duration: 0.94,
  counterRevealAt: 0.016,
  flashPeakAt: 0.19,
  flashEndAt: 0.42,
  crackEndAt: 0.46,
};

const SHATTER_REDUCED_TIMING: NumericIceFractureTiming = {
  duration: 0.28,
  counterRevealAt: 0.008,
  flashPeakAt: 0.038,
  flashEndAt: 0.15,
  crackEndAt: 0.22,
};

const DECREMENT_TIMING: NumericIceFractureTiming = {
  duration: 0.05,
  counterRevealAt: 0.016,
  flashPeakAt: 0.016,
  flashEndAt: 0.032,
  crackEndAt: 0.04,
};

const DECREMENT_REDUCED_TIMING: NumericIceFractureTiming = {
  duration: 0.033,
  counterRevealAt: 0.008,
  flashPeakAt: 0.008,
  flashEndAt: 0.018,
  crackEndAt: 0.025,
};

const clamp = (value: number, minimum: number, maximum: number): number => (
  Math.min(maximum, Math.max(minimum, value))
);

const clampUnit = (value: number): number => clamp(value, 0, 1);

const smoothstep = (value: number): number => {
  const progress = clampUnit(value);
  return progress * progress * (3 - 2 * progress);
};

const easeOutCubic = (value: number): number => 1 - (1 - clampUnit(value)) ** 3;

const stringSeed = (value: string): number => {
  let seed = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    seed ^= value.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
};

const normalizeSeed = (seed: string | number): number => {
  if (typeof seed === "string") return stringSeed(seed);
  if (!Number.isFinite(seed)) return 0;
  return Math.trunc(seed) >>> 0;
};

const stableUnit = (seed: number, index: number, stream: number): number => {
  let value = (seed
    ^ Math.imul(index + 1, 0x9e3779b1)
    ^ Math.imul(stream + 1, 0x85ebca6b)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 0x1_0000_0000;
};

const countForCells = (
  cellCount: number,
  perCell: number,
  cap: number,
): number => Math.min(cellCount * perCell, cap);

const pointNearImpact = (
  impact: NumericIceImpactGeometry,
  seed: number,
  index: number,
  stream: number,
  spread: number,
): NumericIcePoint => ({
  x: clamp(impact.x + (stableUnit(seed, index, stream) - 0.5) * spread, 0.06, 0.94),
  y: clamp(impact.y + (stableUnit(seed, index, stream + 1) - 0.5) * spread, 0.06, 0.94),
});

export const numericIceFractureTiming = (
  reducedMotion: boolean,
  intensity: NumericIceFractureIntensity = "decrement",
): NumericIceFractureTiming => {
  if (intensity === "shatter") {
    return reducedMotion ? SHATTER_REDUCED_TIMING : SHATTER_TIMING;
  }
  return reducedMotion ? DECREMENT_REDUCED_TIMING : DECREMENT_TIMING;
};

/**
 * Builds geometry in cell-local units. Origins and crack points use a 0..1
 * coordinate space; velocities, radii and shard vertices are fractions of one
 * board cell. The renderer only needs to translate each item by its cell.
 */
export const buildNumericIceFracture = (
  options: NumericIceFractureOptions,
): NumericIceFractureLayout => {
  const reducedMotion = options.reducedMotion === true;
  const intensity: NumericIceFractureIntensity = options.intensity === "shatter"
    ? "shatter"
    : "decrement";
  const shatter = intensity === "shatter";
  const rawCellCount = Number.isFinite(options.cellCount) ? Math.floor(options.cellCount) : 1;
  const cellCount = clamp(rawCellCount, 1, 16);
  const seed = normalizeSeed(options.seed);
  const timing = numericIceFractureTiming(reducedMotion, intensity);

  const impacts: NumericIceImpactGeometry[] = Array.from({ length: shatter ? cellCount : 0 }, (_, cellIndex) => ({
    cellIndex,
    x: 0.25 + stableUnit(seed, cellIndex, 0) * 0.5,
    y: 0.18 + stableUnit(seed, cellIndex, 1) * 0.43,
    radius: (reducedMotion ? 0.1 : shatter ? 0.17 : 0.12)
      + stableUnit(seed, cellIndex, 2) * (shatter ? 0.08 : 0.05),
  }));

  const tailParticleCount = shatter && !reducedMotion
    ? Math.min(5, Math.max(2, Math.ceil(cellCount / 2) + 1))
    : 0;
  const tailShardCount = Math.ceil(tailParticleCount / 2);
  const tailSpeckCount = tailParticleCount - tailShardCount;
  // Cracks get a short readable lead without extending the overall animation.
  const debrisLead = reducedMotion ? 0.012 : 0.035;
  const shardCount = !shatter
    ? 0
    : reducedMotion
      ? countForCells(cellCount, 2, 8)
      : countForCells(cellCount, 14, 38);
  const shards: NumericIceShardGeometry[] = Array.from({ length: shardCount }, (_, index) => {
    const tail = index < tailShardCount;
    const cellIndex = index % cellCount;
    const impact = impacts[cellIndex];
    const origin = pointNearImpact(
      impact,
      seed,
      index,
      10,
      reducedMotion ? 0.13 : shatter ? 0.28 : 0.18,
    );
    const angle = -Math.PI / 2 + (stableUnit(seed, index, 12) - 0.5) * Math.PI * 1.72;
    const speed = reducedMotion
      ? (shatter ? 0.26 : 0.12) + stableUnit(seed, index, 13) * (shatter ? 0.26 : 0.12)
      : (shatter ? 0.85 : 0.3) + stableUnit(seed, index, 13) * (shatter ? 1.15 : 0.34);
    const length = reducedMotion
      ? (shatter ? 0.035 : 0.025) + stableUnit(seed, index, 14) * (shatter ? 0.03 : 0.018)
      : (shatter ? 0.095 : 0.038) + stableUnit(seed, index, 14) * (shatter ? 0.105 : 0.035);
    const width = length * (0.45 + stableUnit(seed, index, 15) * 0.27);
    const skew = (stableUnit(seed, index, 16) - 0.5) * width * 0.52;
    const tint = Math.min(2, Math.floor(stableUnit(seed, index, 17) * 3)) as 0 | 1 | 2;
    const shapeRoll = reducedMotion ? 1 : stableUnit(seed, index, 45);
    const vertices: NumericIcePoint[] = shapeRoll > 0.82
      ? [
        { x: skew, y: -length * 0.68 },
        { x: -width, y: length * 0.42 },
        { x: width, y: length * 0.31 },
      ]
      : shapeRoll > 0.38
        ? [
          { x: -width * 0.32 + skew * 0.18, y: -length * 0.64 },
          { x: -width, y: length * 0.02 },
          { x: -width * 0.42, y: length * 0.55 },
          { x: width, y: length * 0.3 },
        ]
        : [
          { x: -width * 0.28 + skew * 0.14, y: -length * 0.62 },
          { x: -width * 0.92, y: -length * 0.12 },
          { x: -width * 0.58, y: length * 0.48 },
          { x: width * 0.48, y: length * 0.56 },
          { x: width, y: -length * 0.18 },
        ];
    const delay = Math.max(debrisLead, tail
      ? 0.04 + stableUnit(seed, index, 21) * 0.02
      : stableUnit(seed, index, 21) * (reducedMotion ? 0.025 : 0.08));
    const lifetime = tail
      ? 0.88 + stableUnit(seed, index, 22) * 0.025
      : reducedMotion
        ? 0.12 + stableUnit(seed, index, 22) * 0.07
        : 0.5 + stableUnit(seed, index, 22) * 0.08;
    return {
      index,
      cellIndex,
      origin,
      vertices,
      velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      gravity: reducedMotion
        ? shatter ? 0.55 : 0.28
        : (shatter ? 2.05 : 1.15) + stableUnit(seed, index, 18) * (shatter ? 0.8 : 0.35),
      rotation: stableUnit(seed, index, 19) * Math.PI * 2,
      angularVelocity: (stableUnit(seed, index, 20) - 0.5)
        * (reducedMotion ? shatter ? 4.2 : 2.2 : shatter ? 13.5 : 6.5),
      delay,
      lifetime: Math.min(lifetime, timing.duration - timing.counterRevealAt - delay),
      tint,
      tail,
    };
  });

  const speckCount = !shatter
    ? 0
    : reducedMotion
      ? countForCells(cellCount, 2, 6)
      : countForCells(cellCount, 10, 24);
  const specks: NumericIceSpeckGeometry[] = Array.from({ length: speckCount }, (_, index) => {
    const tail = index < tailSpeckCount;
    const cellIndex = index % cellCount;
    const impact = impacts[cellIndex];
    const origin = pointNearImpact(
      impact,
      seed,
      index,
      30,
      reducedMotion ? 0.16 : shatter ? 0.38 : 0.22,
    );
    const angle = -Math.PI / 2 + (stableUnit(seed, index, 32) - 0.5) * Math.PI * 1.9;
    const speed = reducedMotion
      ? (shatter ? 0.1 : 0.06) + stableUnit(seed, index, 33) * (shatter ? 0.16 : 0.08)
      : (shatter ? 0.28 : 0.13) + stableUnit(seed, index, 33) * (shatter ? 0.62 : 0.22);
    const delay = Math.max(debrisLead, tail
      ? 0.025 + stableUnit(seed, index, 35) * 0.02
      : stableUnit(seed, index, 35) * (reducedMotion ? 0.035 : 0.1));
    const lifetime = tail
      ? 0.88 + stableUnit(seed, index, 36) * 0.03
      : reducedMotion
        ? 0.11 + stableUnit(seed, index, 36) * 0.07
        : 0.4 + stableUnit(seed, index, 36) * 0.14;
    return {
      index,
      cellIndex,
      origin,
      velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      radius: reducedMotion
        ? 0.01 + stableUnit(seed, index, 34) * (shatter ? 0.011 : 0.007)
        : 0.012 + stableUnit(seed, index, 34) * (shatter ? 0.022 : 0.013),
      delay,
      lifetime: Math.min(lifetime, timing.duration - timing.counterRevealAt - delay),
      phase: stableUnit(seed, index, 37) * Math.PI * 2,
      kind: stableUnit(seed, index, 38) > 0.72 ? "glint" : "dot",
      tail,
    };
  });

  const crackCount = !shatter
    ? 0
    : reducedMotion
      ? countForCells(cellCount, 1, 4)
      : countForCells(cellCount, 4, 14);
  const cracks: NumericIceCrackGeometry[] = Array.from({ length: crackCount }, (_, index) => {
    const cellIndex = index % cellCount;
    const impact = impacts[cellIndex];
    const localRay = Math.floor(index / cellCount);
    const rayCount = Math.max(1, Math.ceil(crackCount / cellCount));
    const angle = (localRay / rayCount) * Math.PI * 2
      + (stableUnit(seed, index, 40) - 0.5) * 0.72;
    const length = (reducedMotion ? shatter ? 0.13 : 0.08 : shatter ? 0.2 : 0.11)
      + stableUnit(seed, index, 41)
        * (reducedMotion ? shatter ? 0.07 : 0.04 : shatter ? 0.18 : 0.08);
    const end = {
      x: clamp(impact.x + Math.cos(angle) * length, 0.055, 0.945),
      y: clamp(impact.y + Math.sin(angle) * length, 0.055, 0.945),
    };
    const perpendicular = (stableUnit(seed, index, 42) - 0.5) * length * 0.3;
    return {
      index,
      cellIndex,
      start: { x: impact.x, y: impact.y },
      elbow: {
        x: clamp((impact.x + end.x) * 0.5 - Math.sin(angle) * perpendicular, 0.055, 0.945),
        y: clamp((impact.y + end.y) * 0.5 + Math.cos(angle) * perpendicular, 0.055, 0.945),
      },
      end,
      width: reducedMotion
        ? 0.007 + stableUnit(seed, index, 43) * (shatter ? 0.006 : 0.003)
        : 0.008 + stableUnit(seed, index, 43) * (shatter ? 0.01 : 0.005),
      delay: index === 0 ? 0 : stableUnit(seed, index, 44) * (reducedMotion ? 0.006 : 0.024),
    };
  });

  return {
    seed,
    cellCount,
    reducedMotion,
    intensity,
    timing,
    impacts,
    shards,
    specks,
    cracks,
  };
};

const debrisAlpha = (progress: number): number => {
  const entrance = smoothstep(progress / 0.09);
  const fade = 1 - smoothstep((progress - 0.62) / 0.38);
  return entrance * fade;
};

export const sampleNumericIceFracture = (
  layout: NumericIceFractureLayout,
  age: number,
): NumericIceFractureSample => {
  const safeAge = Number.isFinite(age) ? Math.max(0, age) : 0;
  const started = Number.isFinite(age) && age >= 0;
  const progress = clampUnit(safeAge / layout.timing.duration);
  const easedProgress = easeOutCubic(progress);
  const finished = started && safeAge >= layout.timing.duration;
  const sheetVisible = layout.intensity === "shatter" && started && !finished;
  const sheetHoldUntil = layout.reducedMotion ? 0.014 : 0.05;
  const sheetClearAt = layout.reducedMotion ? 0.07 : 0.18;
  const sheetFade = 1 - smoothstep((safeAge - sheetHoldUntil) / (sheetClearAt - sheetHoldUntil));

  // The reference keeps the old counter intact up to the trigger. Visual
  // fracture and the new value begin together on the first burst frame.
  const effectAge = Math.max(0, safeAge - layout.timing.counterRevealAt);
  const flashEntrance = smoothstep(effectAge / layout.timing.flashPeakAt);
  const flashExit = 1 - smoothstep(
    (effectAge - layout.timing.flashPeakAt)
      / (layout.timing.flashEndAt - layout.timing.flashPeakAt),
  );
  const flashAlpha = layout.intensity === "shatter" && started && !finished
    ? flashEntrance * flashExit
    : 0;

  const revealAt = layout.timing.counterRevealAt;
  const showNext = started && safeAge >= revealAt;
  const nextAge = Math.max(0, safeAge - revealAt);
  const nextSettleDuration = layout.reducedMotion ? 0.07 : 0.18;
  const nextSettle = 1 - easeOutCubic(nextAge / nextSettleDuration);

  const crackFade = 1 - smoothstep(
    (effectAge - layout.timing.flashPeakAt) / (layout.timing.crackEndAt - layout.timing.flashPeakAt),
  );
  const cracks: NumericIceCrackSample[] = layout.cracks.map((geometry) => {
    const localAge = effectAge - geometry.delay;
    const reveal = smoothstep(localAge / (layout.reducedMotion ? 0.045 : 0.085));
    const alpha = started && localAge >= 0 && !finished ? reveal * crackFade : 0;
    return { geometry, reveal, alpha, visible: alpha > 0.001 };
  });

  const shards: NumericIceShardSample[] = layout.shards.map((geometry) => {
    const localAge = effectAge - geometry.delay;
    const localProgress = clampUnit(localAge / geometry.lifetime);
    const alpha = started && localAge >= 0 && localAge < geometry.lifetime && !finished
      ? debrisAlpha(localProgress)
      : 0;
    return {
      geometry,
      x: geometry.origin.x + geometry.velocity.x * localAge,
      y: geometry.origin.y + geometry.velocity.y * localAge + geometry.gravity * localAge * localAge * 0.5,
      rotation: geometry.rotation + geometry.angularVelocity * localAge,
      scale: 0.58 + easeOutCubic(localProgress) * 0.42,
      alpha,
      visible: alpha > 0.001,
    };
  });

  const specks: NumericIceSpeckSample[] = layout.specks.map((geometry) => {
    const localAge = effectAge - geometry.delay;
    const localProgress = clampUnit(localAge / geometry.lifetime);
    const alpha = started && localAge >= 0 && localAge < geometry.lifetime && !finished
      ? debrisAlpha(localProgress) * (0.78 + Math.sin(geometry.phase + localProgress * Math.PI * 3) * 0.22)
      : 0;
    return {
      geometry,
      x: geometry.origin.x + geometry.velocity.x * localAge,
      y: geometry.origin.y + geometry.velocity.y * localAge + 0.42 * localAge * localAge,
      radius: geometry.radius * (0.66 + Math.sin(geometry.phase + localProgress * Math.PI) * 0.34),
      alpha: clampUnit(alpha),
      visible: alpha > 0.001,
    };
  });

  return {
    age: safeAge,
    progress,
    easedProgress,
    started,
    finished,
    flashAlpha,
    flashScale: layout.intensity === "shatter" ? 0.72 + easedProgress * 0.48 : 1,
    frostVeilAlpha: layout.intensity === "shatter" && started && showNext && !finished
      ? (1 - smoothstep(effectAge / layout.timing.crackEndAt))
        * (layout.reducedMotion ? 0.1 : layout.intensity === "shatter" ? 0.16 : 0.12)
      : 0,
    iceSheetAlpha: sheetVisible ? sheetFade * (layout.reducedMotion ? 0.4 : 0.72) : 0,
    sheetLift: sheetVisible && !layout.reducedMotion
      ? smoothstep(safeAge / sheetHoldUntil) * sheetFade * 0.055
      : 0,
    counter: {
      showPrevious: !showNext,
      showNext,
      previousAlpha: showNext ? 0 : 1,
      nextAlpha: showNext ? 1 : 0,
      nextScale: showNext && layout.intensity === "shatter"
        ? 1 + nextSettle * (layout.reducedMotion ? 0.06 : 0.2)
        : 1,
      glowAlpha: showNext && layout.intensity === "shatter"
        ? (1 - smoothstep(nextAge / (layout.reducedMotion ? 0.09 : 0.24)))
        : 0,
    },
    shards,
    specks,
    cracks,
  };
};
