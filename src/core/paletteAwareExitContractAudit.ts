import { buildGeneratorRimGeometry } from "../game/generatorRimGeometry";
import { finalGeneratorPlacementIssues } from "./finalGeneratorContracts";
import { validateLevel } from "./PuzzleModel";
import { COLORS, type BlockColor, type GateSpec, type LevelSpec, type Side } from "./types";
import { VIDEO_PARITY_LEVELS } from "./videoParityLevels.generated";
import { VIDEO_PARITY_LEVELS_101_TO_200 } from "./videoParityLevels101To200.generated";

export const PALETTE_AWARE_EXIT_CONTRACT_VERSION = "truth-palette-aware-exits-r1" as const;
export const PALETTE_AWARE_EXIT_EXCLUDED_LEVEL_IDS = [20] as const;
export const PALETTE_AWARE_EXIT_SOURCE_MISSING_LEVEL_IDS = [190, 191] as const;

/** Populated only with candidates certified by the focused solver/replay suite. */
export const PALETTE_AWARE_EXIT_SAFE_LEVEL_IDS = [
  26, 28, 29, 30, 39, 44, 49, 50, 70, 83, 87, 90, 95, 96, 99, 101, 108,
  112, 117, 129, 130, 132, 135, 155, 158, 168, 175, 178, 179, 188, 193, 196, 198,
] as const;

/**
 * Solver-certified exit layouts, packed as fixed-width base36 records:
 * side, offset, size, color, frozen, flags(star/door/open). Keeping this table
 * independent from the audit builder prevents the set-cover/truth data from
 * entering the production bundle.
 */
export const PALETTE_AWARE_EXIT_PACKED_PATCHES: Readonly<Partial<Record<number, string>>> = {
  26: "0023000214e0031200041390051450102500122600141700201100303200332000",
  28: "003500033100203000233300362600381420",
  29: "0032a01037k01310002034k03031003315k0",
  30: "001100011090021200103300201600303400",
  39: "0027b00220900711u01026001214s01315001416n01517m01610j02022202223503025f0",
  44: "003600032300052500131200203000232700252400302100",
  49: "152320172200202500222400243000352100372630",
  50: "003300031100103200133000202100222500303700333600362400",
  70: "002410102600202310302110",
  83: "0024000211000312000413000514a0061500071600102700122600141500151280161360171420202000302100322200342300",
  87: "0033001036502022h0303500332000",
  90: "1032601320a0303700333500",
  95: "0022000211e0031290041300051400061500071600103000131600141100202400303500331700341300",
  96: "0251000717c01132301624802120002326e02523a02715g0",
  99: "002730021630031530103210132310202400303110332030",
  101: "0027000213100311l00413f00514301030001314e0202201303500331690",
  108: "0012e00115c00212a0103400131740141330203600301110311570321020331250",
  112: "003400031160041530153300201700211620221610301200311100321000",
  117: "0020301015001117001216e03012003113503224e0",
  129: "002600022300102100122020141240202400303500",
  130: "002100022000041670051300061400071500102500151700202760221400302200321330",
  132: "003600103530203400303130",
  135: "003000103500202230303100332600",
  155: "002406021050031150102702122650202302303201",
  158: "103300131400303700331640",
  168: "0022000211p00314l00415k00516j0061550102700202320303000",
  175: "0021200220201033a01325102027a0303600332240",
  178: "003370103500132000202710303100332200",
  179: "002100021000031500041300103200133300202600303700333400",
  188: "003530031340041740103240132610203400303120333040",
  193: "0022901024501221701435b0203300303020333640",
  196: "003600032400051220061320103520132220203320232020303120332720",
  198: "0033000311400412c00513f01034001325402021d02226003037003322d0352040",
};

export interface PaletteAwareExitContract {
  ordinaryCount: number;
  frozenValues: readonly number[];
  starCount: number;
  starFrozenValues: readonly number[];
  flipDoorCount: number;
}

export type PaletteAwareExitCandidateStatus =
  | "excluded"
  | "source-missing"
  | "unchanged"
  | "candidate"
  | "rejected";

export interface PaletteAwareExitCandidateResult {
  levelId: number;
  status: PaletteAwareExitCandidateStatus;
  source: LevelSpec;
  level: LevelSpec;
  contract?: PaletteAwareExitContract;
  mode?: "same-total-reclassification" | "add-exits" | "remove-exits";
  issues: string[];
}

interface ExitContractOverride {
  ordinaryCount?: number;
  frozenValues?: readonly number[];
  starFrozenValues?: readonly number[];
}

