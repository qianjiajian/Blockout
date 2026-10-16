import type { HomeArtPlacement } from "./homeArtLayout";

export const ACHIEVEMENT_LAYOUT = {
  homeEntryText: { x: 651, y: 632, size: 21, maxWidth: 132 },
  overlay: { color: "#000000", alpha: 0.72 },
  panel: { x: 63, y: 326, width: 594, height: 889 },
  close: { x: 587, y: 358, width: 94, height: 98 },
  title: { x: 360, y: 392, size: 48 },
  summary: { x: 122, y: 486, width: 476, height: 66 },
  viewport: { x: 98, y: 566, width: 524, height: 592 },
  row: { x: 108, y: 574, width: 504, height: 96 },
  rowActive: { x: 100.5, y: 568.5, width: 519, height: 115 },
  rowInactive: { x: 101.5, y: 569, width: 517, height: 114 },
  rowPitch: 110,
  badge: { x: 124, y: 581, width: 82, height: 79 },
  claimButton: { x: 472, y: 606, width: 120, height: 53 },
  claimedCheck: { x: 492, y: 580, width: 80, height: 80 },
  reward: { x: 486, y: 582, width: 90, height: 23 },
  progress: { x: 218, y: 635, width: 229, height: 21 },
  typography: { summary: 30, name: 24, description: 16, progress: 20, button: 20 },
  retry: { x: 226, y: 680, width: 268, height: 82 },
} as const satisfies {
  overlay: { color: string; alpha: number };
  homeEntryText: { x: number; y: number; size: number; maxWidth: number };
  panel: HomeArtPlacement;
  close: HomeArtPlacement;
  title: { x: number; y: number; size: number };
  summary: HomeArtPlacement;
  viewport: HomeArtPlacement;
  row: HomeArtPlacement;
  rowActive: HomeArtPlacement;
  rowInactive: HomeArtPlacement;
  rowPitch: number;
  badge: HomeArtPlacement;
  claimButton: HomeArtPlacement;
  claimedCheck: HomeArtPlacement;
  reward: HomeArtPlacement;
  progress: HomeArtPlacement;
  typography: { summary: number; name: number; description: number; progress: number; button: number };
  retry: HomeArtPlacement;
};

export const achievementRowPlacement = (index: number, scrollOffset: number): HomeArtPlacement => ({
  ...ACHIEVEMENT_LAYOUT.row,
  y: ACHIEVEMENT_LAYOUT.row.y + index * ACHIEVEMENT_LAYOUT.rowPitch - scrollOffset,
});

/** Supplied row PNGs include their own border and shadow beyond the content box. */
export const achievementRowBackgroundPlacement = (
  index: number, scrollOffset: number, claimable: boolean,
): HomeArtPlacement => {
  const background = claimable ? ACHIEVEMENT_LAYOUT.rowActive : ACHIEVEMENT_LAYOUT.rowInactive;
  return { ...background, y: background.y + index * ACHIEVEMENT_LAYOUT.rowPitch - scrollOffset };
};

export const achievementBadgePlacement = (index: number, scrollOffset: number): HomeArtPlacement => ({
  ...ACHIEVEMENT_LAYOUT.badge,
  y: ACHIEVEMENT_LAYOUT.badge.y + index * ACHIEVEMENT_LAYOUT.rowPitch - scrollOffset,
});

export const achievementClaimPlacement = (index: number, scrollOffset: number): HomeArtPlacement => ({
  ...ACHIEVEMENT_LAYOUT.claimButton,
  y: ACHIEVEMENT_LAYOUT.claimButton.y + index * ACHIEVEMENT_LAYOUT.rowPitch - scrollOffset,
});

export const achievementClaimedCheckPlacement = (index: number, scrollOffset: number): HomeArtPlacement => ({
  ...ACHIEVEMENT_LAYOUT.claimedCheck,
  y: ACHIEVEMENT_LAYOUT.claimedCheck.y + index * ACHIEVEMENT_LAYOUT.rowPitch - scrollOffset,
});

export const achievementScrollMaximum = (entryCount: number): number => Math.max(
  0,
  ACHIEVEMENT_LAYOUT.rowActive.y + Math.max(0, entryCount - 1) * ACHIEVEMENT_LAYOUT.rowPitch
    + (entryCount > 0 ? ACHIEVEMENT_LAYOUT.rowActive.height : 0)
    - (ACHIEVEMENT_LAYOUT.viewport.y + ACHIEVEMENT_LAYOUT.viewport.height - 8),
);
