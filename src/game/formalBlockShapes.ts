import { REMADE_171_180_IDS } from '../core/remake171to180';
import { REMADE_191_200_IDS } from '../core/remake191to200';
import { REMADE_161_170_IDS } from '../core/remake161to170';
import { REMADE_151_160_IDS } from '../core/remake151to160';
import { REMADE_141_150_IDS } from '../core/remake141to150';
import { REMADE_121_130_IDS } from '../core/remake121to130';
import { REMADE_131_140_IDS } from '../core/remake131to140';
import { REMADE_51_60_IDS } from "../core/remake51to60";
import { REMADE_101_110_IDS } from '../core/remake101to110';
import { REMADE_111_120_IDS } from '../core/remake111to120';
import { REMADE_81_90_IDS } from '../core/remake81to90';
import { REMADE_91_100_IDS } from '../core/remake91to100';
import { NATIVE_REMAKE31_40_IDS } from "../core/nativeRemake31to40";
import { REMADE_41_50_IDS } from "../core/remake41to50";
import type { Point } from "../core/types";
import { REMADE_181_190_IDS } from "../core/remake181to190";
import { REMADE_71_80_IDS } from "../core/remake71to80";
import { REMADE_61_70_IDS } from "../core/remake61to70";
import type { QuarterTurn } from "./boardRim";

export type FormalBlockShapeId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21;

export interface FormalBlockShapeDefinition {
  shapeId: FormalBlockShapeId;
  /** Cells in the source artwork's unrotated grid. */
  cells: readonly Point[];
  canonicalWidth: number;
  canonicalHeight: number;
}

export interface FormalBlockShapeMatch {
  shapeId: FormalBlockShapeId;
  /** Clockwise quarter turns applied to the source artwork. */
  quarterTurns: QuarterTurn;
  /** Top-left of the input cells' absolute bounding box. */
  minX: number;
  minY: number;
  /** Bounding size after applying quarterTurns, measured in grid cells. */
  targetWidth: number;
  targetHeight: number;
  /** Unrotated source-artwork size, measured in grid cells. */
  canonicalWidth: number;
  canonicalHeight: number;
}

export const FORMAL_BLOCK_SHAPES: readonly FormalBlockShapeDefinition[] = [
  { shapeId: 1, cells: [[0, 0]], canonicalWidth: 1, canonicalHeight: 1 },
  { shapeId: 2, cells: [[0, 0], [0, 1]], canonicalWidth: 1, canonicalHeight: 2 },
  { shapeId: 3, cells: [[0, 0], [0, 1], [0, 2]], canonicalWidth: 1, canonicalHeight: 3 },
  { shapeId: 4, cells: [[0, 0], [0, 1], [1, 1]], canonicalWidth: 2, canonicalHeight: 2 },
  { shapeId: 5, cells: [[0, 0], [1, 0], [1, 1], [2, 1]], canonicalWidth: 3, canonicalHeight: 2 },
  { shapeId: 6, cells: [[1, 0], [0, 1], [1, 1], [2, 1]], canonicalWidth: 3, canonicalHeight: 2 },
  { shapeId: 7, cells: [[0, 0], [1, 0], [0, 1], [1, 1]], canonicalWidth: 2, canonicalHeight: 2 },
  { shapeId: 8, cells: [[0, 0], [1, 0]], canonicalWidth: 2, canonicalHeight: 1 },
  { shapeId: 9, cells: [[0, 0], [1, 0], [2, 0]], canonicalWidth: 3, canonicalHeight: 1 },
  { shapeId: 10, cells: [[0, 0], [1, 0], [2, 0], [0, 1]], canonicalWidth: 3, canonicalHeight: 2 },
  { shapeId: 11, cells: [[1, 0], [2, 0], [0, 1], [1, 1]], canonicalWidth: 3, canonicalHeight: 2 },
  { shapeId: 12, cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]], canonicalWidth: 3, canonicalHeight: 3 },
  { shapeId: 13, cells: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]], canonicalWidth: 2, canonicalHeight: 3 },
  { shapeId: 14, cells: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]], canonicalWidth: 3, canonicalHeight: 3 },
  { shapeId: 15, cells: [[0, 0], [1, 0], [2, 0], [3, 0]], canonicalWidth: 4, canonicalHeight: 1 },
  { shapeId: 16, cells: [[0, 0], [0, 1], [1, 1], [2, 1], [0, 2]], canonicalWidth: 3, canonicalHeight: 3 },
  { shapeId: 17, cells: [[3, 0], [0, 1], [1, 1], [2, 1], [3, 1]], canonicalWidth: 4, canonicalHeight: 2 },
  { shapeId: 18, cells: [[0, 0], [0, 1], [1, 1], [2, 1], [0, 2], [0, 3]], canonicalWidth: 3, canonicalHeight: 4 },
  { shapeId: 19, cells: [[0, 0], [0, 1], [1, 1], [2, 1]], canonicalWidth: 3, canonicalHeight: 2 },
  { shapeId: 20, cells: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2]], canonicalWidth: 3, canonicalHeight: 3 },
  // Dedicated horizontal artwork preserves the supplied upright highlights.
  { shapeId: 21, cells: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], canonicalWidth: 3, canonicalHeight: 2 },
] as const;