/** Canonical source already matches truth except for these audited facts. */
const TRUTH_OVERRIDES = /* @__PURE__ */ new Map<number, ExitContractOverride>([
  [14, { frozenValues: [17] }],
  [50, { ordinaryCount: 9 }],
  [71, { frozenValues: [1, 2, 3, 8, 12, 13, 15, 17, 21] }],
  [73, { ordinaryCount: 2, frozenValues: [1, 3, 5, 6, 6, 8, 19, 20, 22, 23, 24, 25] }],
  [75, { frozenValues: [1, 2, 3, 11, 11, 11, 11, 11, 11] }],
  [100, { starFrozenValues: [3, 8] }],
  [106, { frozenValues: [1, 2, 6, 7, 9, 10, 12, 14, 16, 18, 20] }],
  [108, { frozenValues: [1, 2, 3, 4, 5, 7, 10, 12, 14] }],
  [112, { ordinaryCount: 6 }],
  [130, { ordinaryCount: 9 }],
  [150, { frozenValues: [7, 7] }],
  [170, { ordinaryCount: 2 }],
]);

const EXCLUDED_IDS = /* @__PURE__ */ new Set<number>(PALETTE_AWARE_EXIT_EXCLUDED_LEVEL_IDS);
const SOURCE_MISSING_IDS = /* @__PURE__ */ new Set<number>(PALETTE_AWARE_EXIT_SOURCE_MISSING_LEVEL_IDS);
const SIDE_ORDER: readonly Side[] = ["top", "right", "bottom", "left"];
const SIDE_INDEX = /* @__PURE__ */ new Map(SIDE_ORDER.map((side, index) => [side, index]));

const canonicalById = /* @__PURE__ */ new Map<number, LevelSpec>([
  ...VIDEO_PARITY_LEVELS,
  ...VIDEO_PARITY_LEVELS_101_TO_200,
].map((level) => [level.id, level]));

const sortedNumbers = (values: readonly number[]): number[] => [...values].sort((left, right) => left - right);
const pointKey = (x: number, y: number): string => `${x},${y}`;
const railKey = (rail: { x: number; y: number; quarterTurns: number }): string => (
  `${rail.quarterTurns}:${rail.x},${rail.y}`
);

export const paletteAwareExitContractFor = (levelId: number): PaletteAwareExitContract | undefined => {
  if (SOURCE_MISSING_IDS.has(levelId)) return undefined;
  const canonical = canonicalById.get(levelId);
  if (!canonical) return undefined;
  const ordinary = canonical.gates.filter((gate) => !gate.star && (gate.frozen ?? 0) <= 0);
  const frozen = canonical.gates.filter((gate) => !gate.star && (gate.frozen ?? 0) > 0);
  const star = canonical.gates.filter((gate) => gate.star);
  const starFrozen = star.filter((gate) => (gate.frozen ?? 0) > 0);
  const override = TRUTH_OVERRIDES.get(levelId);
  const contract: PaletteAwareExitContract = {
    ordinaryCount: override?.ordinaryCount ?? ordinary.length,
    frozenValues: sortedNumbers(override?.frozenValues ?? frozen.map((gate) => gate.frozen!)),
    starCount: star.length,
    starFrozenValues: sortedNumbers(override?.starFrozenValues ?? starFrozen.map((gate) => gate.frozen!)),
    flipDoorCount: canonical.flipDoors?.length ?? 0,
  };
  if (contract.starFrozenValues.length > contract.starCount) {
    throw new Error(`Lv${levelId}: star-frozen truth exceeds total star exits`);
  }
  return contract;
};

interface ExitSemantic {
  kind: "gate" | "flipDoor";
  frozen: number;
  star: boolean;
  initiallyOpen?: boolean;
}

interface ExitSlot {
  side: Side;
  offset: number;
  size: number;
  currentColor?: BlockColor;
  currentSemantic?: ExitSemantic;
}

interface LayerRequirement {
  blockId: string;
  layerIndex: number;
  color: BlockColor;
  starRequired: boolean;
  movementAxis: "horizontal" | "vertical" | null;
  width: number;
  height: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  dynamic: boolean;
}

const semanticOf = (
  exit: Pick<GateSpec, "frozen" | "star"> & Partial<{ initiallyOpen: boolean }>,
  kind: ExitSemantic["kind"],
): ExitSemantic => ({
  kind,
  frozen: (exit.frozen ?? 0) > 0 ? exit.frozen! : 0,
  star: Boolean(exit.star),
  ...(kind === "flipDoor" ? { initiallyOpen: Boolean(exit.initiallyOpen) } : {}),
});

