import type { Side } from "../core/types";

export interface FrozenGateCounterRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrozenGateCounterPoint {
  x: number;
  y: number;
}

export const FROZEN_GATE_ART_METRICS = {
  authoredCell: 95,
  faceThickness: 58,
} as const;

/**
 * Centers a frozen-gate counter on the visible ice face rather than on the
 * bitmap's shadow envelope. Top-facing strips are anchored by their lower
 * edge, so their trailing shadow sits inside the board and must be excluded
 * from the face center. The other three directions already share the gate
 * rectangle's visual center.
 */
export const frozenGateCounterCenter = (
  side: Side,
  rect: Readonly<FrozenGateCounterRect>,
  boardCell: number,
  horizontalIceSpriteHeight?: number,
): FrozenGateCounterPoint => {
  const center = {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
  if (side !== "top" || horizontalIceSpriteHeight == null) return center;

  const authoredShadowDepth = Math.max(
    0,
    horizontalIceSpriteHeight - FROZEN_GATE_ART_METRICS.faceThickness,
  );
  return {
    x: center.x,
    y: center.y - authoredShadowDepth * boardCell / FROZEN_GATE_ART_METRICS.authoredCell,
  };
};
