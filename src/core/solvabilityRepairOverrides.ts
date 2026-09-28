import type { BlockColor, GateSpec, LevelSpec, Point, Side, ShutterSpec } from "./types";

/**
 * Levels that were explicitly classified as either proven-unsat or
 * inconclusive by the 2026-09-18 campaign solver audit.  The source video
 * data remains intact; the executable campaign applies a reversible repair
 * overlay to this set only.
 */
export const SOLVABILITY_REPAIR_LEVEL_IDS = [
  24, 26, 30, 32, 34, 38, 39, 47, 64, 70, 73, 87, 90, 92, 95, 101, 102, 104,
  109, 110, 111, 113, 118, 119, 120, 121, 122, 123, 126, 128, 129, 131, 132,
  133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147,
  148, 149, 151, 153, 154, 155, 157, 159, 160, 161, 162, 163, 164, 165, 166,
  167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181,
  182, 183, 184, 185, 186, 188, 189, 190, 191, 192, 194, 195, 196, 197, 198,
  199, 200,
] as const;

const REPAIR_LEVEL_SET = new Set<number>(SOLVABILITY_REPAIR_LEVEL_IDS);

export const SOLVABILITY_REPAIR_POLICY_VERSION = "opening-preserving-staging-v2" as const;

/** Number of authored pieces intentionally visible at the repaired opening. */
export const SOLVABILITY_REPAIR_OPENING_VISIBLE_COUNT = 3 as const;

/** Fallbacks that retain source coordinates and only add sequential staging. */
export const SOLVABILITY_REPAIR_MINIMAL_LEVEL_IDS = [
  24, 26, 30, 32, 34, 38, 47, 87, 92, 95, 101, 102, 104, 109, 111, 113, 120, 121, 122,
  123, 126, 128, 131, 133, 135, 136, 138, 139, 140, 141, 142, 143, 144, 145,
  146, 147, 148, 149, 151, 157, 159, 160, 162, 163, 164, 165, 166, 167, 168,
  169, 170, 171, 172, 173, 174, 176, 178, 181, 182, 184, 185, 190, 191, 192,
  195, 196, 199, 200,
] as const;

/** Dense/irregular fallbacks that require the edge-rack position repair. */
export const SOLVABILITY_REPAIR_EDGE_LEVEL_IDS = [
  39, 64, 70, 73, 90, 110, 118, 119, 129, 132, 134, 137, 154,
  155, 161, 175, 177, 179, 180, 183, 186, 188, 189, 194, 197, 198,
] as const;

const MINIMAL_REPAIR_LEVEL_SET = new Set<number>(SOLVABILITY_REPAIR_MINIMAL_LEVEL_IDS);

export const isSolvabilityRepairLevel = (levelOrId: Pick<LevelSpec, "id"> | number): boolean => (
  REPAIR_LEVEL_SET.has(typeof levelOrId === "number" ? levelOrId : levelOrId.id)
);

type GateBin = {
  side: Side;
  capacity: number;
  used: number;
};

type ColorPlan = {
  color: BlockColor;
  span: number;
  star: boolean;
  side: Side;
  offset: number;
};

const boundsFor = (shape: readonly Point[]): {
  minX: number;
  minY: number;
  width: number;
  height: number;
} => {
  const xs = shape.map(([x]) => x);
  const ys = shape.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1 };
};

const normalizedShape = (shape: readonly Point[]): Point[] => {
  const { minX, minY } = boundsFor(shape);
  return shape.map(([x, y]) => [x - minX, y - minY] as const);
};

const layerColors = (block: LevelSpec["blocks"][number]): BlockColor[] => (
  block.layers?.length ? [...block.layers] : [block.color]
);

/**
 * Build a deterministic one-gate-per-colour plan.  The largest pieces are
 * placed first so a side never receives an interval that is too short for a
 * preserved piece footprint.  A colour may occur in more than one layer, but
 * still receives exactly one exit as required by the campaign contract.
 */
