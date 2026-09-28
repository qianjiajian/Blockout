import { describe, expect, it } from "vitest";
import { DAILY_TASK_LAYOUT, dailyTaskRows } from "../src/game/dailyTaskLayout";
import { HOME_ART_LAYOUT } from "../src/game/homeArtLayout";

describe("daily task layout", () => {
  it("keeps the supplied Daily shortcut above Achievements with matching hit bounds", () => {
    expect(DAILY_TASK_LAYOUT.homeEntryHit).toEqual(DAILY_TASK_LAYOUT.homeEntry);
    expect(DAILY_TASK_LAYOUT.homeEntry.y).toBeGreaterThan(HOME_ART_LAYOUT.header.height);
    expect(DAILY_TASK_LAYOUT.homeEntry.y + DAILY_TASK_LAYOUT.homeEntry.height)
      .toBeLessThan(HOME_ART_LAYOUT.achievementEntry.y);
  });

  it("lays out exactly three non-overlapping task rows inside the modal", () => {
    const rows = dailyTaskRows(["clear-levels", "earn-stars", "perfect-clear"]);
    expect(rows).toHaveLength(3);
    rows.forEach((row, index) => {
      expect(row.row.y).toBe(DAILY_TASK_LAYOUT.rowTop[index]);
      expect(row.claim.x).toBeGreaterThan(row.progress.x);
      expect(row.row.x).toBeGreaterThanOrEqual(DAILY_TASK_LAYOUT.panel.x);
      expect(row.row.x + row.row.width).toBeLessThanOrEqual(DAILY_TASK_LAYOUT.panel.x + DAILY_TASK_LAYOUT.panel.width);
    });
    expect(rows[1].row.y).toBeGreaterThanOrEqual(rows[0].row.y + rows[0].row.height);
  });

  it("uses the supplied artboard anchors, native button sizes, and reference typography", () => {
    expect(DAILY_TASK_LAYOUT.panel).toEqual({ x: 63, y: 326, width: 594, height: 889 });
    expect(DAILY_TASK_LAYOUT.summary).toEqual({ x: 122, y: 486, width: 476, height: 66 });
    expect(DAILY_TASK_LAYOUT.bonus).toEqual({ x: 98, y: 1012, width: 524, height: 113 });
    expect(DAILY_TASK_LAYOUT.bonusReward.x + DAILY_TASK_LAYOUT.bonusReward.width / 2)
      .toBe(DAILY_TASK_LAYOUT.bonusClaim.x + DAILY_TASK_LAYOUT.bonusClaim.width / 2);
    expect(DAILY_TASK_LAYOUT.bonusReward.y + DAILY_TASK_LAYOUT.bonusReward.height)
      .toBeLessThanOrEqual(DAILY_TASK_LAYOUT.bonusClaim.y);
    const rows = dailyTaskRows(["perfect-clear", "use-booster", "booster-free"]);
    expect(rows.map((row) => row.icon)).toEqual([
      { x: 142, y: 595, width: 70, height: 90 },
      { x: 140, y: 738, width: 71, height: 77 },
      { x: 147, y: 879, width: 59, height: 68 },
    ]);
    expect(rows.map((row) => row.claim.y)).toEqual([633, 761, 893]);
    expect(rows.map((row) => row.reward.y)).toEqual([596, 724, 856]);
    expect(rows.every((row) => row.reward.y + row.reward.height <= row.claim.y)).toBe(true);
    expect(rows.map((row) => row.row)).toEqual([587, 718, 852].map((y) => ({ x: 130, y, width: 458, height: 115 })));
    expect(rows.every((row) => row.claim.width === 120 && row.claim.height === 53)).toBe(true);
    expect(DAILY_TASK_LAYOUT.bonusReward).toEqual({ x: 512, y: 1020, width: 70, height: 31 });
    expect(DAILY_TASK_LAYOUT.bonusClaim).toEqual({ x: 487, y: 1054, width: 120, height: 53 });
    expect(DAILY_TASK_LAYOUT.reset).toEqual({ x: 457, y: 1054, width: 180, height: 53 });
    expect(DAILY_TASK_LAYOUT.typography).toEqual({ summary: 36, taskTitle: 30, description: 20, progress: 20, button: 20, bonusTitle: 30, reset: 18 });
    expect(DAILY_TASK_LAYOUT.title.size).toBe(48);
  });
});
