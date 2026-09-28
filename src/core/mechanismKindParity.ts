import type { BlockSpec, LevelSpec, Point } from "./types";

export const MECHANISM_KIND_IDS = [
  "color-exit",
  "irregular-block",
  "frozen-exit",
  "irregular-board",
  "numeric-ice",
  "multilayer-shell",
  "shutter",
  "generator",
  "axis-block",
  "key-lock",
  "layered-lift",
  "timed-generator",
  "staged-frame",
  "star",
  "bomb",
  "rotation-badge",
  "flip-door",
  "colored-grid",
] as const;

export type MechanismKindId = (typeof MECHANISM_KIND_IDS)[number];
export type MechanismTruthState = "present" | "absent" | "unknown";
export type MechanismTruthStates = Record<MechanismKindId, MechanismTruthState>;
export type RuntimeMechanismKinds = Record<MechanismKindId, boolean>;

export interface MechanismKindParityRecord {
  runtimeLevelId: number;
  competitorLevelId: number;
  sourceMissing: boolean;
  competitor: MechanismTruthStates;
  runtime: RuntimeMechanismKinds;
  competitorPresentKinds: MechanismKindId[];
  competitorAbsentKinds: MechanismKindId[];
  competitorUnknownKinds: MechanismKindId[];
  runtimePresentKinds: MechanismKindId[];
  missingKinds: MechanismKindId[];
  extraKinds: MechanismKindId[];
  status: "exact-known" | "partial-unknown" | "source-missing" | "mismatch";
}

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => (
  Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const recordOf = (value: unknown): JsonRecord => isRecord(value) ? value : {};

const finiteNumber = (value: unknown): number | null => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const stateFromCount = (value: unknown): MechanismTruthState => {
  if (value === null || value === undefined || value === "unclear") return "unknown";
  const count = finiteNumber(value);
  if (count === null) return "unknown";
  return count > 0 ? "present" : "absent";
};

const stateFromCollection = (
  value: unknown,
  missingState: MechanismTruthState,
): MechanismTruthState => {
  if (value === undefined) return missingState;
  if (value === null || value === "unclear") return "unknown";
  if (Array.isArray(value)) return value.length > 0 ? "present" : "absent";
  if (!isRecord(value)) return "unknown";
  if (Object.hasOwn(value, "count")) return stateFromCount(value.count);
  if (Object.hasOwn(value, "items")) return stateFromCollection(value.items, "unknown");
  return Object.keys(value).length > 0 ? "present" : "absent";
};

const anyState = (...states: MechanismTruthState[]): MechanismTruthState => {
  if (states.includes("present")) return "present";
  if (states.every((state) => state === "absent")) return "absent";
  return "unknown";
};

const truthLevelId = (truthLevel: JsonRecord): number => (
  finiteNumber(truthLevel.level) ?? finiteNumber(truthLevel.level_id) ?? 0
);

const sourceMissing = (truthLevel: JsonRecord): boolean => {
  const provenance = recordOf(truthLevel.provenance);
  return provenance.classification === "source_missing_external_reference_only";
};

const legacyMissingState = (levelId: number): MechanismTruthState => (
  levelId > 0 && levelId <= 100 ? "absent" : "unknown"
);

const v6DirectionalState = (
  directional: JsonRecord,
  kind: "ordinary" | "frozen" | "star",
): MechanismTruthState => {
  if (kind === "ordinary") return stateFromCount(directional.ordinary_count);
  if (kind === "frozen") return stateFromCollection(directional.frozen_values, "unknown");
  return anyState(
    stateFromCount(directional.star_count),
    stateFromCount(directional.star_frozen_count),
    stateFromCollection(directional.star_frozen_values, "unknown"),
  );
};

const recordHasStar = (value: unknown): boolean => (
  Array.isArray(value) && value.some((item) => isRecord(item) && item.star === true)
);

const unsupportedNames = (mechanisms: JsonRecord): string[] => {
  const unsupported = Array.isArray(mechanisms.unsupported) ? mechanisms.unsupported : [];
  return unsupported.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    return [entry.type, entry.name]
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.toLowerCase().replace(/[\s_]+/g, "-"));
  });
};