const currentContract = (level: LevelSpec): PaletteAwareExitContract => {
  const ordinary = level.gates.filter((gate) => !gate.star && (gate.frozen ?? 0) <= 0);
  const frozen = level.gates.filter((gate) => !gate.star && (gate.frozen ?? 0) > 0);
  const star = level.gates.filter((gate) => gate.star);
  const starFrozen = star.filter((gate) => (gate.frozen ?? 0) > 0);
  return {
    ordinaryCount: ordinary.length,
    frozenValues: sortedNumbers(frozen.map((gate) => gate.frozen!)),
    starCount: star.length,
    starFrozenValues: sortedNumbers(starFrozen.map((gate) => gate.frozen!)),
    flipDoorCount: level.flipDoors?.length ?? 0,
  };
};

const sameContract = (left: PaletteAwareExitContract, right: PaletteAwareExitContract): boolean => (
  left.ordinaryCount === right.ordinaryCount
  && JSON.stringify(left.frozenValues) === JSON.stringify(right.frozenValues)
  && left.starCount === right.starCount
  && JSON.stringify(left.starFrozenValues) === JSON.stringify(right.starFrozenValues)
  && left.flipDoorCount === right.flipDoorCount
);

const desiredSemantics = (level: LevelSpec, contract: PaletteAwareExitContract): ExitSemantic[] => {
  const canonical = canonicalById.get(level.id)!;
  const currentDoors = level.flipDoors ?? [];
  const canonicalDoors = canonical.flipDoors ?? [];
  const doorTemplates = currentDoors.length === contract.flipDoorCount ? currentDoors : canonicalDoors;
  if (doorTemplates.length !== contract.flipDoorCount) {
    throw new Error(`Lv${level.id}: flip-door source count ${doorTemplates.length} != truth ${contract.flipDoorCount}`);
  }
  return [
    ...Array.from({ length: contract.ordinaryCount }, (): ExitSemantic => ({ kind: "gate", frozen: 0, star: false })),
    ...contract.frozenValues.map((frozen): ExitSemantic => ({ kind: "gate", frozen, star: false })),
    ...Array.from({
      length: contract.starCount - contract.starFrozenValues.length,
    }, (): ExitSemantic => ({ kind: "gate", frozen: 0, star: true })),
    ...contract.starFrozenValues.map((frozen): ExitSemantic => ({ kind: "gate", frozen, star: true })),
    ...doorTemplates.map((door) => semanticOf(door, "flipDoor")),
  ];
};

const activePlayable = (level: LevelSpec): Set<string> => {
  const blocked = new Set((level.blocked ?? []).map(([x, y]) => pointKey(x, y)));
  const source = level.playable ?? Array.from({ length: level.width * level.height }, (_, index) => (
    [index % level.width, Math.floor(index / level.width)] as const
  ));
  return new Set(source
    .filter(([x, y]) => !blocked.has(pointKey(x, y)))
    .map(([x, y]) => pointKey(x, y)));
};

const railFor = (level: LevelSpec, side: Side, coordinate: number) => side === "top"
  ? { x: coordinate + 0.5, y: 0, quarterTurns: 0 as const }
  : side === "right"
    ? { x: level.width, y: coordinate + 0.5, quarterTurns: 1 as const }
    : side === "bottom"
      ? { x: coordinate + 0.5, y: level.height, quarterTurns: 2 as const }
      : { x: 0, y: coordinate + 0.5, quarterTurns: 3 as const };

const slotRailKeys = (level: LevelSpec, slot: Pick<ExitSlot, "side" | "offset" | "size">): string[] => (
  Array.from({ length: slot.size }, (_, index) => railKey(railFor(level, slot.side, slot.offset + index)))
);

const boundaryRailKeys = (level: LevelSpec): Set<string> => {
  const active = activePlayable(level);
  const result = new Set<string>();
  for (let x = 0; x < level.width; x += 1) {
    if (active.has(pointKey(x, 0))) result.add(railKey(railFor(level, "top", x)));
    if (active.has(pointKey(x, level.height - 1))) result.add(railKey(railFor(level, "bottom", x)));
  }
  for (let y = 0; y < level.height; y += 1) {
    if (active.has(pointKey(0, y))) result.add(railKey(railFor(level, "left", y)));
    if (active.has(pointKey(level.width - 1, y))) result.add(railKey(railFor(level, "right", y)));
  }
  return result;
};

const generatorRailKeys = (level: LevelSpec): Set<string> => new Set((level.generators ?? []).flatMap((generator) => {
  const quarterTurns = generator.side === "top" ? 0 : generator.side === "right" ? 1
    : generator.side === "bottom" ? 2 : 3;
  const anchor = generator.rimAnchor ?? (generator.side === "top" || generator.side === "bottom"
    ? { x: generator.offset + 0.5, y: generator.side === "top" ? 0 : level.height, quarterTurns }
    : { x: generator.side === "left" ? 0 : level.width, y: generator.offset + 0.5, quarterTurns });
  return buildGeneratorRimGeometry(anchor).reservedRails.map(railKey);
}));