const planGates = (level: LevelSpec): Map<BlockColor, ColorPlan> => {
  const colors = [...new Set(level.blocks.flatMap(layerColors))];
  const starColors = new Set(
    level.blocks.filter((block) => block.star).flatMap(layerColors),
  );
  const spans = colors.map((color) => {
    const matching = level.blocks.filter((block) => layerColors(block).includes(color));
    const span = Math.max(...matching.map((block) => {
      const bounds = boundsFor(block.shape);
      return Math.max(bounds.width, bounds.height);
    }));
    return { color, span, star: starColors.has(color) };
  }).sort((a, b) => b.span - a.span || a.color.localeCompare(b.color));

  const bins: GateBin[] = [
    { side: "top", capacity: level.width, used: 0 },
    { side: "bottom", capacity: level.width, used: 0 },
    { side: "left", capacity: level.height, used: 0 },
    { side: "right", capacity: level.height, used: 0 },
  ];
  const plans = new Map<BlockColor, ColorPlan>();
  for (const entry of spans) {
    const candidates = bins
      .filter((bin) => bin.used + entry.span <= bin.capacity)
      .sort((a, b) => (b.capacity - b.used) - (a.capacity - a.used));
    const bin = candidates[0];
    if (!bin) {
      throw new Error(`Lv${level.id}: cannot pack a repair exit for ${entry.color} span ${entry.span}`);
    }
    const offset = bin.used;
    bin.used += entry.span;
    plans.set(entry.color, {
      color: entry.color,
      span: entry.span,
      star: entry.star,
      side: bin.side,
      offset,
    });
  }
  return plans;
};

const gateFor = (level: LevelSpec, plan: ColorPlan): GateSpec => ({
  id: `solvability-repair-gate-${level.id}-${plan.color}`,
  side: plan.side,
  offset: plan.offset,
  size: plan.span,
  color: plan.color,
  ...(plan.star ? { star: true } : {}),
});

const chooseOpeningVisibleIds = (
  blocks: readonly LevelSpec["blocks"][number][],
): Set<string> => {
  const cellSet = (block: LevelSpec["blocks"][number]): Set<string> => new Set(
    block.shape.map(([dx, dy]) => `${block.x + dx},${block.y + dy}`),
  );
  const singleton = (block: LevelSpec["blocks"][number]): boolean => (
    block.shape.length === 1 && block.shape[0]?.[0] === 0 && block.shape[0]?.[1] === 0
  );
  const outerColor = (block: LevelSpec["blocks"][number]): BlockColor => layerColors(block)[0]!;
  const touches = (a: LevelSpec["blocks"][number], b: LevelSpec["blocks"][number]): boolean => {
    const bCells = cellSet(b);
    return [...cellSet(a)].some((key) => {
      const [x, y] = key.split(",").map(Number);
      return bCells.has(`${x + 1},${y}`)
        || bCells.has(`${x - 1},${y}`)
        || bCells.has(`${x},${y + 1}`)
        || bCells.has(`${x},${y - 1}`);
    });
  };
  const compatible = (
    candidate: LevelSpec["blocks"][number],
    selected: readonly LevelSpec["blocks"][number][],
  ): boolean => {
    const candidateCells = cellSet(candidate);
    return selected.every((other) => {
      if ([...candidateCells].some((cell) => cellSet(other).has(cell))) return false;
      // A visible 1x1 may not start touching a same-colour piece.  This is
      // checked at the opening only; later staged releases can legitimately
      // create ordinary same-colour adjacency.
      if ((singleton(candidate) || singleton(other)) && outerColor(candidate) === outerColor(other)) {
        return !touches(candidate, other);
      }
      return true;
    });
  };
  // Search the small opening set rather than greedily taking the first three
  // source blocks.  The latter can expose a same-colour singleton chain even
  // when a three-piece opening satisfying the contract exists later in the
  // authored order.  Non-singletons are preferred to keep the opening dense.
  const candidates = blocks
    .map((block, index) => ({ block, index }))
    .sort((a, b) => Number(singleton(a.block)) - Number(singleton(b.block)) || a.index - b.index)
    .map(({ block }) => block);
  const search = (
    start: number,
    selected: LevelSpec["blocks"][number][],
  ): LevelSpec["blocks"][number][] | undefined => {
    if (selected.length >= SOLVABILITY_REPAIR_OPENING_VISIBLE_COUNT) return selected;
    for (let index = start; index < candidates.length; index += 1) {
      const candidate = candidates[index]!;
      if (!compatible(candidate, selected)) continue;
      const result = search(index + 1, [...selected, candidate]);
      if (result) return result;
    }
    return undefined;
  };
  const selected = search(0, []) ?? [];
  const visible = new Set(selected.map((block) => block.id));
  // A pathological source can have fewer than three disjoint pieces.  Keep
  // the contract valid rather than manufacturing cells or changing shapes.
  if (visible.size === 0 && blocks[0]) visible.add(blocks[0].id);
  return visible;
};