const pointKey = ([x, y]: Point): string => `${x},${y}`;

const layoutKey = (cells: readonly Point[]): string => cells
  .map(pointKey)
  .sort()
  .join(";");

const rotateCell = (
  [x, y]: Point,
  width: number,
  height: number,
  quarterTurns: QuarterTurn,
): Point => {
  if (quarterTurns === 1) return [height - 1 - y, x];
  if (quarterTurns === 2) return [width - 1 - x, height - 1 - y];
  if (quarterTurns === 3) return [y, width - 1 - x];
  return [x, y];
};

const rotatedSize = (
  width: number,
  height: number,
  quarterTurns: QuarterTurn,
): readonly [number, number] => quarterTurns % 2 === 0
  ? [width, height]
  : [height, width];

type ShapeTemplate = Readonly<Omit<FormalBlockShapeMatch, "minX" | "minY">>;

// Only authored silhouettes enter this fixed-size index. First match wins in
// the original q0-first/source-order traversal; arbitrary caller input is
// never retained. Translation remains specific to each returned match.
const SHAPE_MATCH_INDEX: ReadonlyMap<string, ShapeTemplate> = (() => {
  const index = new Map<string, ShapeTemplate>();
  for (const quarterTurns of [0, 1, 2, 3] as const) {
    for (const definition of FORMAL_BLOCK_SHAPES) {
      const rotatedCells = definition.cells.map((cell) => rotateCell(
        cell, definition.canonicalWidth, definition.canonicalHeight, quarterTurns,
      ));
      const key = layoutKey(rotatedCells);
      if (index.has(key)) continue;
      const [targetWidth, targetHeight] = rotatedSize(
        definition.canonicalWidth, definition.canonicalHeight, quarterTurns,
      );
      index.set(key, {
        shapeId: definition.shapeId,
        quarterTurns,
        targetWidth,
        targetHeight,
        canonicalWidth: definition.canonicalWidth,
        canonicalHeight: definition.canonicalHeight,
      });
    }
  }
  return index;
})();

/**
 * Finds a supplied formal whole-block sprite for an arbitrary translated grid
 * silhouette. Reflection is intentionally never considered.
 *
 * Exact, unrotated artwork is preferred over an equivalent rotated asset. For
 * example, a horizontal domino selects shape 8 rather than shape 2 rotated 90°.
 */
export const matchFormalBlockShape = (
  absoluteCells: readonly Point[],
  rotationPolicy: "legacy" | "native-only" = "legacy",
): FormalBlockShapeMatch | undefined => {
  if (absoluteCells.length === 0) return undefined;
  if (absoluteCells.some(([x, y]) => !Number.isInteger(x) || !Number.isInteger(y))) return undefined;

  const uniqueCells = new Set(absoluteCells.map(pointKey));
  if (uniqueCells.size !== absoluteCells.length) return undefined;

  const minX = Math.min(...absoluteCells.map(([x]) => x));
  const minY = Math.min(...absoluteCells.map(([, y]) => y));
  const normalizedCells = absoluteCells.map(([x, y]) => [x - minX, y - minY] as const);
  const targetKey = layoutKey(normalizedCells);

  const template = SHAPE_MATCH_INDEX.get(targetKey);
  if (!template || (rotationPolicy === "native-only" && template.quarterTurns !== 0)) return undefined;
  return {
    shapeId: template.shapeId,
    quarterTurns: template.quarterTurns,
    minX,
    minY,
    targetWidth: template.targetWidth,
    targetHeight: template.targetHeight,
    canonicalWidth: template.canonicalWidth,
    canonicalHeight: template.canonicalHeight,
  };
};

// Apply the native-art contract only to accepted remakes and the adapted first
// 30 levels. Lv5 and later unadapted levels retain their existing artwork.
export const matchFormalBlockShapeForLevel = (
  absoluteCells: readonly Point[],
  levelId: number,
): FormalBlockShapeMatch | undefined => matchFormalBlockShape(
  absoluteCells,
  (levelId >= 1 && levelId <= 30 && levelId !== 5) || REMADE_181_190_IDS.includes(levelId) || NATIVE_REMAKE31_40_IDS.includes(levelId) || REMADE_71_80_IDS.includes(levelId) || REMADE_61_70_IDS.includes(levelId) || REMADE_51_60_IDS.includes(levelId) || REMADE_41_50_IDS.includes(levelId) || REMADE_91_100_IDS.includes(levelId) || REMADE_81_90_IDS.includes(levelId) || REMADE_111_120_IDS.includes(levelId) || REMADE_131_140_IDS.includes(levelId) || REMADE_101_110_IDS.includes(levelId) || REMADE_121_130_IDS.includes(levelId) || REMADE_141_150_IDS.includes(levelId) || REMADE_151_160_IDS.includes(levelId) || REMADE_161_170_IDS.includes(levelId) || REMADE_171_180_IDS.includes(levelId) || REMADE_191_200_IDS.includes(levelId) ? "native-only" : "legacy",
);
