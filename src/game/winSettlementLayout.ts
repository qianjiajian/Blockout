import type { HomeArtPlacement } from "./homeArtLayout";

/**
 * 720×1584 artboard coordinates for the result card.  Dynamic copy is drawn
 * by Canvas; these placements are the replaceable composition contract.
 */
export const WIN_SETTLEMENT_LAYOUT = {
  title: { x: 360, y: 349, size: 60, maxWidth: 430 },
  titleZh: { x: 229, y: 305, width: 263, height: 87 },
  titleEn: { x: 167, y: 303, width: 386, height: 91 },
  levelBadge: { x: 269, y: 514, width: 183, height: 49 },
  levelText: { x: 360, y: 539, size: 30, maxWidth: 163 },
  stars: [
    { x: 206, y: 419, width: 92, height: 93 },
    { x: 307, y: 404, width: 106, height: 108 },
    { x: 425, y: 422, width: 92, height: 93 },
  ] as const satisfies readonly [HomeArtPlacement, HomeArtPlacement, HomeArtPlacement],
  // The supplied panel already contains the inset behind criteria and rewards.
  criteriaPanel: { x: 123, y: 569, width: 474, height: 442 },
  dailyRewardCards: [
    { x: 246, y: 592.5, width: 104, height: 104 },
    { x: 370, y: 592.5, width: 104, height: 104 },
  ] as const satisfies readonly [HomeArtPlacement, HomeArtPlacement],
  criteriaRows: [
    { x: 139, y: 586, width: 442, height: 61 },
    { x: 139, y: 654, width: 442, height: 61 },
    { x: 139, y: 723, width: 442, height: 61 },
  ] as const satisfies readonly [HomeArtPlacement, HomeArtPlacement, HomeArtPlacement],
  rewardArea: { x: 123, y: 784, width: 474, height: 227 },
  coinPile: { x: 251, y: 792, width: 223, height: 143 },
  rewardPill: { x: 277, y: 944, width: 166, height: 58 },
  coinIcon: { x: 297, y: 954, width: 37, height: 38 },
  close: { x: 595, y: 356, width: 94, height: 98 },
  panel: { x: 63, y: 283, width: 594, height: 939 },
  continueButton: { x: 199, y: 1036, width: 322, height: 125 },
  unlock: {
    panel: { x: 26, y: 1279, width: 669, height: 219 },
    crown: { x: 48, y: 1300, width: 46, height: 48 },
    title: { x: 104, y: 1328, size: 35, maxWidth: 372 },
    track: { x: 52, y: 1365, width: 386, height: 51 },
    fill: { x: 59, y: 1371, width: 73, height: 39 },
    segmentGap: 8,
    check: { x: 397, y: 1354, width: 72, height: 77 },
    subtitle: { x: 60, y: 1448, size: 23, maxWidth: 410 },
    frame: { x: 491, y: 1295, width: 164, height: 164 },
    artwork: { x: 501, y: 1305, width: 144, height: 144 },
    targetTitle: { x: 573, y: 1475, size: 23, maxWidth: 205 },
  },
  rank: {
    // Nonmodal notification shown on Home after the confirmed result is closed.
    // Sit in the open sky below the Home resource bar, left of the task entries.
    banner: { x: 26, y: 280, width: 535.2, height: 175.2 },
    source: { width: 669, height: 219 },
    avatar: { x: 40, y: 55, width: 108, height: 108 },
    titleZh: { x: 231, y: 9, width: 206, height: 51 },
    titleEn: { x: 227, y: 11, width: 215, height: 47 },
    ranks: { beforeX: 240, afterX: 445, y: 123, size: 60 },
    arrow: { x: 292, y: 86, width: 106, height: 68 },
    gainArrow: { x: 264, y: 182, width: 20, height: 21 },
    delta: { x: 350, y: 192, size: 21, maxWidth: 218 },
  },
} as const;

export type WinCriterionKind = "clear" | "moves" | "time";

export const DAILY_SUCCESS_LAYOUT = {
  panel: { x: 40, y: 386, width: 640, height: 764 },
  title: { x: 360, y: 458 },
  close: { x: 606, y: 414, width: 94, height: 98 },
  continueButton: { x: 199, y: 958, width: 322, height: 125 },
  rewardCards: [
    { x: 225, y: 649, width: 115, height: 116 },
    { x: 381, y: 649, width: 115, height: 116 },
  ],
} as const;

export const WIN_CRITERION_KINDS: readonly WinCriterionKind[] = ["clear", "moves", "time"];