const compareSlots = (left: ExitSlot, right: ExitSlot): number => (
  (SIDE_INDEX.get(left.side)! - SIDE_INDEX.get(right.side)!)
  || left.offset - right.offset
  || left.size - right.size
);

const currentSlots = (level: LevelSpec): ExitSlot[] => [
  ...level.gates.map((gate): ExitSlot => ({
    side: gate.side,
    offset: gate.offset,
    size: gate.size,
    currentColor: gate.color,
    currentSemantic: semanticOf(gate, "gate"),
  })),
  ...(level.flipDoors ?? []).map((door): ExitSlot => ({
    side: door.side,
    offset: door.offset,
    size: door.size,
    currentColor: door.color,
    currentSemantic: semanticOf(door, "flipDoor"),
  })),
].sort(compareSlots);

const layerRequirements = (level: LevelSpec): LayerRequirement[] => {
  const dynamicIds = new Set([
    ...(level.generators ?? []).flatMap((generator) => generator.queueBlockIds),
    ...(level.conveyors ?? []).map((conveyor) => conveyor.blockId),
    ...(level.elevators ?? []).map((elevator) => elevator.blockId),
  ]);
  return level.blocks.flatMap((block) => {
    const xs = block.shape.map(([x]) => x);
    const ys = block.shape.map(([, y]) => y);
    const shapeMinX = Math.min(...xs);
    const shapeMaxX = Math.max(...xs);
    const shapeMinY = Math.min(...ys);
    const shapeMaxY = Math.max(...ys);
    return (block.layers ?? [block.color]).map((color, layerIndex): LayerRequirement => ({
      blockId: block.id,
      layerIndex,
      color,
      starRequired: Boolean(block.star),
      movementAxis: block.movementAxis ?? null,
      width: shapeMaxX - shapeMinX + 1,
      height: shapeMaxY - shapeMinY + 1,
      minX: block.x + shapeMinX,
      maxX: block.x + shapeMaxX,
      minY: block.y + shapeMinY,
      maxY: block.y + shapeMaxY,
      dynamic: dynamicIds.has(block.id),
    }));
  });
};

const geometryCompatible = (requirement: LayerRequirement, slot: ExitSlot): boolean => {
  if (requirement.movementAxis === "horizontal" && slot.side !== "left" && slot.side !== "right") return false;
  if (requirement.movementAxis === "vertical" && slot.side !== "top" && slot.side !== "bottom") return false;
  if (slot.side === "top" || slot.side === "bottom") {
    if (slot.size < requirement.width) return false;
    if (requirement.movementAxis !== "vertical" || requirement.dynamic) return true;
    return requirement.minX >= slot.offset && requirement.maxX < slot.offset + slot.size;
  }
  if (slot.size < requirement.height) return false;
  if (requirement.movementAxis !== "horizontal" || requirement.dynamic) return true;
  return requirement.minY >= slot.offset && requirement.maxY < slot.offset + slot.size;
};

interface ColorCoverOption {
  color: BlockColor;
  slotIndices: number[];
  starSlotIndices: number[];
  preserveScore: number;
}

const fullMask = (length: number): bigint => (1n << BigInt(length)) - 1n;
const firstMissingBit = (mask: bigint, length: number): number => {
  for (let index = 0; index < length; index += 1) {
    if ((mask & (1n << BigInt(index))) === 0n) return index;
  }
  return -1;
};

const minimalSlotCovers = (
  requirements: readonly LayerRequirement[],
  slots: readonly ExitSlot[],
  allowedSlotIndices: readonly number[],
  maxSlots: number,
  maxResults = 120,
): number[][] => {
  if (!requirements.length) return [[]];
  const target = fullMask(requirements.length);
  const maskBySlot = new Map<number, bigint>();
  for (const slotIndex of allowedSlotIndices) {
    let mask = 0n;
    requirements.forEach((requirement, requirementIndex) => {
      if (geometryCompatible(requirement, slots[slotIndex]!)) mask |= 1n << BigInt(requirementIndex);
    });
    if (mask) maskBySlot.set(slotIndex, mask);
  }
  const results: number[][] = [];
  const visited = new Set<string>();
  const visit = (mask: bigint, chosen: number[]): void => {
    if (results.length >= maxResults || chosen.length > maxSlots) return;
    if (mask === target) {
      const minimal = chosen.every((slotIndex) => {
        const without = chosen.filter((candidate) => candidate !== slotIndex)
          .reduce((combined, candidate) => combined | maskBySlot.get(candidate)!, 0n);
        return without !== target;
      });
      if (minimal) results.push([...chosen].sort((left, right) => left - right));
      return;
    }
    const missing = firstMissingBit(mask, requirements.length);
    const candidates = [...maskBySlot.entries()]
      .filter(([slotIndex, slotMask]) => !chosen.includes(slotIndex) && (slotMask & (1n << BigInt(missing))) !== 0n)
      .sort((left, right) => {
        const leftGain = (left[1] & ~mask).toString(2).replaceAll("0", "").length;
        const rightGain = (right[1] & ~mask).toString(2).replaceAll("0", "").length;
        return rightGain - leftGain || left[0] - right[0];
      });
    for (const [slotIndex, slotMask] of candidates) {
      const nextChosen = [...chosen, slotIndex].sort((left, right) => left - right);
      const key = `${mask | slotMask}:${nextChosen.join(",")}`;
      if (visited.has(key)) continue;
      visited.add(key);
      visit(mask | slotMask, nextChosen);
    }
  };
  visit(0n, []);
  return results;
};