const placedBlock = (
  level: LevelSpec,
  block: LevelSpec["blocks"][number],
  plan: ColorPlan,
): LevelSpec["blocks"][number] => {
  const shape = normalizedShape(block.shape);
  const bounds = boundsFor(shape);
  const x = plan.side === "left"
    ? 0
    : plan.side === "right"
      ? level.width - bounds.width
      : plan.offset;
  const y = plan.side === "top"
    ? 0
    : plan.side === "bottom"
      ? level.height - bounds.height
      : plan.offset;
  const { frozen: _frozen, lockedBy: _lockedBy, lockCount: _lockCount, shutterId: _shutterId, ...preserved } = block;
  return {
    ...preserved,
    x,
    y,
    shape,
    // Keep an authored arrow only when the repaired exit remains on its
    // permitted axis.  The fallback itself never introduces a new arrow
    // mechanic (important for the early campaign milestones).
    movementAxis: block.movementAxis
      && ((block.movementAxis === "horizontal" && (plan.side === "left" || plan.side === "right"))
        || (block.movementAxis === "vertical" && (plan.side === "top" || plan.side === "bottom")))
      ? block.movementAxis
      : undefined,
  };
};

const repairedBase = (
  level: LevelSpec,
  plans: Map<BlockColor, ColorPlan>,
): { level: LevelSpec; blocks: LevelSpec["blocks"][number][]; shutters: ShutterSpec[] } => {
  const placed = level.blocks.map((block) => {
    const outerColor = layerColors(block)[0]!;
    const plan = plans.get(outerColor);
    if (!plan) throw new Error(`Lv${level.id}: missing repair plan for ${outerColor}`);
    return placedBlock(level, block, plan);
  });
  const visibleIds = chooseOpeningVisibleIds(placed);
  const hiddenIds = new Map<string, string>();
  placed.forEach((block) => {
    if (!visibleIds.has(block.id)) hiddenIds.set(block.id, `solvability-repair-stage-${level.id}-${hiddenIds.size + 1}`);
  });
  const blocks = placed.map((block) => visibleIds.has(block.id)
    ? block
    : { ...block, shutterId: hiddenIds.get(block.id)! });
  const hidden = blocks.filter((block) => Boolean(block.shutterId));
  const shutters: ShutterSpec[] = hidden.map((block, index) => ({
    id: block.shutterId!,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    count: index + 1,
    skin: "staging",
  }));
  const authoredPlayable = new Set((level.playable ?? []).map(([x, y]) => `${x},${y}`));
  const authoredBlocked = new Set((level.blocked ?? []).map(([x, y]) => `${x},${y}`));
  const canRetainBoardMask = Boolean(level.playable)
    && blocks.every((block) => block.shape.every(([dx, dy]) => {
      const key = `${block.x + dx},${block.y + dy}`;
      return authoredPlayable.has(key) && !authoredBlocked.has(key);
    }));
  return {
    level: {
      ...level,
      // Keep an authored irregular/partial board whenever the repaired
      // placements still fit it.  Only pathological placements fall back to
      // the rectangular runtime board, and that decision is recorded by the
      // report tool as a board-mask change.
      playable: canRetainBoardMask ? level.playable : undefined,
      blocked: canRetainBoardMask ? level.blocked : undefined,
      coloredGrids: undefined,
      flipDoors: undefined,
      generators: undefined,
      elevators: undefined,
      conveyors: undefined,
      gates: [...plans.values()].map((plan) => gateFor(level, plan)),
      blocks,
      shutters,
    },
    blocks,
    shutters,
  };
};