const truthDirectionalStates = (
  levelId: number,
  mechanisms: JsonRecord,
): { ordinary: MechanismTruthState; frozen: MechanismTruthState; star: MechanismTruthState } => {
  const directional = recordOf(mechanisms.directional_exits);
  if (levelId <= 100) {
    return {
      ordinary: v6DirectionalState(directional, "ordinary"),
      frozen: v6DirectionalState(directional, "frozen"),
      star: v6DirectionalState(directional, "star"),
    };
  }
  const directionalSource = recordOf(directional.source);
  const ordinaryText = typeof directionalSource.ordinary === "string" ? directionalSource.ordinary : "";
  const ordinary = /gate|exit|门|出口/i.test(ordinaryText)
    ? "present"
    : stateFromCollection(directional.ordinary, "unknown");
  const frozen = stateFromCollection(directional.frozen, "unknown");
  const explicitStar = stateFromCollection(directional.star, "unknown");
  return {
    ordinary,
    frozen,
    star: recordHasStar(directional.ordinary) || recordHasStar(directional.frozen)
      ? "present"
      : explicitStar,
  };
};

const normalizeShapeName = (value: string): string => value.toUpperCase().replace(/[^A-Z0-9]/g, "");

const RECTANGULAR_SHAPE_NAMES = new Set([
  "SINGLE", "H1", "V1", "H2", "V2", "H3", "V3", "H4", "V4",
  "SQ2", "SQ3", "RECT2X3", "RECT3X2", "SQUARE2X2", "SQUARE3X3",
  "HORIZONTAL1", "HORIZONTAL2", "HORIZONTAL3", "HORIZONTAL4",
  "VERTICAL1", "VERTICAL2", "VERTICAL3", "VERTICAL4",
]);

const histogramHasIrregularShape = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([shape, count]) => {
    const amount = finiteNumber(count);
    return amount !== null && amount > 0 && !RECTANGULAR_SHAPE_NAMES.has(normalizeShapeName(shape));
  });
};

const unparsedHasIrregularShape = (value: unknown): boolean => (
  Array.isArray(value) && value.some((entry) => {
    const source = isRecord(entry) ? String(entry.source_shape ?? entry.shape ?? "") : String(entry);
    return /irregular|(?:^|[^a-z])[ltsp](?:[-_ ]?like|\d)|cross/i.test(source);
  })
);

const competitorIrregularBlockState = (
  levelId: number,
  truthLevel: JsonRecord,
  mechanisms: JsonRecord,
): MechanismTruthState => {
  const explicit = mechanisms.irregular_blocks;
  if (explicit !== undefined) return stateFromCollection(explicit, legacyMissingState(levelId));
  const composition = recordOf(truthLevel.composition);
  const fullHistogram = composition.source_full_shape_histogram;
  const openingHistogram = composition.opening_shape_histogram;
  if (histogramHasIrregularShape(fullHistogram) || histogramHasIrregularShape(openingHistogram)
    || unparsedHasIrregularShape(composition.source_full_shape_histogram_unparsed)
    || unparsedHasIrregularShape(composition.opening_shape_histogram_unparsed)) return "present";
  if (levelId <= 100) return "absent";
  return composition.source_full_shape_histogram_status === "exact" ? "absent" : "unknown";
};

const competitorIrregularBoardState = (truthLevel: JsonRecord): MechanismTruthState => {
  const board = recordOf(truthLevel.board);
  const componentCount = finiteNumber(board.source_component_count);
  const sourceComponents = Array.isArray(board.source_components)
    ? board.source_components.filter(isRecord)
    : [];
  if (componentCount !== null && componentCount > 1
    && sourceComponents.length >= componentCount
    && sourceComponents.every((component) => component.adjacent_to_other_components === false)) {
    return "present";
  }
  const rows = finiteNumber(board.rows);
  const cols = finiteNumber(board.cols);
  const playable = finiteNumber(board.playable_cell_count);
  if (rows === null || cols === null || playable === null) return "unknown";
  return playable < rows * cols ? "present" : "absent";
};

const keyLockState = (
  value: unknown,
  missingState: MechanismTruthState,
): MechanismTruthState => {
  if (value === undefined) return missingState;
  if (value === null || value === "unclear") return "unknown";
  if (Array.isArray(value)) return value.length > 0 ? "present" : "absent";
  if (!isRecord(value)) return "unknown";
  return anyState(stateFromCount(value.key_count), stateFromCount(value.lock_count));
};