const colorCoverOptions = (
  color: BlockColor,
  requirements: readonly LayerRequirement[],
  slots: readonly ExitSlot[],
  maxSlots: number,
): ColorCoverOption[] => {
  const indices = slots.map((_, index) => index);
  const covers = minimalSlotCovers(requirements, slots, indices, maxSlots);
  const starRequirements = requirements.filter((requirement) => requirement.starRequired);
  return covers.flatMap((slotIndices): ColorCoverOption[] => {
    const starCovers = minimalSlotCovers(starRequirements, slots, slotIndices, slotIndices.length, 30);
    if (starRequirements.length && !starCovers.length) return [];
    return (starCovers.length ? starCovers : [[]]).map((starSlotIndices) => ({
      color,
      slotIndices,
      starSlotIndices,
      preserveScore: slotIndices.filter((index) => slots[index]!.currentColor === color).length,
    }));
  }).sort((left, right) => left.slotIndices.length - right.slotIndices.length
    || left.starSlotIndices.length - right.starSlotIndices.length
    || right.preserveScore - left.preserveScore);
};

interface ColorPlan {
  colorBySlot: Map<number, BlockColor>;
  requiredStarSlots: Set<number>;
  selectedSlotIndices: number[];
}

const buildColorPlan = (
  requirements: readonly LayerRequirement[],
  slots: readonly ExitSlot[],
  targetCount: number,
  starSemanticCount: number,
): ColorPlan | undefined => {
  const requiredColors = COLORS.filter((color) => requirements.some((requirement) => requirement.color === color));
  if (requiredColors.length > targetCount) return undefined;
  const uniqueRequired = targetCount <= COLORS.length;
  const maxRepeat = Math.max(0, targetCount - COLORS.length);
  const options = requiredColors.map((color) => {
    const rows = colorCoverOptions(
      color,
      requirements.filter((requirement) => requirement.color === color),
      slots,
      uniqueRequired ? 1 : Math.min(targetCount, 4),
    ).filter((option) => !uniqueRequired || option.slotIndices.length === 1);
    return { color, rows };
  }).sort((left, right) => left.rows.length - right.rows.length);
  if (options.some(({ rows }) => !rows.length)) return undefined;

  let best: { rows: ColorCoverOption[]; usedCount: number; preserveScore: number } | undefined;
  const used = new Set<number>();
  const chosen: ColorCoverOption[] = [];
  let nodes = 0;
  const visit = (index: number, starSlots: number, repeatCount: number, preserveScore: number): void => {
    nodes += 1;
    if (nodes > 400_000 || starSlots > starSemanticCount || repeatCount > maxRepeat) return;
    if (index === options.length) {
      if (used.size > targetCount) return;
      const candidate = { rows: [...chosen], usedCount: used.size, preserveScore };
      if (!best || candidate.usedCount < best.usedCount
        || (candidate.usedCount === best.usedCount && candidate.preserveScore > best.preserveScore)) best = candidate;
      return;
    }
    for (const row of options[index]!.rows) {
      if (row.slotIndices.some((slotIndex) => used.has(slotIndex))) continue;
      row.slotIndices.forEach((slotIndex) => used.add(slotIndex));
      chosen.push(row);
      visit(
        index + 1,
        starSlots + row.starSlotIndices.length,
        repeatCount + Math.max(0, row.slotIndices.length - 1),
        preserveScore + row.preserveScore,
      );
      chosen.pop();
      row.slotIndices.forEach((slotIndex) => used.delete(slotIndex));
    }
  };
  visit(0, 0, 0, 0);
  if (!best) return undefined;

  const colorBySlot = new Map<number, BlockColor>();
  const requiredStarSlots = new Set<number>();
  for (const row of best.rows) {
    row.slotIndices.forEach((slotIndex) => colorBySlot.set(slotIndex, row.color));
    row.starSlotIndices.forEach((slotIndex) => requiredStarSlots.add(slotIndex));
  }
  const selected = new Set(colorBySlot.keys());
  const fillerSlots = slots.map((_, index) => index).filter((index) => !selected.has(index));
  while (selected.size < targetCount && fillerSlots.length) selected.add(fillerSlots.shift()!);
  if (selected.size !== targetCount) return undefined;

  const usedColors = new Set(colorBySlot.values());
  for (const slotIndex of [...selected].filter((index) => !colorBySlot.has(index))) {
    const preferred = slots[slotIndex]!.currentColor;
    const unused = COLORS.filter((color) => !usedColors.has(color));
    const color = preferred && unused.includes(preferred) ? preferred
      : unused[0] ?? preferred ?? COLORS[slotIndex % COLORS.length]!;
    colorBySlot.set(slotIndex, color);
    usedColors.add(color);
  }
  const duplicates = targetCount - new Set(colorBySlot.values()).size;
  if (targetCount <= COLORS.length && duplicates !== 0) return undefined;
  if (targetCount > COLORS.length && duplicates !== targetCount - COLORS.length) return undefined;
  return { colorBySlot, requiredStarSlots, selectedSlotIndices: [...selected].sort((a, b) => a - b) };
};

