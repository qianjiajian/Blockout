import type { DailyTaskId } from "../core/dailyTasks";
import { HOME_ART_LAYOUT } from "./homeArtLayout";

export interface DailyTaskRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DailyTaskRowLayout {
  id: DailyTaskId;
  row: DailyTaskRect;
  icon: DailyTaskRect;
  title: DailyTaskRect;
  description: DailyTaskRect;
  progress: DailyTaskRect;
  reward: DailyTaskRect;
  claim: DailyTaskRect;
}

export const DAILY_TASK_ARTBOARD = { width: 720, height: 1584 } as const;

export const DAILY_TASK_LAYOUT = {
  overlay: { color: "#140b4a", alpha: 0.72 },
  homeEntry: HOME_ART_LAYOUT.dailyTaskEntry,
  homeEntryHit: HOME_ART_LAYOUT.dailyTaskEntry,
  panel: { x: 63, y: 326, width: 594, height: 889 },
  title: { x: 360, y: 394, size: 48, maxWidth: 310 },
  close: { x: 587, y: 358, width: 94, height: 98 },
  summary: { x: 122, y: 486, width: 476, height: 66 },
  summaryIcon: { x: 192, y: 490, width: 53, height: 54 },
  summaryText: { x: 252, y: 494, width: 326, height: 48 },
  row: { x: 130, y: 587, width: 458, height: 115 },
  rowTop: [587, 718, 852],
  rowIconCenterY: [640, 776.5, 913],
  rowTitle: { x: 217, y: 605, width: 220, height: 36 },
  rowDescription: { x: 221, y: 642, width: 217, height: 26 },
  rowProgress: { x: 216, y: 667, width: 189, height: 27 },
  rowProgressTop: [667, 798, 931],
  rowClaim: { x: 447, y: 623, width: 120, height: 53 },
  rowClaimTop: [633, 761, 893],
  bonus: { x: 98, y: 1012, width: 524, height: 113 },
  bonusChest: { x: 111, y: 1026, width: 85, height: 75 },
  bonusTitle: { x: 207, y: 1024, width: 250, height: 40 },
  bonusTrack: { x: 207, y: 1066, width: 189, height: 27 },
  bonusReward: { x: 512, y: 1020, width: 70, height: 31 },
  bonusClaim: { x: 487, y: 1054, width: 120, height: 53 },
  reset: { x: 457, y: 1054, width: 180, height: 53 },
  typography: { summary: 36, taskTitle: 30, description: 20, progress: 20, button: 20, bonusTitle: 30, reset: 18 },
} as const;

const shifted = (rect: DailyTaskRect, offsetY: number): DailyTaskRect => ({
  ...rect,
  y: rect.y + offsetY,
});

export const dailyTaskRowLayout = (id: DailyTaskId, index: number): DailyTaskRowLayout => {
  const slot = Math.max(0, Math.min(2, Math.floor(index)));
  const offsetY = DAILY_TASK_LAYOUT.rowTop[slot] - DAILY_TASK_LAYOUT.row.y;
  const iconSize = id === "use-booster" ? { width: 71, height: 77 }
    : id === "booster-free" ? { width: 59, height: 68 }
      : id === "clear-levels" ? { width: 53, height: 54 }
        : { width: 70, height: 90 };
  return {
    id,
    row: shifted(DAILY_TASK_LAYOUT.row, offsetY),
    icon: {
      x: id === "use-booster" ? 140 : id === "booster-free" ? 147 : id === "clear-levels" ? 150 : 142,
      y: Math.floor(DAILY_TASK_LAYOUT.rowIconCenterY[slot] - iconSize.height / 2),
      ...iconSize,
    },
    title: shifted(DAILY_TASK_LAYOUT.rowTitle, offsetY),
    description: shifted(DAILY_TASK_LAYOUT.rowDescription, offsetY),
    progress: { ...DAILY_TASK_LAYOUT.rowProgress, y: DAILY_TASK_LAYOUT.rowProgressTop[slot] },
    reward: { ...DAILY_TASK_LAYOUT.rowClaim, y: DAILY_TASK_LAYOUT.rowClaimTop[slot] - 37, height: 31 },
    claim: { ...DAILY_TASK_LAYOUT.rowClaim, y: DAILY_TASK_LAYOUT.rowClaimTop[slot] },
  };
};

export const dailyTaskRows = (ids: readonly DailyTaskId[]): DailyTaskRowLayout[] => (
  ids.slice(0, 3).map((id, index) => dailyTaskRowLayout(id, index))
);