const generatorStates = (
  value: unknown,
  missingState: MechanismTruthState,
): { move: MechanismTruthState; timed: MechanismTruthState } => {
  if (value === undefined) return { move: missingState, timed: missingState };
  if (value === null || value === "unclear") return { move: "unknown", timed: "unknown" };
  let records: JsonRecord[] = [];
  if (Array.isArray(value)) records = value.filter(isRecord);
  else if (isRecord(value)) {
    const countState = Object.hasOwn(value, "count") ? stateFromCount(value.count) : "present";
    if (countState === "absent") return { move: "absent", timed: "absent" };
    if (countState === "unknown") return { move: "unknown", timed: "unknown" };
    records = [value];
  } else return { move: "unknown", timed: "unknown" };
  if (!records.length) return { move: "absent", timed: "absent" };
  const triggers = records.map((record) => record.trigger);
  const knownMove = triggers.some((trigger) => trigger === undefined || trigger === "move" || trigger === "block-clear");
  const knownTimed = triggers.some((trigger) => trigger === "time" || trigger === "timed");
  const unclear = triggers.some((trigger) => typeof trigger !== "string" || /unclear|unknown/i.test(trigger));
  return {
    move: knownMove ? "present" : unclear ? "unknown" : "absent",
    timed: knownTimed ? "present" : unclear ? "unknown" : "absent",
  };
};

const positiveUnsupportedEvidence = (names: string[], patterns: RegExp[]): boolean => (
  names.some((name) => patterns.some((pattern) => pattern.test(name)))
);

export const competitorSourceLevelId = (runtimeLevelId: number): number => {
  return runtimeLevelId;
};

export const classifyCompetitorMechanismKinds = (truthValue: unknown): MechanismTruthStates => {
  const truthLevel = recordOf(truthValue);
  const levelId = truthLevelId(truthLevel);
  const missing = legacyMissingState(levelId);
  const mechanisms = recordOf(truthLevel.mechanisms);
  const directional = truthDirectionalStates(levelId, mechanisms);
  const flipDoor = stateFromCollection(mechanisms.flip_doors, missing);
  const generators = generatorStates(mechanisms.generators, missing);
  const names = unsupportedNames(mechanisms);
  const bombEvidence = positiveUnsupportedEvidence(names, [/bomb/, /timed-bomb/]);
  const rotationEvidence = positiveUnsupportedEvidence(names, [/circular-double-arrow/, /rotat/]);
  const shellState = levelId === 76
    && recordOf(mechanisms.numeric_ice).post_melt_shell === "unclear"
    && mechanisms.shells === undefined
    ? "unknown"
    : stateFromCollection(mechanisms.shells, missing);
  const starBlocks = stateFromCollection(mechanisms.star_blocks ?? mechanisms.stars, missing);

  return {
    // Every shipped competitor level uses colour exits. Empty/unparsed arrays in
    // the partial 101-200 fact table are not proof of an alternative win rule,
    // so absence is deliberately never inferred here.
    "color-exit": anyState(directional.ordinary, directional.frozen, directional.star, flipDoor) === "present"
      ? "present"
      : "unknown",
    "irregular-block": competitorIrregularBlockState(levelId, truthLevel, mechanisms),
    "frozen-exit": directional.frozen,
    "irregular-board": competitorIrregularBoardState(truthLevel),
    "numeric-ice": stateFromCollection(mechanisms.numeric_ice, missing),
    "multilayer-shell": shellState,
    shutter: stateFromCollection(mechanisms.covers, missing),
    generator: generators.move,
    "axis-block": stateFromCollection(mechanisms.axis_blocks, missing),
    "key-lock": keyLockState(mechanisms.key_locks ?? mechanisms.keys_locks, missing),
    "layered-lift": stateFromCollection(mechanisms.lifts, missing),
    "timed-generator": generators.timed,
    "staged-frame": stateFromCollection(mechanisms.staged_frames, missing),
    star: anyState(starBlocks, directional.star),
    bomb: bombEvidence ? "present" : stateFromCollection(mechanisms.bombs, missing),
    "rotation-badge": rotationEvidence ? "present" : stateFromCollection(mechanisms.rotatable_blocks, missing),
    "flip-door": flipDoor,
    "colored-grid": stateFromCollection(mechanisms.colored_grid, missing),
  };
};