const semanticFrozen = (semantic: ExitSemantic): number => semantic.frozen > 0 ? semantic.frozen : 0;
const semanticSimilarity = (semantic: ExitSemantic, current?: ExitSemantic): number => current
  ? Number(semantic.kind === current.kind) * 4
    + Number(semantic.star === current.star) * 2
    + Number(semantic.frozen === current.frozen)
  : 0;

const assignSemantics = (
  requirements: readonly LayerRequirement[],
  slots: readonly ExitSlot[],
  plan: ColorPlan,
  semantics: readonly ExitSemantic[],
): Map<number, ExitSemantic> | undefined => {
  const remaining = [...semantics];
  const result = new Map<number, ExitSemantic>();
  const totalLayers = requirements.length;
  const threshold = (slotIndex: number): number => {
    const color = plan.colorBySlot.get(slotIndex)!;
    return totalLayers - requirements.filter((requirement) => requirement.color === color).length;
  };
  const takeBest = (slotIndex: number, predicate: (semantic: ExitSemantic) => boolean): ExitSemantic | undefined => {
    const candidates = remaining
      .map((semantic, index) => ({ semantic, index }))
      .filter(({ semantic }) => predicate(semantic))
      .sort((left, right) => semanticFrozen(left.semantic) - semanticFrozen(right.semantic)
        || semanticSimilarity(right.semantic, slots[slotIndex]!.currentSemantic)
          - semanticSimilarity(left.semantic, slots[slotIndex]!.currentSemantic));
    const best = candidates[0];
    if (!best) return undefined;
    remaining.splice(best.index, 1);
    return best.semantic;
  };

  const starSlots = [...plan.requiredStarSlots].sort((left, right) => threshold(left) - threshold(right));
  for (const slotIndex of starSlots) {
    const semantic = takeBest(slotIndex, (candidate) => candidate.star);
    if (!semantic) return undefined;
    result.set(slotIndex, semantic);
  }

  const requiredColors = new Set(requirements.map((requirement) => requirement.color));
  const primarySlots = [...requiredColors].flatMap((color) => {
    const coloredSlots = plan.selectedSlotIndices.filter((slotIndex) => plan.colorBySlot.get(slotIndex) === color);
    if (coloredSlots.some((slotIndex) => result.has(slotIndex))) return [];
    return coloredSlots.length ? [coloredSlots[0]!] : [];
  }).sort((left, right) => threshold(left) - threshold(right));
  for (const slotIndex of primarySlots) {
    const semantic = takeBest(slotIndex, () => true);
    if (!semantic) return undefined;
    result.set(slotIndex, semantic);
  }

  const remainingSlots = plan.selectedSlotIndices.filter((slotIndex) => !result.has(slotIndex));
  for (const slotIndex of remainingSlots) {
    const candidates = remaining
      .map((semantic, index) => ({ semantic, index }))
      .sort((left, right) => semanticSimilarity(right.semantic, slots[slotIndex]!.currentSemantic)
        - semanticSimilarity(left.semantic, slots[slotIndex]!.currentSemantic)
        || semanticFrozen(right.semantic) - semanticFrozen(left.semantic));
    const best = candidates[0];
    if (!best) return undefined;
    remaining.splice(best.index, 1);
    result.set(slotIndex, best.semantic);
  }
  return remaining.length ? undefined : result;
};

