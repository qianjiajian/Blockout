import {
  COLORS,
  type BlockColor,
  type GatePortalSpec,
  type GateSpec,
  type LevelSpec,
  type MovementAxis,
  type Point,
  type Side,
} from "./types";
import {
  mirrorGatePortalHorizontally,
  mirrorGatePortalVertically,
  portalTangentOffset,
  rotateGatePortalClockwise,
  gatePortalMouthCells,
} from "./gatePortals";
import { GAME_ART } from "../game/artManifest";
import { matchFormalBlockShapeForLevel } from "../game/formalBlockShapes";

/**
 * Daily slots are derived copies, never references to a mutable campaign map.
 * Compatible board symmetries and colour permutations apply to the complete
 * LevelSpec, including exits, hidden areas and mechanism anchors. This is
 * adaptation logic, not proof of layout independence or puzzle difficulty.
 */
export type DailyVariantTransform = "identity" | "mirror-x" | "mirror-y" | "rotate-180" | "rotate-90" | "rotate-270" | "transpose";

const TRANSFORMS: readonly DailyVariantTransform[] = [
  // Prefer a spatial variant, subject to complete native artwork coverage.
  // dailyVariantForSource can retain the source orientation when none fits;
  // such a fallback is not evidence of an independently authored layout.
  "mirror-x", "mirror-y", "rotate-180", "rotate-90", "rotate-270", "transpose",
];