const isIrregularRuntimeBlock = (block: BlockSpec): boolean => {
  if (!block.shape.length) return false;
  const xs = block.shape.map(([x]) => x);
  const ys = block.shape.map(([, y]) => y);
  const area = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
  return block.shape.length < area;
};

const uniquePoints = (points: readonly Point[]): number => new Set(points.map(([x, y]) => `${x},${y}`)).size;

const runtimePlayableCount = (level: LevelSpec): number => {
  if (level.playable) return uniquePoints(level.playable);
  if (level.blocked) return level.width * level.height - uniquePoints(level.blocked);
  return level.width * level.height;
};

export const classifyRuntimeMechanismKinds = (level: LevelSpec): RuntimeMechanismKinds => {
  const exits = [...level.gates, ...(level.flipDoors ?? [])];
  const playerShutters = (level.shutters ?? []).filter((shutter) => (
    shutter.skin === undefined || shutter.skin === "shutter"
  ));
  return {
    "color-exit": exits.length > 0,
    "irregular-block": level.blocks.some(isIrregularRuntimeBlock),
    "frozen-exit": exits.some((gate) => (gate.frozen ?? 0) > 0),
    "irregular-board": runtimePlayableCount(level) < level.width * level.height,
    "numeric-ice": level.blocks.some((block) => (block.frozen ?? 0) > 0),
    "multilayer-shell": level.blocks.some((block) => (block.layers?.length ?? 1) > 1),
    shutter: playerShutters.length > 0,
    generator: (level.generators ?? []).some((generator) => (generator.trigger ?? "move") === "move"),
    "axis-block": level.blocks.some((block) => Boolean(block.movementAxis)),
    "key-lock": level.blocks.some((block) => Boolean(block.keyId || block.lockedBy)),
    "layered-lift": (level.shutters ?? []).some((shutter) => shutter.skin === "lift"),
    "timed-generator": (level.generators ?? []).some((generator) => generator.trigger === "time"),
    "staged-frame": (level.shutters ?? []).some((shutter) => shutter.skin === "staged-frame"),
    star: level.blocks.some((block) => Boolean(block.star)) || exits.some((gate) => Boolean(gate.star)),
    bomb: level.blocks.some((block) => Number.isFinite(block.timedBombSeconds)),
    "rotation-badge": level.blocks.some((block) => Boolean(block.rotationBadge)),
    "flip-door": (level.flipDoors ?? []).length > 0,
    "colored-grid": (level.coloredGrids ?? []).length > 0,
  };
};

export const compareMechanismKindParity = (
  runtimeLevelId: number,
  truthValue: unknown,
  level: LevelSpec,
): MechanismKindParityRecord => {
  const truthLevel = recordOf(truthValue);
  const competitor = classifyCompetitorMechanismKinds(truthLevel);
  const runtime = classifyRuntimeMechanismKinds(level);
  const competitorPresentKinds = MECHANISM_KIND_IDS.filter((kind) => competitor[kind] === "present");
  const competitorAbsentKinds = MECHANISM_KIND_IDS.filter((kind) => competitor[kind] === "absent");
  const competitorUnknownKinds = MECHANISM_KIND_IDS.filter((kind) => competitor[kind] === "unknown");
  const runtimePresentKinds = MECHANISM_KIND_IDS.filter((kind) => runtime[kind]);
  const missingKinds = competitorPresentKinds.filter((kind) => !runtime[kind]);
  const extraKinds = competitorAbsentKinds.filter((kind) => runtime[kind]);
  const isSourceMissing = sourceMissing(truthLevel);
  const status = missingKinds.length || extraKinds.length
    ? "mismatch"
    : isSourceMissing
      ? "source-missing"
      : competitorUnknownKinds.length
        ? "partial-unknown"
        : "exact-known";
  return {
    runtimeLevelId,
    competitorLevelId: truthLevelId(truthLevel) || competitorSourceLevelId(runtimeLevelId),
    sourceMissing: isSourceMissing,
    competitor,
    runtime,
    competitorPresentKinds,
    competitorAbsentKinds,
    competitorUnknownKinds,
    runtimePresentKinds,
    missingKinds,
    extraKinds,
    status,
  };
};