const buildExit = (
  levelId: number,
  slot: ExitSlot,
  color: BlockColor,
  semantic: ExitSemantic,
  index: number,
): NonNullable<LevelSpec["flipDoors"]>[number] => ({
  id: `palette-exit-lv${String(levelId).padStart(3, "0")}-${semantic.kind === "gate" ? "g" : "d"}-${String(index + 1).padStart(2, "0")}`,
  side: slot.side,
  offset: slot.offset,
  size: slot.size,
  color,
  ...(semantic.frozen > 0 ? { frozen: semantic.frozen } : {}),
  ...(semantic.star ? { star: true } : {}),
  initiallyOpen: semantic.kind === "flipDoor" ? Boolean(semantic.initiallyOpen) : true,
});

export const paletteAwareMissingExitRequirements = (level: LevelSpec): LayerRequirement[] => {
  const exits = [...level.gates, ...(level.flipDoors ?? [])];
  return layerRequirements(level).filter((requirement) => !exits.some((exit) => (
    exit.color === requirement.color
    && (!requirement.starRequired || Boolean(exit.star))
    && geometryCompatible(requirement, exit)
  )));
};

export interface PaletteAwareFrozenDeadlock {
  color: BlockColor;
  minimumFrozen: number;
  maximumPriorOtherClears: number;
}

export const paletteAwareFrozenDeadlocks = (level: LevelSpec): PaletteAwareFrozenDeadlock[] => {
  const requirements = layerRequirements(level);
  const exits = [...level.gates, ...(level.flipDoors ?? [])];
  return COLORS.flatMap((color): PaletteAwareFrozenDeadlock[] => {
    const colorRequirements = requirements.filter((requirement) => requirement.color === color);
    if (!colorRequirements.length) return [];
    const compatible = exits.filter((exit) => exit.color === color && colorRequirements.some((requirement) => (
      (!requirement.starRequired || Boolean(exit.star)) && geometryCompatible(requirement, exit)
    )));
    if (!compatible.length || compatible.some((exit) => (exit.frozen ?? 0) <= 0)) return [];
    const minimumFrozen = Math.min(...compatible.map((exit) => exit.frozen!));
    const maximumPriorOtherClears = requirements.length - colorRequirements.length;
    return minimumFrozen > maximumPriorOtherClears ? [{ color, minimumFrozen, maximumPriorOtherClears }] : [];
  });
};

const openingIds = (level: LevelSpec): string[] => {
  const queued = new Set((level.generators ?? []).flatMap((generator) => generator.queueBlockIds));
  const closed = new Set((level.shutters ?? []).filter((shutter) => shutter.count > 0).map((shutter) => shutter.id));
  return level.blocks.filter((block) => (
    !queued.has(block.id) && !(block.shutterId && closed.has(block.shutterId))
  )).map((block) => block.id).sort();
};

