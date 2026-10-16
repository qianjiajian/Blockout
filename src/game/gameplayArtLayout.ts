import { HOME_ART_LAYOUT, HOME_TYPOGRAPHY } from "./homeArtLayout";

export interface GameplayArtPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const GAMEPLAY_ARTBOARD = { width: 720, height: 1584 } as const;

/** Maximum formal-v2 rim overhang from each playable seam, in grid cells. */
export const GAMEPLAY_BOARD_RIM_VISUAL_INSETS = {
  top: 69 / 95,
  right: 60 / 95,
  bottom: 69 / 95,
  left: 61 / 95,
} as const;

// The formal board rail is authored on a 95px grid. The 69px safety envelope
// matches the tallest current native corner and keeps the board clear of boosters.
export const GAMEPLAY_BOARD_LAYOUT = {
  logicalWidth: 496,
  maxInnerWidth: 414,
  maxInnerHeight: 548,
  maxCell: 67,
  preferredInnerY: 344,
  minimumInnerY: 292,
  minimumVisualTop: 224,
  minimumSideGap: 6,
  preferredSlackRatio: 0.28,
  maximumPreferredSlack: 56,
  bottomVisualOverflowCells: GAMEPLAY_BOARD_RIM_VISUAL_INSETS.bottom,
  minimumBoosterGap: 14,
} as const;

export interface GameplayBoardFit {
  cell: number;
  innerWidth: number;
  innerHeight: number;
  innerX: number;
  innerY: number;
  visualTop: number;
  visualBottom: number;
}

export interface GameplayBoardVisualInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const DEFAULT_BOARD_VISUAL_INSETS: GameplayBoardVisualInsets = {
  top: 0,
  right: 0,
  bottom: GAMEPLAY_BOARD_LAYOUT.bottomVisualOverflowCells,
  left: 0,
};

/**
 * Fits the board above the authored booster row. Tall boards move up first,
 * then shrink only as much as needed to preserve the visible gap.
 */
export const fitGameplayBoard = (
  columns: number,
  rows: number,
  boosterTop: number,
  visualInsets: Partial<GameplayBoardVisualInsets> = DEFAULT_BOARD_VISUAL_INSETS,
  fitCompleteVisualHeight = false,
): GameplayBoardFit => {
  const width = Math.max(1, columns);
  const height = Math.max(1, rows);
  const metrics = GAMEPLAY_BOARD_LAYOUT;
  const insets: GameplayBoardVisualInsets = {
    top: Math.max(0, visualInsets.top ?? DEFAULT_BOARD_VISUAL_INSETS.top),
    right: Math.max(0, visualInsets.right ?? DEFAULT_BOARD_VISUAL_INSETS.right),
    bottom: Math.max(
      metrics.bottomVisualOverflowCells,
      visualInsets.bottom ?? DEFAULT_BOARD_VISUAL_INSETS.bottom,
    ),
    left: Math.max(0, visualInsets.left ?? DEFAULT_BOARD_VISUAL_INSETS.left),
  };
  const maximumCellFromWidth = (
    metrics.logicalWidth - metrics.minimumSideGap * 2
  ) / (insets.left + width + insets.right);
  const maximumCellFromBottom = (
    boosterTop - metrics.minimumBoosterGap - metrics.minimumInnerY
  ) / (height + insets.bottom);
  const cell = Math.max(1, Math.min(
    metrics.maxInnerWidth / width,
    metrics.maxInnerHeight / height,
    metrics.maxCell,
    maximumCellFromWidth,
    maximumCellFromBottom,
    fitCompleteVisualHeight
      ? (boosterTop - metrics.minimumBoosterGap - metrics.minimumVisualTop) / (height + insets.top + insets.bottom)
      : Number.POSITIVE_INFINITY,
  ));
  const innerWidth = width * cell;
  const innerHeight = height * cell;
  const completeVisualWidth = (insets.left + width + insets.right) * cell;
  const innerX = (metrics.logicalWidth - completeVisualWidth) / 2 + insets.left * cell;
  const preferredInnerY = metrics.preferredInnerY + Math.min(
    metrics.maximumPreferredSlack,
    Math.max(0, (metrics.maxInnerHeight - innerHeight) * metrics.preferredSlackRatio),
  );
  const earliestInnerY = Math.max(
    metrics.minimumInnerY,
    metrics.minimumVisualTop + insets.top * cell,
  );
  const latestInnerY = boosterTop
    - metrics.minimumBoosterGap
    - innerHeight
    - cell * insets.bottom;
  const innerY = Math.max(earliestInnerY, Math.min(preferredInnerY, latestInnerY));
  return {
    cell,
    innerWidth,
    innerHeight,
    innerX,
    innerY,
    visualTop: innerY - cell * insets.top,
    visualBottom: innerY + innerHeight + cell * insets.bottom,
  };
};

// Reuse the Home wallet spacing while preserving the gameplay icon's anchor.
const gameplayCoinPlacement = <T extends { x: number; y: number }>(placement: T) => ({
  ...placement,
  x: placement.x + 10,
  y: placement.y + 27,
});

// Coordinates are measured directly from the supplied 720×1584 gameplay
// reference. Bitmaps are drawn at their natural sizes inside one shared
// artboard transform; these placements must not be independently fit.
export const GAMEPLAY_ART_LAYOUT = {
  coin: {
    panel: gameplayCoinPlacement(HOME_ART_LAYOUT.coinPanel),
    icon: gameplayCoinPlacement(HOME_ART_LAYOUT.coinIcon),
    add: gameplayCoinPlacement(HOME_ART_LAYOUT.coinAdd),
    label: gameplayCoinPlacement(HOME_TYPOGRAPHY.coin),
  },
  back: { x: 61, y: 153, width: 88, height: 88 },
  level: { x: 255, y: 155, width: 213, height: 88 },
  levelLabel: { x: 361.5, y: 202 },
  pause: { x: 582, y: 153, width: 88, height: 88 },
  timer: {
    panel: { x: 284, y: 256, width: 152, height: 54 },
    icon: { x: 293, y: 265, width: 30, height: 35 },
    label: { x: 371, y: 288 },
  },
  paceLabel: { x: 360, y: 329 },
  boosters: [
    {
      base: { x: 76, y: 1304, width: 149, height: 149 },
      icon: { x: 99, y: 1326, width: 99, height: 104 },
      badge: { x: 178, y: 1407, width: 45, height: 47 },
      countLabel: { x: 200.5, y: 1434 },
    },
    {
      base: { x: 286, y: 1304, width: 149, height: 149 },
      icon: { x: 314, y: 1327, width: 90, height: 102 },
      badge: { x: 388, y: 1407, width: 45, height: 47 },
      countLabel: { x: 410.5, y: 1434 },
    },
    {
      base: { x: 500, y: 1304, width: 149, height: 149 },
      icon: { x: 526, y: 1332, width: 94, height: 93 },
      badge: { x: 602, y: 1407, width: 45, height: 47 },
      countLabel: { x: 624.5, y: 1434 },
    },
  ],
  typography: {
    level: 31,
    timer: 33,
    coin: HOME_TYPOGRAPHY.coin.size,
    boosterCount: 32,
    pace: 18,
  },
} as const;