const hashString = (value: string): number => {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const transformPoint = (x: number, y: number, width: number, height: number, transform: DailyVariantTransform): Point => {
  if (transform === "mirror-x") return [width - 1 - x, y];
  if (transform === "mirror-y") return [x, height - 1 - y];
  if (transform === "rotate-180") return [width - 1 - x, height - 1 - y];
  if (transform === "rotate-90") return [height - 1 - y, x];
  if (transform === "rotate-270") return [y, width - 1 - x];
  if (transform === "transpose") return [y, x];
  return [x, y];
};

const transformedDimensions = (width: number, height: number, transform: DailyVariantTransform): [number, number] => (
  transform === "rotate-90" || transform === "rotate-270" || transform === "transpose"
    ? [height, width] : [width, height]
);

const transformSide = (side: Side, transform: DailyVariantTransform): Side => {
  const maps: Record<DailyVariantTransform, Record<Side, Side>> = {
    identity: { top: "top", right: "right", bottom: "bottom", left: "left" },
    "mirror-x": { top: "top", right: "left", bottom: "bottom", left: "right" },
    "mirror-y": { top: "bottom", right: "right", bottom: "top", left: "left" },
    "rotate-180": { top: "bottom", right: "left", bottom: "top", left: "right" },
    "rotate-90": { top: "right", right: "bottom", bottom: "left", left: "top" },
    "rotate-270": { top: "left", right: "top", bottom: "right", left: "bottom" },
    transpose: { top: "left", right: "bottom", bottom: "right", left: "top" },
  };
  return maps[transform][side];
};

const transformPortal = (portal: GatePortalSpec, width: number, height: number, transform: DailyVariantTransform): GatePortalSpec => {
  if (transform === "identity") return { ...portal, origin: [...portal.origin] as Point };
  if (transform === "mirror-x") return mirrorGatePortalHorizontally(portal, width);
  if (transform === "mirror-y") return mirrorGatePortalVertically(portal, height);
  if (transform === "rotate-180") return mirrorGatePortalHorizontally(mirrorGatePortalVertically(portal, height), width);
  if (transform === "rotate-90") return rotateGatePortalClockwise(portal, height);
  if (transform === "rotate-270") {
    return rotateGatePortalClockwise(rotateGatePortalClockwise(rotateGatePortalClockwise(portal, height), width), height);
  }
  return mirrorGatePortalHorizontally(rotateGatePortalClockwise(portal, height), height);
};

const normalizePlacement = (cells: readonly Point[]): { x: number; y: number; shape: Point[] } => {
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return {
    x: minX,
    y: minY,
    shape: cells.map(([x, y]) => [x - minX, y - minY] as Point),
  };
};

const transformPlacement = (x: number, y: number, shape: readonly Point[], width: number, height: number, transform: DailyVariantTransform) => (
  normalizePlacement(shape.map(([dx, dy]) => transformPoint(x + dx, y + dy, width, height, transform)))
);

const transformLocalShape = (shape: readonly Point[], transform: DailyVariantTransform): Point[] => {
  const maxX = Math.max(...shape.map(([x]) => x));
  const maxY = Math.max(...shape.map(([, y]) => y));
  const localWidth = maxX + 1;
  const localHeight = maxY + 1;
  return normalizePlacement(shape.map(([x, y]) => transformPoint(x, y, localWidth, localHeight, transform))).shape;
};

const transformGate = <T extends GateSpec>(gate: T, width: number, height: number, transform: DailyVariantTransform, colorPermutation: readonly BlockColor[]): T => {
  const color = colorPermutation[COLORS.indexOf(gate.color)]!;
  if (gate.portals?.length) {
    const portals = gate.portals.map((portal) => transformPortal(portal, width, height, transform));
    const first = portals[0]!;
    return { ...gate, color, side: first.side, offset: portalTangentOffset(first), size: first.size, portals };
  }
  const cells = gatePortalMouthCells({ width, height }, gate).map(([x, y]) => transformPoint(x, y, width, height, transform));
  const side = transformSide(gate.side, transform);
  const offset = side === "top" || side === "bottom" ? Math.min(...cells.map(([x]) => x)) : Math.min(...cells.map(([, y]) => y));
  return { ...gate, color, side, offset };
};

const rotateAxis = (axis: MovementAxis | undefined, transform: DailyVariantTransform): MovementAxis | undefined => {
  if (!axis || !["rotate-90", "rotate-270", "transpose"].includes(transform)) return axis;
  return axis === "horizontal" ? "vertical" : "horizontal";
};

const remapColor = (color: BlockColor, permutation: readonly BlockColor[]): BlockColor => permutation[COLORS.indexOf(color)]!;
const permuteQueue = (
  ids: readonly string[],
  seed: number,
  colorOf?: (id: string) => BlockColor | undefined,
): string[] => {
  if (!colorOf || ids.length < 2) return [...ids];

  // Generator cargo has an authored FIFO contract: adjacent cargo from one
  // machine must expose different initial colours. A plain Fisher–Yates
  // shuffle can silently violate that contract, so use a seeded backtracking
  // permutation and retain the source FIFO as a guaranteed-valid fallback.
  // The largest authored queue is nine entries, making this bounded search
  // cheap while still covering cases where a greedy choice would dead-end.
  const source = [...ids];
  const colours = source.map((id) => colorOf(id));
  if (colours.some((colour) => colour === undefined)) return source;
  const order = source.map((_, index) => index);
  let state = seed >>> 0;
  const nextRandom = () => {
    state = Math.imul(state ^ (state >>> 16), 2246822519) >>> 0;
    return state;
  };
  const result: number[] = [];
  const used = new Set<number>();
  const search = (previous: BlockColor | undefined): boolean => {
    if (result.length === source.length) return true;
    const randomKeys = new Map(order.map((index) => [index, nextRandom()]));
    const candidates = order
      .filter((index) => !used.has(index) && (previous === undefined || colours[index] !== previous))
      .sort((left, right) => {
        // Stable seeded order keeps two formal slots from collapsing to the
        // source FIFO while the colour guard remains deterministic.
        return randomKeys.get(left)! - randomKeys.get(right)! || left - right;
      });
    for (const index of candidates) {
      used.add(index);
      result.push(index);
      if (search(colours[index])) return true;
      result.pop();
      used.delete(index);
    }
    return false;
  };
  if (!search(undefined)) return source;
  return result.map((index) => source[index]!);
};
const pointList = (points: readonly Point[] | undefined, width: number, height: number, transform: DailyVariantTransform): Point[] | undefined => (
  points?.map(([x, y]) => transformPoint(x, y, width, height, transform))
);

const transformRectangle = (x: number, y: number, width: number, height: number, boardWidth: number, boardHeight: number, transform: DailyVariantTransform) => {
  const corners = [
    transformPoint(x, y, boardWidth, boardHeight, transform),
    transformPoint(x + width - 1, y, boardWidth, boardHeight, transform),
    transformPoint(x, y + height - 1, boardWidth, boardHeight, transform),
    transformPoint(x + width - 1, y + height - 1, boardWidth, boardHeight, transform),
  ];
  const minX = Math.min(...corners.map(([cx]) => cx));
  const maxX = Math.max(...corners.map(([cx]) => cx));
  const minY = Math.min(...corners.map(([, cy]) => cy));
  const maxY = Math.max(...corners.map(([, cy]) => cy));
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
};

const transformSeams = (seams: LevelSpec["seams"], width: number, height: number, transform: DailyVariantTransform): LevelSpec["seams"] => {
  if (!seams?.length) return seams;
  // Daily variants with seams keep the authored seam topology; swapping the
  // entire board would require re-deriving split offsets. Retaining the source
  // layout preserves seam semantics; colour changes do not prove independence.
  return seams.map((seam) => ({ ...seam }));
};

export interface DailyVariantIdentity {
  transform: DailyVariantTransform;
  colorShift: number;
  /** Odd multiplier makes a full colour permutation while preserving equality. */
  colorMultiplier: 1 | 3 | 5 | 7;
  colorPermutation: readonly BlockColor[];
  layoutVariant: number;
}

/**
 * Build the auditable D3 chamber backbone used by the daily proof pipeline.
 * Each two-row chamber has a red/blue pair with one parking row; a full-width
 * seam prevents the parking move from crossing into its neighbours. The
 * colours and left/right orientation are seeded per formal id so slots stay
 * independent even though the lower-bound theorem is shared.
 *
 * This constructor is intentionally explicit and opt-in. Existing campaign
 * adaptation remains in deriveDailyChallengeLevel until a candidate has a
 * stage-compatible mechanism marker and its route/time evidence.
 */
export const buildD3SeamChamberLevel = (source: LevelSpec, formalId: string, chamberCount = 31): LevelSpec => {
  const identity = dailyVariantIdentity(formalId);
  const red = identity.colorPermutation[COLORS.indexOf("red")]!;
  const blue = identity.colorPermutation[COLORS.indexOf("blue")]!;
  const gates: GateSpec[] = [];
  const blocks: LevelSpec["blocks"] = [];
  const seams = [] as NonNullable<LevelSpec["seams"]>;
  const stageMechanisms = ["irregular-block", "irregular-board", "frozen-exit", "numeric-ice", "axis-block", "key-lock", "star", "colored-grid", "multilayer-shell", "shutter", "generator", "layered-lift", "bomb", "flip-door"] as const;
  const stageMechanism = stageMechanisms.find((id) => formalId.includes(`mechanisms-${id}-`));
  // Use only perimeter chambers.  Every occupied component has an actual
  // outer-board mouth, which keeps canonical pointer input valid while the
  // empty interior supplies a compact, readable board silhouette.
  const markerRows = stageMechanism === "generator" ? 2 : stageMechanism ? 1 : 0;
  const gridSize = chamberCount <= 11 ? (markerRows === 2 ? 5 : 4) : chamberCount <= 21 ? 7 : (markerRows === 2 ? 10 : 9);
  const boardWidth = gridSize * 2;
  const boardHeight = boardWidth;
  const markerX = 0;
  const markerY = boardHeight - markerRows * 2;
  for (let column = 1; column < gridSize; column += 1) seams.push({ orientation: "vertical", offset: column * 2, start: 0, size: boardHeight });
  for (let row = 1; row < gridSize; row += 1) seams.push({ orientation: "horizontal", offset: row * 2, start: 0, size: boardWidth });
  let pattern = identity.layoutVariant >>> 0;
  const nextBit = (): boolean => { pattern = Math.imul(pattern ^ (pattern >>> 16), 2246822519) >>> 0; return (pattern & 1) === 1; };
  const perimeter: Array<[number, number]> = [];
  for (let row = 0; row < gridSize; row += 1) for (let column = 0; column < gridSize; column += 1) {
    if ((row === 0 || row === gridSize - 1 || column === 0 || column === gridSize - 1) && !(column === 0 && row === gridSize - 1)) perimeter.push([column, row]);
  }
  // All perimeter mouths are true outer-board gates.  Avoid explicit interior
  // portals here: the canonical pointer/replay contract treats those as
  // non-exits even when a seam is present.
  const gateFor = (id: string, side: Side, origin: Point, color: BlockColor, size = 1, extra: Partial<GateSpec> = {}): GateSpec => ({ id, side, offset: side === "top" || side === "bottom" ? origin[0] : origin[1], size, color, ...extra });
  const reservedMarkerTiles = new Set(Array.from({ length: markerRows }, (_, index) => `${0},${gridSize - 1 - index}`));
  // The three-rail bottom generator needs the neighbouring bottom tile's
  // outer rail as an empty mouth; keep that tile out of the perimeter pool.
  if (stageMechanism === "generator") reservedMarkerTiles.add(`${1},${gridSize - 1}`);
  // A three-rail generator mounted on the left rim occupies the last three
  // left-edge rails. Keep the neighbouring chamber out of that span so its
  // lower gate cannot share a machine rail.
  const generatorAdjacentMarkerTile = stageMechanism === "generator"
    ? `${0},${gridSize - 2}` : undefined;
  const chamberPerimeter = perimeter.filter(([column, row]) => (
    !reservedMarkerTiles.has(`${column},${row}`)
    && `${column},${row}` !== generatorAdjacentMarkerTile
  ));
  for (let index = 0; index < chamberCount; index += 1) {
    const [column, row] = chamberPerimeter[index]!;
    const x = column * 2;
    const y = row * 2;
    const side: Side = row === 0 ? "top" : row === gridSize - 1 ? "bottom" : column === 0 ? "left" : "right";
    const swap = nextBit();
    const firstColor = swap ? blue : red;
    const secondColor = swap ? red : blue;
    const first: Point = side === "top" ? [x, y] : side === "bottom" ? [x, y + 1] : side === "left" ? [x, y] : [x + 1, y];
    const second: Point = side === "top" ? [x + 1, y] : side === "bottom" ? [x + 1, y + 1] : side === "left" ? [x, y + 1] : [x + 1, y + 1];
    gates.push(gateFor(`${formalId}-perimeter-a-${index}`, side, first, firstColor), gateFor(`${formalId}-perimeter-b-${index}`, side, second, secondColor));
    // Swap the initial colours relative to the two same-side gates.  The
    // blocks must first park around one another, preserving one proven
    // non-clearing move per chamber instead of clearing directly in one drag.
    blocks.push({ id: `${formalId}-perimeter-a-block-${index}`, x: first[0], y: first[1], shape: [[0, 0]], color: secondColor }, { id: `${formalId}-perimeter-b-block-${index}`, x: second[0], y: second[1], shape: [[0, 0]], color: firstColor });
  }
  const markerLeftGate = (id: string, y: number, color: BlockColor, size = 1, extra: Partial<GateSpec> = {}): GateSpec => gateFor(id, "left", [0, y], color, size, extra);
  const markerBottomGate = (id: string, x: number, color: BlockColor, size = 1, extra: Partial<GateSpec> = {}): GateSpec => gateFor(id, "bottom", [x, boardHeight - 1], color, size, extra);
  if (stageMechanism === "irregular-block") {
    gates.push(markerBottomGate(`${formalId}-marker-bottom`, 0, red, 2));
    blocks.push({ id: `${formalId}-marker-irregular`, x: markerX, y: markerY, shape: [[0, 0], [1, 0], [1, 1]], color: red });
  } else if (stageMechanism === "irregular-board") {
    gates.push(markerLeftGate(`${formalId}-marker-left`, markerY, red));
    blocks.push({ id: `${formalId}-marker-board`, x: markerX, y: markerY, shape: [[0, 0]], color: red });
  } else if (stageMechanism === "axis-block") {
    // The marker block is constrained to horizontal motion, so its marker
    // exit must be the left rail rather than the bottom rail.
    gates.push(markerLeftGate(`${formalId}-marker-left`, markerY, red, 2));
    blocks.push({ id: `${formalId}-marker-axis`, x: markerX, y: markerY, shape: [[0, 0], [1, 0]], color: red, movementAxis: "horizontal" });
  } else if (stageMechanism === "star") {
    gates.push(markerLeftGate(`${formalId}-marker-left`, markerY, red, 1, { star: true }));
    blocks.push({ id: `${formalId}-marker-star`, x: markerX, y: markerY, shape: [[0, 0]], color: red, star: true });
  } else if (stageMechanism === "colored-grid") {
    gates.push(markerLeftGate(`${formalId}-marker-left`, markerY, red));
    blocks.push({ id: `${formalId}-marker-grid`, x: markerX, y: markerY, shape: [[0, 0]], color: red });
  } else if (stageMechanism === "multilayer-shell") {
    gates.push(markerLeftGate(`${formalId}-marker-left`, markerY, red), markerBottomGate(`${formalId}-marker-bottom`, 0, blue));
    blocks.push({ id: `${formalId}-marker-shell`, x: markerX, y: markerY, shape: [[0, 0]], color: red, layers: [red, blue] });
  } else if (stageMechanism === "frozen-exit") {
    gates.push(markerLeftGate(`${formalId}-marker-frozen-left`, markerY, red, 1, { frozen: 1 }), markerBottomGate(`${formalId}-marker-blue-bottom`, 1, blue));
    blocks.push({ id: `${formalId}-marker-frozen`, x: markerX, y: markerY, shape: [[0, 0]], color: red }, { id: `${formalId}-marker-blue`, x: markerX + 1, y: markerY + 1, shape: [[0, 0]], color: blue });
  } else if (stageMechanism === "numeric-ice") {
    gates.push(markerLeftGate(`${formalId}-marker-ice-left`, markerY, red), markerBottomGate(`${formalId}-marker-blue-bottom`, 1, blue));
    blocks.push({ id: `${formalId}-marker-ice`, x: markerX, y: markerY, shape: [[0, 0]], color: red, frozen: 1 }, { id: `${formalId}-marker-blue`, x: markerX + 1, y: markerY + 1, shape: [[0, 0]], color: blue });
  } else if (stageMechanism === "key-lock") {
    const keyId = `${formalId}-marker-key`;
    gates.push(markerLeftGate(`${formalId}-marker-key-left`, markerY, red), markerBottomGate(`${formalId}-marker-lock-bottom`, 1, blue));
    blocks.push({ id: keyId, x: markerX, y: markerY, shape: [[0, 0]], color: red, keyId }, { id: `${formalId}-marker-lock`, x: markerX + 1, y: markerY + 1, shape: [[0, 0]], color: blue, lockedBy: keyId });
  } else if (stageMechanism === "shutter") {
    const shutterId = `${formalId}-marker-shutter`;
    gates.push(markerLeftGate(`${formalId}-marker-trigger-left`, markerY, red), markerBottomGate(`${formalId}-marker-hidden-bottom`, 1, blue));
    blocks.push({ id: `${formalId}-marker-trigger`, x: markerX, y: markerY, shape: [[0, 0]], color: red }, { id: `${formalId}-marker-hidden`, x: markerX + 1, y: markerY + 1, shape: [[0, 0]], color: blue, shutterId });
  } else if (stageMechanism === "generator") {
    const queuedId = `${formalId}-marker-queued`;
    // Mount the three-rail machine on the left rim. The trigger exits through
    // the bottom edge while generated cargo uses the lower left mouth, so no
    // exit shares one of the machine's three exposed rails.
    gates.push(markerBottomGate(`${formalId}-marker-trigger-bottom`, 1, red), markerBottomGate(`${formalId}-marker-generated-bottom`, 0, blue));
    blocks.push({ id: `${formalId}-marker-trigger`, x: markerX + 1, y: boardHeight - 2, shape: [[0, 0]], color: red }, { id: queuedId, x: markerX, y: boardHeight - 2, shape: [[0, 0]], color: blue });
  } else if (stageMechanism === "layered-lift") {
    gates.push(markerLeftGate(`${formalId}-marker-trigger-left`, markerY, red), markerBottomGate(`${formalId}-marker-lift-bottom`, 1, blue));
    blocks.push({ id: `${formalId}-marker-lift-trigger`, x: markerX, y: markerY, shape: [[0, 0]], color: red }, { id: `${formalId}-marker-lift-hidden`, x: markerX + 1, y: markerY + 1, shape: [[0, 0]], color: blue, shutterId: `${formalId}-marker-lift` });
  } else if (stageMechanism === "bomb") {
    gates.push(markerLeftGate(`${formalId}-marker-left`, markerY, red));
    blocks.push({ id: `${formalId}-marker-bomb`, x: markerX, y: markerY, shape: [[0, 0]], color: red, timedBombSeconds: 999999 });
  } else if (stageMechanism === "flip-door") {
    blocks.push({ id: `${formalId}-marker-flip`, x: markerX, y: markerY, shape: [[0, 0]], color: red });
  }
  const marker = stageMechanism ? { yStart: markerY, height: markerRows * 2, mechanism: stageMechanism } : undefined;
  return {
    mechanismRules: "revised-2026-09-23-v1.4", id: source.id, name: `${source.name}·每日独立D3-${formalId.slice(-2)}`,
    difficulty: source.difficulty, timeSeconds: source.timeSeconds, reward: 0, width: boardWidth, height: boardHeight, gates, blocks, seams,
    playable: stageMechanism === "irregular-board" ? Array.from({ length: boardHeight }, (_, y) => Array.from({ length: boardWidth }, (_, x) => [x, y] as Point)).flat().filter(([x, y]) => !(x === 1 && y === markerY + 1)) : undefined,
    coloredGrids: stageMechanism === "colored-grid" ? [{ id: `${formalId}-marker-grid-cell`, color: red, cells: [[markerX, markerY]] }] : undefined,
    shutters: stageMechanism === "shutter" ? [{ id: `${formalId}-marker-shutter`, x: markerX + 1, y: markerY + 1, width: 1, height: 1, count: 1, skin: "shutter" }] : stageMechanism === "layered-lift" ? [{ id: `${formalId}-marker-lift`, x: markerX + 1, y: markerY + 1, width: 1, height: 1, count: 1, skin: "lift" }] : undefined,
    generators: stageMechanism === "generator" ? [{ id: `${formalId}-marker-generator`, side: "left", offset: boardHeight - 2, spawn: [markerX, boardHeight - 2], queueBlockIds: [`${formalId}-marker-queued`], trigger: "move", rimMount: "rim" }] : undefined,
    flipDoors: stageMechanism === "flip-door" ? [{ id: `${formalId}-marker-flip-door`, side: "left", offset: markerY, size: 1, color: red, initiallyOpen: true, portals: [{ side: "left", origin: [markerX, markerY], size: 1 }] }] : undefined,
    bombFailurePolicy: stageMechanism === "bomb" ? "fail" : undefined,
    dailyProof: { kind: "seam-chambers-v1", componentWidth: 2, componentHeight: 2, componentCount: chamberCount, componentFloor: 1, marker },
    designTargets: { formulaVersion: "blockout-d1", calibratedDifficulty: 3, minimumRepositionOverhead: chamberCount },
  };
};
/**
 * Build the historical seam proof candidate.  This factory remains available
 * to reproduce the isolated lower-bound evidence, but it is not a gameplay
 * path: production daily runs use deriveDailyChallengeLevel so the mainline
 * board remains the visual and mechanism baseline.
 * The three daily bands use distinct proven chamber floors (11/21/31).
 */
export const buildIndependentDailyChallengeLevel = (
  source: LevelSpec,
  formalId: string,
  difficulty: 1 | 2 | 3,
): LevelSpec => buildD3SeamChamberLevel(source, formalId, difficulty === 1 ? 11 : difficulty === 2 ? 21 : 31);

export const dailyVariantIdentity = (formalId: string): DailyVariantIdentity => {
  const hash = hashString(formalId);
  const transform = TRANSFORMS[hash % TRANSFORMS.length]!;
  const colorShift = (Math.floor(hash / TRANSFORMS.length) % (COLORS.length - 1)) + 1;
  const multipliers = [1, 3, 5, 7] as const;
  const colorMultiplier = multipliers[Math.floor(hash / (TRANSFORMS.length * (COLORS.length - 1))) % multipliers.length]!;
  const colorPermutation = [...COLORS] as BlockColor[];
  let permutationSeed = hash ^ 0x9e3779b9;
  for (let index = colorPermutation.length - 1; index > 0; index -= 1) {
    permutationSeed = Math.imul(permutationSeed ^ (permutationSeed >>> 16), 2246822519) >>> 0;
    const swapIndex = permutationSeed % (index + 1);
    [colorPermutation[index], colorPermutation[swapIndex]] = [colorPermutation[swapIndex]!, colorPermutation[index]!];
  }
  return { transform, colorShift, colorMultiplier, colorPermutation, layoutVariant: hash >>> 0 };
};

/** A symmetry is playable only when every resulting body and layer has art.
 * Keep the colour map bijective so blocks, exits and coloured grids retain
 * their original equality relationships. Never rotate artwork to fill a gap.
 */
export const dailyVariantForSource = (source: LevelSpec, formalId: string): DailyVariantIdentity => {
  const identity = dailyVariantIdentity(formalId);
  const transforms: DailyVariantTransform[] = source.generators?.length || source.seams?.length
    ? ["identity"]
    : [...new Set([identity.transform, ...TRANSFORMS, "identity"] as DailyVariantTransform[])];
  for (const transform of transforms) {
    const allowed = COLORS.map(() => new Set<BlockColor>(COLORS));
    let shapesSupported = true;
    for (const block of source.blocks) {
      const shape = transformLocalShape(block.shape, transform);
      const match = matchFormalBlockShapeForLevel(shape, source.id);
      // The unchanged Lv5 legacy source is the sole existing rotation
      // exception; a daily variant must not introduce new rotated sprites.
      if (!match || (match.quarterTurns !== 0 && transform !== "identity")) {
        shapesSupported = false;
        break;
      }
      const layers = block.layers?.length ? block.layers : [block.color];
      layers.forEach((sourceColor, index) => {
        const choices = allowed[COLORS.indexOf(sourceColor)]!;
        for (const color of choices) {
          const art = GAME_ART.gameplay.formalBlocks[color];
          const solid = art.solid as Partial<Record<number, string>>;
          const shell = art.shell as Partial<Record<number, string>>;
          if (!solid[match.shapeId] || (index < layers.length - 1 && !shell[match.shapeId])) choices.delete(color);
        }
      });
    }
    if (!shapesSupported || allowed.some((choices) => choices.size === 0)) continue;
    // At most eight colours. Try the slot's existing permutation first and
    // backtrack only when a rare silhouette restricts the available colours.
    const order = COLORS.map((_, index) => index).sort((a, b) => allowed[a]!.size - allowed[b]!.size || a - b);
    const permutation: BlockColor[] = [];
    const used = new Set<BlockColor>();
    const assign = (depth: number): boolean => {
      if (depth === order.length) return true;
      const index = order[depth]!;
      const preferred = identity.colorPermutation[index]!;
      for (const color of [preferred, ...identity.colorPermutation.filter((color) => color !== preferred)]) {
        if (used.has(color) || !allowed[index]!.has(color)) continue;
        permutation[index] = color;
        used.add(color);
        if (assign(depth + 1)) return true;
        used.delete(color);
      }
      return false;
    };
    if (assign(0)) return { ...identity, transform, colorPermutation: permutation };
  }
  throw new Error(`Daily challenge ${formalId}: source ${source.id} has no complete supported block artwork`);
};

export const deriveDailyChallengeLevel = (source: LevelSpec, formalId: string): LevelSpec => {
  const identity = dailyVariantForSource(source, formalId);
  // Queue cargo shares one spawn anchor even when its silhouettes have
  // different widths/heights. A symmetry that reverses a generator's tangent
  // would require per-cargo anchors, which the runtime intentionally does not
  // support. Keep generator boards spatially stable and vary their complete
  // colour/layout identity instead; this preserves the authored mouth proof.
  const transform = identity.transform;
  const [width, height] = transformedDimensions(source.width, source.height, transform);
  const queuedSourceIds = new Set(source.generators?.flatMap((generator) => generator.queueBlockIds) ?? []);
  const queuedSpawnBySourceId = new Map<string, Point>();
  for (const generator of source.generators ?? []) {
    if (transform === "identity") {
      for (const id of generator.queueBlockIds) queuedSpawnBySourceId.set(id, [...generator.spawn] as Point);
      continue;
    }
    const transformedShapes = generator.queueBlockIds.map((id) => source.blocks.find((block) => block.id === id)?.shape ?? [])
      .map((shape) => transformLocalShape(shape, transform));
    const maxWidth = Math.max(1, ...transformedShapes.map((shape) => Math.max(...shape.map(([x]) => x)) + 1));
    const maxHeight = Math.max(1, ...transformedShapes.map((shape) => Math.max(...shape.map(([, y]) => y)) + 1));
    const transformedSide = transformSide(generator.side, transform);
    const rawSpawn = transformPoint(generator.spawn[0], generator.spawn[1], source.width, source.height, transform);
    const clamp = (value: number, maximum: number): number => Math.max(0, Math.min(maximum, value));
    const spawn: Point = [
      transformedSide === "left" ? 0 : transformedSide === "right" ? width - maxWidth : clamp(rawSpawn[0], width - maxWidth),
      transformedSide === "top" ? 0 : transformedSide === "bottom" ? height - maxHeight : clamp(rawSpawn[1], height - maxHeight),
    ];
    for (const id of generator.queueBlockIds) queuedSpawnBySourceId.set(id, spawn);
  }
  const blocks = source.blocks.map((block) => {
    const queued = queuedSourceIds.has(block.id);
    const placement = queued
      ? { x: queuedSpawnBySourceId.get(block.id)![0], y: queuedSpawnBySourceId.get(block.id)![1], shape: transform === "identity" ? block.shape.map(([x, y]) => [x, y] as Point) : transformLocalShape(block.shape, transform) }
      : transformPlacement(block.x, block.y, block.shape, source.width, source.height, transform);
    return {
      ...block,
      ...placement,
      color: remapColor(block.color, identity.colorPermutation),
      layers: block.layers?.map((color) => remapColor(color, identity.colorPermutation)),
      movementAxis: rotateAxis(block.movementAxis, transform),
      id: `${formalId}-${block.id}`,
      keyId: block.keyId ? `${formalId}-${block.keyId}` : undefined,
      lockedBy: block.lockedBy ? `${formalId}-${block.lockedBy}` : undefined,
    };
  });
  const remapKey = (key: string | undefined): string | undefined => key ? `${formalId}-${key}` : undefined;
  const gates = source.gates.map((gate) => ({ ...transformGate(gate, source.width, source.height, transform, identity.colorPermutation), id: `${formalId}-${gate.id}` }));
  const flipDoors = source.flipDoors?.map((door) => ({ ...transformGate(door, source.width, source.height, transform, identity.colorPermutation), id: `${formalId}-${door.id}` }));
  const shutters = source.shutters?.map((shutter) => ({
    ...shutter,
    ...transformRectangle(shutter.x, shutter.y, shutter.width, shutter.height, source.width, source.height, transform),
    id: `${formalId}-${shutter.id}`,
    triggerBlockIds: shutter.triggerBlockIds?.map((id) => `${formalId}-${id}`),
  }));
  const grids = source.coloredGrids?.map((grid) => ({
    ...grid,
    id: `${formalId}-${grid.id}`,
    color: remapColor(grid.color, identity.colorPermutation),
    cells: grid.cells.map(([x, y]) => transformPoint(x, y, source.width, source.height, transform)),
  }));
  const generators = source.generators?.map((generator, generatorIndex) => {
    const queueBlockIds = permuteQueue(
      generator.queueBlockIds,
      identity.layoutVariant ^ hashString(`${formalId}-${generator.id}-${generatorIndex}`),
      (id) => {
        const block = source.blocks.find((candidate) => candidate.id === id);
        return block?.layers?.[0] ?? block?.color;
      },
    );
    const spawn = queuedSpawnBySourceId.get(generator.queueBlockIds[0]!)
      ?? transformPoint(generator.spawn[0], generator.spawn[1], source.width, source.height, transform);
    // A generator offset is the centre rail (unlike a gate offset, which is
    // the first tangent rail). Transform that centre rail directly.
    const centre: Point = generator.side === "top" ? [generator.offset, 0]
      : generator.side === "right" ? [source.width - 1, generator.offset]
        : generator.side === "bottom" ? [generator.offset, source.height - 1]
          : [0, generator.offset];
    const transformedCentre = transformPoint(centre[0], centre[1], source.width, source.height, transform);
    const side = transformSide(generator.side, transform);
    const offset = side === "top" || side === "bottom" ? transformedCentre[0] : transformedCentre[1];
    return {
      ...generator,
      id: `${formalId}-${generator.id}`,
      side,
      offset,
      spawn,
      queueBlockIds: queueBlockIds.map((id) => `${formalId}-${id}`),
      // The legacy side/offset projection is integer aligned and survives all
      // seven symmetries. Keep custom float rim anchors out of derived daily
      // data until a dedicated anchor transformer is added.
      rimAnchor: transform === "identity" && generator.rimAnchor
        ? { ...generator.rimAnchor }
        : undefined,
    };
  });
  const elevators = source.elevators?.map((elevator) => ({
    ...elevator,
    id: `${formalId}-${elevator.id}`,
    blockId: `${formalId}-${elevator.blockId}`,
    ...(() => { const from = transformPoint(elevator.fromX, elevator.fromY, source.width, source.height, transform); const to = transformPoint(elevator.toX, elevator.toY, source.width, source.height, transform); return { fromX: from[0], fromY: from[1], toX: to[0], toY: to[1] }; })(),
  }));
  const conveyors = source.conveyors?.map((conveyor) => ({
    ...conveyor,
    id: `${formalId}-${conveyor.id}`,
    blockId: `${formalId}-${conveyor.blockId}`,
    ...transformRectangle(conveyor.x, conveyor.y, conveyor.width, conveyor.height, source.width, source.height, transform),
    direction: transformSide(conveyor.direction, transform),
  }));
  const transformPointOrKeep = (point: Point): Point => transformPoint(point[0], point[1], source.width, source.height, transform);
  const result: LevelSpec = {
    ...source,
    id: source.id,
    name: `${source.name}·每日${formalId.slice(-2)}`,
    reward: 0,
    width,
    height,
    playable: pointList(source.playable, source.width, source.height, transform),
    blocked: pointList(source.blocked, source.width, source.height, transform),
    seams: transformSeams(source.seams, source.width, source.height, transform),
    gates,
    blocks,
    flipDoors,
    coloredGrids: grids,
    shutters,
    generators,
    elevators,
    conveyors,
    onboardingHint: source.onboardingHint ? { ...source.onboardingHint, blockId: `${formalId}-${source.onboardingHint.blockId}`, path: source.onboardingHint.path.map(transformPointOrKeep) } : undefined,
    strategyNudge: source.strategyNudge ? { ...source.strategyNudge, blockId: `${formalId}-${source.strategyNudge.blockId}`, from: transformPointOrKeep(source.strategyNudge.from), path: source.strategyNudge.path.map(transformPointOrKeep) } : undefined,
    strategyFocus: source.strategyFocus ? { ...source.strategyFocus, blockId: `${formalId}-${source.strategyFocus.blockId}` } : undefined,
    rocketRescue: source.rocketRescue ? { ...source.rocketRescue, targetBlockId: `${formalId}-${source.rocketRescue.targetBlockId}`, deadlockBlockId: `${formalId}-${source.rocketRescue.deadlockBlockId}`, deadlockPosition: transformPointOrKeep(source.rocketRescue.deadlockPosition) } : undefined,
    pulseRescue: source.pulseRescue ? { ...source.pulseRescue, targetBlockId: `${formalId}-${source.pulseRescue.targetBlockId}`, targetPosition: transformPointOrKeep(source.pulseRescue.targetPosition) } : undefined,
  };
  // Maintain referential integrity after prefixing ids.
  for (const block of result.blocks) {
    if (block.shutterId) block.shutterId = `${formalId}-${block.shutterId}`;
  }
  return result;
};

/**
 * Return a semantic layout fingerprint.  Runtime ids are deliberately removed
 * here: a different id prefix is provenance, not a different board.  The
 * fingerprint therefore only changes when geometry, colours, mechanism
 * topology, or authored behaviour changes.  Point lists are sorted so an
 * equivalent shape with a different point ordering cannot pass as a new slot.
 */
export const dailyChallengeLayoutHash = (level: LevelSpec): string => {
  const points = (value: readonly Point[] | undefined) => (value ?? [])
    .map(([x, y]) => [x, y] as Point)
    .sort(([ax, ay], [bx, by]) => ax - bx || ay - by);
  const sourceSuffix = (value: string | undefined): string | undefined => {
    if (!value) return undefined;
    const parts = value.split("-");
    return parts.length > 2 ? parts.slice(-2).join("-") : parts[parts.length - 1];
  };
  const blockIndex = new Map(level.blocks.map((block, index) => [block.id, index]));
  const shutterIndex = new Map((level.shutters ?? []).map((shutter, index) => [shutter.id, index]));
  const blockRef = (value: string | undefined) => value === undefined ? undefined
    : (blockIndex.has(value) ? blockIndex.get(value) : sourceSuffix(value));
  const gate = (value: GateSpec) => ({
    side: value.side, offset: value.offset, size: value.size, color: value.color,
    frozen: value.frozen, star: value.star,
    portals: value.portals?.map((portal) => ({
      side: portal.side, origin: portal.origin, size: portal.size,
    })),
  });
  const block = (value: LevelSpec["blocks"][number]) => ({
    x: value.x, y: value.y, shape: points(value.shape), color: value.color,
    layers: value.layers, frozen: value.frozen,
    shutterIndex: value.shutterId === undefined ? undefined : shutterIndex.get(value.shutterId),
    movementAxis: value.movementAxis, keyId: sourceSuffix(value.keyId),
    lockedBy: sourceSuffix(value.lockedBy), lockCount: value.lockCount, star: value.star,
    timedBombSeconds: value.timedBombSeconds, rotationBadge: value.rotationBadge,
  });
  const shutter = (value: NonNullable<LevelSpec["shutters"]>[number]) => ({
    x: value.x, y: value.y, width: value.width, height: value.height,
    count: value.count, skin: value.skin,
    triggerBlockIndexes: value.triggerBlockIds?.map((id) => blockRef(id)),
  });
  const generator = (value: NonNullable<LevelSpec["generators"]>[number]) => ({
    side: value.side, offset: value.offset, rimSpan: value.rimSpan, rimMount: value.rimMount,
    rimAnchor: value.rimAnchor, spawn: value.spawn, trigger: value.trigger,
    intervalSeconds: value.intervalSeconds, initialDelaySeconds: value.initialDelaySeconds,
    queueBlockIndexes: value.queueBlockIds.map((id) => blockIndex.get(id) ?? sourceSuffix(id)),
  });
  const elevator = (value: NonNullable<LevelSpec["elevators"]>[number]) => ({
    blockIndex: blockRef(value.blockId), fromX: value.fromX, fromY: value.fromY,
    toX: value.toX, toY: value.toY, width: value.width, height: value.height,
    periodSeconds: value.periodSeconds,
  });
  const conveyor = (value: NonNullable<LevelSpec["conveyors"]>[number]) => ({
    blockIndex: blockRef(value.blockId), x: value.x, y: value.y, width: value.width,
    height: value.height, direction: value.direction,
  });
  return JSON.stringify({
    mechanismRules: level.mechanismRules, bombFailurePolicy: level.bombFailurePolicy,
    width: level.width, height: level.height, playable: points(level.playable), blocked: points(level.blocked),
    gates: level.gates.map(gate), flipDoors: level.flipDoors?.map((value) => ({ ...gate(value), initiallyOpen: value.initiallyOpen })),
    coloredGrids: level.coloredGrids?.map((value) => ({ color: value.color, cells: points(value.cells) })),
    shutters: level.shutters?.map(shutter), generators: level.generators?.map(generator),
    elevators: level.elevators?.map(elevator), conveyors: level.conveyors?.map(conveyor),
    blocks: level.blocks.map(block),
    dailyProof: level.dailyProof,
  });
};

/**
 * Return a colour-independent board fingerprint for the independent-layout
 * gate.  A colour permutation is useful for daily variety, but it should not
 * be mistaken for a geometric rearrangement when auditing authored slots.
 * IDs, names, rewards and source provenance are omitted; cell coordinates,
 * shapes, portal topology and mechanism anchors remain bound.
 */
export const dailyChallengeGeometryHash = (level: LevelSpec): string => {
  const points = (value: readonly Point[] | undefined) => (value ?? [])
    .map(([x, y]) => [x, y] as Point)
    .sort(([ax, ay], [bx, by]) => ax - bx || ay - by);
  const blockIndex = new Map(level.blocks.map((block, index) => [block.id, index]));
  const shutterIndex = new Map((level.shutters ?? []).map((shutter, index) => [shutter.id, index]));
  const blockRef = (value: string | undefined): number | undefined => value === undefined ? undefined : blockIndex.get(value);
  const gate = (value: GateSpec) => ({
    side: value.side, offset: value.offset, size: value.size, frozen: value.frozen, star: value.star,
    portals: value.portals?.map((portal) => ({ side: portal.side, origin: portal.origin, size: portal.size })),
  });
  const block = (value: LevelSpec["blocks"][number]) => ({
    x: value.x, y: value.y, shape: points(value.shape), layers: value.layers?.length, frozen: value.frozen,
    shutterIndex: value.shutterId === undefined ? undefined : shutterIndex.get(value.shutterId),
    movementAxis: value.movementAxis, keyIndex: blockRef(value.keyId), lockedIndex: blockRef(value.lockedBy),
    lockCount: value.lockCount, star: value.star, timedBombSeconds: value.timedBombSeconds, rotationBadge: value.rotationBadge,
  });
  const shutter = (value: NonNullable<LevelSpec["shutters"]>[number]) => ({
    x: value.x, y: value.y, width: value.width, height: value.height, count: value.count, skin: value.skin,
    triggerBlockIndexes: value.triggerBlockIds?.map((id) => blockRef(id)),
  });
  const generator = (value: NonNullable<LevelSpec["generators"]>[number]) => ({
    side: value.side, offset: value.offset, rimSpan: value.rimSpan, rimMount: value.rimMount,
    rimAnchor: value.rimAnchor, spawn: value.spawn, trigger: value.trigger,
    intervalSeconds: value.intervalSeconds, initialDelaySeconds: value.initialDelaySeconds,
    queueBlockIndexes: value.queueBlockIds.map((id) => blockRef(id)),
  });
  const elevator = (value: NonNullable<LevelSpec["elevators"]>[number]) => ({
    blockIndex: blockRef(value.blockId), fromX: value.fromX, fromY: value.fromY,
    toX: value.toX, toY: value.toY, width: value.width, height: value.height, periodSeconds: value.periodSeconds,
  });
  const conveyor = (value: NonNullable<LevelSpec["conveyors"]>[number]) => ({
    blockIndex: blockRef(value.blockId), x: value.x, y: value.y, width: value.width,
    height: value.height, direction: value.direction,
  });
  return JSON.stringify({
    width: level.width, height: level.height, playable: points(level.playable), blocked: points(level.blocked),
    seams: level.seams, gates: level.gates.map(gate),
    flipDoors: level.flipDoors?.map((value) => ({ ...gate(value), initiallyOpen: value.initiallyOpen })),
    coloredGrids: level.coloredGrids?.map((value) => ({ cells: points(value.cells) })),
    shutters: level.shutters?.map(shutter), generators: level.generators?.map(generator),
    elevators: level.elevators?.map(elevator), conveyors: level.conveyors?.map(conveyor),
    blocks: level.blocks.map(block), bombFailurePolicy: level.bombFailurePolicy,
  });
};