export const buildPaletteAwareExitCandidate = (source: LevelSpec): PaletteAwareExitCandidateResult => {
  if (EXCLUDED_IDS.has(source.id)) {
    return { levelId: source.id, status: "excluded", source, level: source, issues: [] };
  }
  const contract = paletteAwareExitContractFor(source.id);
  if (!contract) {
    return { levelId: source.id, status: "source-missing", source, level: source, issues: [] };
  }
  const beforeContract = currentContract(source);
  if (sameContract(beforeContract, contract)) {
    return { levelId: source.id, status: "unchanged", source, level: source, contract, issues: [] };
  }

  const semantics = desiredSemantics(source, contract);
  const currentTotal = source.gates.length + (source.flipDoors?.length ?? 0);
  const mode = semantics.length > currentTotal ? "add-exits"
    : semantics.length < currentTotal ? "remove-exits" : "same-total-reclassification";
  const boundary = boundaryRailKeys(source);
  const reserved = generatorRailKeys(source);
  const slots = currentSlots(source).filter((slot) => (
    slotRailKeys(source, slot).every((key) => boundary.has(key) && !reserved.has(key))
  ));
  const occupied = new Set(slots.flatMap((slot) => slotRailKeys(source, slot)));
  if (semantics.length > slots.length) {
    for (const side of SIDE_ORDER) {
      const limit = side === "top" || side === "bottom" ? source.width : source.height;
      for (let offset = 0; offset < limit && slots.length < semantics.length; offset += 1) {
        const slot: ExitSlot = { side, offset, size: 1 };
        const key = slotRailKeys(source, slot)[0]!;
        if (!boundary.has(key) || reserved.has(key) || occupied.has(key)) continue;
        slots.push(slot);
        occupied.add(key);
      }
    }
  }
  slots.sort(compareSlots);
  if (slots.length < semantics.length) {
    return {
      levelId: source.id, status: "rejected", source, level: source, contract, mode,
      issues: [`only ${slots.length} legal exit slots for ${semantics.length} truth exits`],
    };
  }

  const requirements = layerRequirements(source);
  const starSemanticCount = semantics.filter((semantic) => semantic.star).length;
  const plan = buildColorPlan(requirements, slots, semantics.length, starSemanticCount);
  if (!plan) {
    return {
      levelId: source.id, status: "rejected", source, level: source, contract, mode,
      issues: ["no palette/geometry set-cover satisfies the uniqueness and star constraints"],
    };
  }
  const assignment = assignSemantics(requirements, slots, plan, semantics);
  if (!assignment) {
    return {
      levelId: source.id, status: "rejected", source, level: source, contract, mode,
      issues: ["truth exit classifications cannot cover all required star colors"],
    };
  }

  const exits = plan.selectedSlotIndices.map((slotIndex, index) => buildExit(
    source.id,
    slots[slotIndex]!,
    plan.colorBySlot.get(slotIndex)!,
    assignment.get(slotIndex)!,
    index,
  ));
  const gates = exits.filter((_, index) => assignment.get(plan.selectedSlotIndices[index]!)!.kind === "gate")
    .map(({ initiallyOpen: _ignored, ...gate }) => gate);
  const flipDoors = exits.filter((_, index) => assignment.get(plan.selectedSlotIndices[index]!)!.kind === "flipDoor");
  const candidate: LevelSpec = {
    ...source,
    gates,
    ...(flipDoors.length ? { flipDoors } : { flipDoors: undefined }),
  };

  const issues: string[] = [];
  if (!sameContract(currentContract(candidate), contract)) issues.push("candidate does not match the exact exit contract");
  const missing = paletteAwareMissingExitRequirements(candidate);
  if (missing.length) issues.push(`${missing.length} block layer(s) have no compatible exit`);
  const deadlocks = paletteAwareFrozenDeadlocks(candidate);
  if (deadlocks.length) issues.push(`frozen exit deadlock: ${deadlocks.map(({ color }) => color).join(",")}`);
  if (candidate.blocks !== source.blocks || candidate.shutters !== source.shutters) issues.push("blocks/shutters identity changed");
  if (JSON.stringify(openingIds(candidate)) !== JSON.stringify(openingIds(source))) issues.push("opening cohort changed");
  const baselineGeneratorIssues = new Set(finalGeneratorPlacementIssues(source));
  const newGeneratorIssues = finalGeneratorPlacementIssues(candidate).filter((issue) => !baselineGeneratorIssues.has(issue));
  if (newGeneratorIssues.length) issues.push(...newGeneratorIssues);
  try {
    validateLevel(candidate);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
  }
  if (issues.length) {
    return { levelId: source.id, status: "rejected", source, level: source, contract, mode, issues };
  }
  return { levelId: source.id, status: "candidate", source, level: candidate, contract, mode, issues: [] };
};

/** Applies only the solver/replay-certified batch in the final runtime chain. */
export const applyPaletteAwareExitContracts = (source: LevelSpec): LevelSpec => {
  const packed = PALETTE_AWARE_EXIT_PACKED_PATCHES[source.id];
  if (!packed) return source;
  if (packed.length % 6 !== 0) throw new Error(`Lv${source.id}: invalid packed exit contract`);
  const gates: GateSpec[] = [];
  const flipDoors: NonNullable<LevelSpec["flipDoors"]> = [];
  for (let cursor = 0, exitIndex = 0; cursor < packed.length; cursor += 6, exitIndex += 1) {
    const digit = (offset: number): number => Number.parseInt(packed[cursor + offset]!, 36);
    const side = SIDE_ORDER[digit(0)];
    const color = COLORS[digit(3)];
    if (!side || !color) throw new Error(`Lv${source.id}: invalid packed exit enum`);
    const flags = digit(5);
    const door = (flags & 2) !== 0;
    const exit = {
      id: `palette-exit-lv${String(source.id).padStart(3, "0")}-${door ? "d" : "g"}-${String(exitIndex + 1).padStart(2, "0")}`,
      side,
      offset: digit(1),
      size: digit(2),
      color,
      ...(digit(4) > 0 ? { frozen: digit(4) } : {}),
      ...((flags & 1) !== 0 ? { star: true } : {}),
    };
    if (door) flipDoors.push({ ...exit, initiallyOpen: (flags & 4) !== 0 });
    else gates.push(exit);
  }
  return { ...source, gates, ...(flipDoors.length ? { flipDoors } : { flipDoors: undefined }) };
};
