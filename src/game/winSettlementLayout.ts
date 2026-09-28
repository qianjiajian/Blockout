import type { HomeArtPlacement } from "./homeArtLayout";

/**
 * 720×1584 artboard coordinates for the result card.  Dynamic copy is drawn
 * by Canvas; these placements are the replaceable composition contract.
 */
export const WIN_SETTLEMENT_LAYOUT = {
  title: { x: 360, y: 360, size: 48, maxWidth: 430 },
  levelBadge: { x: 242, y: 408, width: 236, height: 58 },
  levelText: { x: 360, y: 437, size: 29, maxWidth: 210 },
  stars: [
    { x: 244, y: 465, width: 60, height: 59 },
    { x: 330, y: 457, width: 60, height: 59 },
    { x: 416, y: 465, width: 60, height: 59 },
  ] as const satisfies readonly [HomeArtPlacement, HomeArtPlacement, HomeArtPlacement],
  criteriaPanel: { x: 91, y: 528, width: 538, height: 233 },
  criteriaRows: [
    { x: 108, y: 540, width: 504, height: 61 },
    { x: 108, y: 608, width: 504, height: 61 },
    { x: 108, y: 676, width: 504, height: 61 },
  ] as const satisfies readonly [HomeArtPlacement, HomeArtPlacement, HomeArtPlacement],
  rewardArea: { x: 91, y: 752, width: 538, height: 178 },
  // Scale the reward stack to 80% of its previous 218×182 display size,
  // keeping its centre (266, 841) and the original PNG unchanged.
  coinPile: { x: 178.8, y: 768.2, width: 174.4, height: 145.6 },
  rewardPill: { x: 444, y: 806, width: 178, height: 69 },
  close: { x: 616, y: 336, width: 94, height: 98 },
  panel: { x: 25, y: 287, width: 671, height: 867 },
  continueButton: { x: 199, y: 964, width: 322, height: 125 },
} as const;

export type WinCriterionKind = "clear" | "moves" | "time";

export const WIN_CRITERION_KINDS: readonly WinCriterionKind[] = ["clear", "moves", "time"];