/**
 * Keep the competitor's authored footprint for the ordinary fallback set.
 * Only blocking metadata is relaxed; hidden pieces are released one at a
 * time through non-physical staging shutters so the source silhouette stays
 * recognizable and the opening never collapses to a singleton.
 */
const minimalSourceStageRepair = (
  level: LevelSpec,
  plans: Map<BlockColor, ColorPlan>,
): LevelSpec => {
  const cleaned = level.blocks.map((block) => {
    const {
      frozen: _frozen,
      lockedBy: _lockedBy,
      lockCount: _lockCount,
      shutterId: _shutterId,
      movementAxis: _movementAxis,
      ...preserved
    } = block;
    return {
      ...preserved,
      shape: normalizedShape(block.shape),
    };
  });
  const visibleIds = chooseOpeningVisibleIds(cleaned);
  const hiddenIds = new Map<string, string>();
  cleaned.forEach((block) => {
    if (!visibleIds.has(block.id)) hiddenIds.set(block.id, `solvability-minimal-stage-${level.id}-${hiddenIds.size + 1}`);
  });
  const blocks = cleaned.map((block) => visibleIds.has(block.id)
    ? block
    : { ...block, shutterId: hiddenIds.get(block.id)! });
  const shutters: ShutterSpec[] = blocks
    .map((block) => ({ block, shutterId: "shutterId" in block ? block.shutterId : undefined }))
    .filter(({ shutterId }) => Boolean(shutterId))
    .map(({ shutterId }, index) => ({
      id: shutterId!,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      count: index + 1,
      skin: "staging" as const,
    }));
  return {
    ...level,
    // A rectangular runtime mask is the smallest safe adjustment for these
    // generated fallbacks: their authored mask contains void pockets that
    // otherwise make otherwise-valid source pieces permanently unreachable.
    playable: undefined,
    blocked: undefined,
    coloredGrids: undefined,
    flipDoors: undefined,
    generators: undefined,
    elevators: undefined,
    conveyors: undefined,
    gates: [...plans.values()].map((plan) => gateFor(level, plan)),
    blocks,
    shutters,
  };
};

/**
 * Lv70 keeps a real timed dispenser in the repaired contract.  Only its
 * first queued piece remains queued; the rest use the same sequential staging
 * corridor as the fallback.  This retains the first-use timing rule while
 * removing the impossible multi-queue spawn geometry.
 */
const repairTimedGeneratorLevel = (level: LevelSpec, plans: Map<BlockColor, ColorPlan>): LevelSpec => {
  const base = repairedBase(level, plans);
  const queueBlock = base.blocks[1];
  if (!queueBlock) return base.level;
  const queueId = queueBlock.id;
  const blocks = base.blocks.map((block, index) => {
    if (index === 1) {
      const { shutterId: _shutterId, ...visibleQueue } = block;
      return visibleQueue;
    }
    return block;
  });
  const generators = (level.generators ?? []).slice(0, 1).map((generator) => ({
    ...generator,
    spawn: [queueBlock.x, queueBlock.y] as Point,
    queueBlockIds: [queueId],
    trigger: "time" as const,
    intervalSeconds: generator.intervalSeconds ?? 1,
    initialDelaySeconds: generator.initialDelaySeconds ?? generator.intervalSeconds ?? 1,
  }));
  const shutters = base.shutters
    .filter((shutter) => shutter.id !== `solvability-repair-stage-${level.id}-1`)
    .map((shutter) => ({ ...shutter, count: Math.max(1, shutter.count - 1) }));
  return { ...base.level, blocks, shutters, generators };
};

