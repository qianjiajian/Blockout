import { HOME_ART_LAYOUT } from "./homeArtLayout";

/**
 * Reference-matched daily challenge composition on the 720x1584 home
 * artboard. Each piece of chrome is an independent image and all drawing
 * and hit testing use these same coordinates.
 */
export const DAILY_CHALLENGE_LAYOUT = {
  entry: HOME_ART_LAYOUT.dailyChallengeEntry,
  overlay: { color: "#140b4a", alpha: 0.72 },
  panel: { x: 63, y: 312, width: 594, height: 937 },
  header: { x: 180, y: 312, width: 360, height: 136 },
  title: { x: 360, y: 375, size: 50, maxWidth: 320 },
  close: { x: 574, y: 341, width: 94, height: 98 },
  rewardBanner: { x: 109, y: 473, width: 499, height: 235 },
  bannerTitle: { x: 360, y: 509, size: 39 },
  attemptsPanel: { x: 80, y: 475, width: 204, height: 70 },
  attemptsTitle: { x: 449, y: 680, size: 25 },
  attemptsValue: { x: 587, y: 680, size: 25 },
  reset: { x: 360, y: 738, size: 25 },
  recovery: { x: 360, y: 1135, size: 20 },
  row: { x: 109, y: 770, width: 499, height: 122, pitch: 142 },
  rowButton: { x: 445, y: 792, width: 147, height: 72 },
  hint: { x: 360, y: 1195, size: 21 },
} as const;

export type DailyChallengeRect = { x: number; y: number; width: number; height: number };

export const dailyChallengeRowRect = (index: number): DailyChallengeRect => ({
  ...DAILY_CHALLENGE_LAYOUT.row,
  y: DAILY_CHALLENGE_LAYOUT.row.y + Math.max(0, Math.min(2, Math.floor(index))) * DAILY_CHALLENGE_LAYOUT.row.pitch,
});

export const dailyChallengeRowButtonRect = (index: number): DailyChallengeRect => ({
  ...DAILY_CHALLENGE_LAYOUT.rowButton,
  y: DAILY_CHALLENGE_LAYOUT.rowButton.y + Math.max(0, Math.min(2, Math.floor(index))) * DAILY_CHALLENGE_LAYOUT.row.pitch,
});

export const dailyChallengeRowCompletedRect = (index: number): DailyChallengeRect => {
  const button = dailyChallengeRowButtonRect(index);
  return { x: button.x + (button.width - 80) / 2, y: button.y + (button.height - 80) / 2, width: 80, height: 80 };
};