/**
 * Lv73 retains a genuine staged-frame transition.  The frame is made
 * non-spatial (full-board) so it cannot introduce a second deadlock, while
 * the original visible feature and one exact trigger cohort remain intact.
 */
const repairStagedFrameLevel = (level: LevelSpec, plans: Map<BlockColor, ColorPlan>): LevelSpec => {
  const base = repairedBase(level, plans);
  // `chooseOpeningVisibleIds` is deliberately geometry-aware, so the second
  // authored block is not guaranteed to be staged anymore.  Select an actual
  // staged block instead of assuming an array index; otherwise replacing a
  // visible block would leave its old stage shutter orphaned (and validation
  // would report a missing `solvability-repair-stage-*` reference).
  const hidden = base.blocks.find((block) => (
    typeof block.shutterId === "string"
    && block.shutterId.startsWith(`solvability-repair-stage-${level.id}-`)
  ));
  const trigger = base.blocks.find((block) => !block.shutterId) ?? base.blocks[0];
  if (!hidden || !trigger) return base.level;
  const frameId = `solvability-repair-frame-${level.id}`;
  const blocks = base.blocks.map((block) => block.id === hidden.id
    ? { ...block, shutterId: frameId }
    : block);
  const shutters = base.shutters
    .filter((shutter) => shutter.id !== hidden.shutterId)
    .map((shutter) => ({ ...shutter, count: Math.max(1, shutter.count - 1) }))
    .concat({
      id: frameId,
      x: 0,
      y: 0,
      width: level.width,
      height: level.height,
      count: 1,
      skin: "staged-frame",
      triggerBlockIds: [trigger.id],
    });
  return { ...base.level, blocks, shutters };
};

/**
 * Deterministic fallback for pathological generated layouts.  It keeps the
 * board dimensions, block ids/count, colours, layer stacks, shapes, stars,
 * timing metadata, rewards and difficulty targets.  Only the unsatisfiable
 * spatial/mechanism shell is replaced by a non-physical sequential lift
 * corridor, then every preserved piece receives one compatible exit.
 *
 * This is deliberately an overlay rather than a rewrite of generated video
 * data: removing the overlay restores the exact supplied layout, and the
 * report tool records the before/after semantic hashes and field diffs.
 */
/**
 * Apply the deterministic staging-corridor repair to a caller-selected
 * level.  The campaign normally uses the guarded `repairLevelForSolvability`
 * export below; the explicit entry point is used by later, narrowly scoped
 * data-quality overlays when a color-only edit needs the same proven escape
 * contract.  It intentionally keeps all authored block ids/shapes and only
 * replaces the spatial shell, just like the original repair policy.
 */
export const forceSolvabilityRepair = (level: LevelSpec): LevelSpec => {
  if (level.gates.length > 0 && level.gates.every((gate) => (
    gate.id.startsWith("solvability-repair-gate-")
    || gate.id.startsWith("solvability-minimal-gate-")
  ))) return level;

  const plans = planGates(level);
  if (MINIMAL_REPAIR_LEVEL_SET.has(level.id)) return minimalSourceStageRepair(level, plans);
  if (level.id === 70) return repairTimedGeneratorLevel(level, plans);
  if (level.id === 73) return repairStagedFrameLevel(level, plans);
  return repairedBase(level, plans).level;
};

export const repairLevelForSolvability = (level: LevelSpec): LevelSpec => {
  if (!isSolvabilityRepairLevel(level)) return level;
  return forceSolvabilityRepair(level);
};
