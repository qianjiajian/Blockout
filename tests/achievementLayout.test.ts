import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_LAYOUT,
  achievementBadgePlacement,
  achievementClaimPlacement,
  achievementRowBackgroundPlacement,
  achievementRowPlacement,
  achievementScrollMaximum,
} from "../src/game/achievementLayout";
import { HOME_ART_LAYOUT } from "../src/game/homeArtLayout";

describe("achievement UI layout", () => {
  it("keeps the Home entry in the right shortcut column above the level controls", () => {
    const entry = HOME_ART_LAYOUT.achievementEntry;
    expect(entry.x).toBe(HOME_ART_LAYOUT.dailyTaskEntry.x);
    expect(entry.x).toBeGreaterThan(HOME_ART_LAYOUT.background.width / 2);
    expect(entry.x + entry.width).toBeLessThan(HOME_ART_LAYOUT.background.width);
    expect(entry.y).toBeGreaterThan(HOME_ART_LAYOUT.header.height);
    expect(entry.y + entry.height).toBeLessThan(HOME_ART_LAYOUT.levelPlate.y);
  });

  it("moves every row-owned element by the same scroll offset", () => {
    const offset = 211;
    const index = 5;
    const row = achievementRowPlacement(index, offset);
    const badge = achievementBadgePlacement(index, offset);
    const claim = achievementClaimPlacement(index, offset);
    expect(badge.y - row.y).toBe(ACHIEVEMENT_LAYOUT.badge.y - ACHIEVEMENT_LAYOUT.row.y);
    expect(claim.y - row.y).toBe(ACHIEVEMENT_LAYOUT.claimButton.y - ACHIEVEMENT_LAYOUT.row.y);
  });

  it("provides a real scrolling range for the 19-achievement catalog", () => {
    expect(achievementScrollMaximum(19)).toBeGreaterThan(ACHIEVEMENT_LAYOUT.viewport.height);
    expect(achievementScrollMaximum(0)).toBe(0);
  });

  it("matches the supplied reference typography and native cutout dimensions", () => {
    expect(ACHIEVEMENT_LAYOUT.panel).toEqual({ x: 63, y: 326, width: 594, height: 889 });
    expect(ACHIEVEMENT_LAYOUT.close).toEqual({ x: 587, y: 358, width: 94, height: 98 });
    expect(ACHIEVEMENT_LAYOUT.summary).toEqual({ x: 122, y: 486, width: 476, height: 66 });
    expect(ACHIEVEMENT_LAYOUT.badge).toEqual({ x: 124, y: 581, width: 82, height: 79 });
    expect(ACHIEVEMENT_LAYOUT.claimButton).toEqual({ x: 472, y: 606, width: 120, height: 53 });
    expect(ACHIEVEMENT_LAYOUT.reward).toEqual({ x: 486, y: 582, width: 90, height: 23 });
    expect(ACHIEVEMENT_LAYOUT.title.size).toBe(48);
    expect(ACHIEVEMENT_LAYOUT.typography).toEqual({ summary: 30, name: 24, description: 16, progress: 20, button: 20 });
  });

  it("keeps the last row fully visible at the end of the expanded list", () => {
    const viewport = ACHIEVEMENT_LAYOUT.viewport;
    for (const count of [1, 4, 5, 19]) {
      const row = achievementRowPlacement(count - 1, achievementScrollMaximum(count));
      const claim = achievementClaimPlacement(count - 1, achievementScrollMaximum(count));
      expect(row.y).toBeGreaterThanOrEqual(viewport.y);
      expect(row.y + row.height).toBeLessThanOrEqual(viewport.y + viewport.height);
      expect(claim.y + claim.height).toBeLessThanOrEqual(row.y + row.height);
      for (const active of [false, true]) {
        const background = achievementRowBackgroundPlacement(count - 1, achievementScrollMaximum(count), active);
        expect(background.y).toBeGreaterThanOrEqual(viewport.y);
        expect(background.y + background.height).toBeLessThanOrEqual(viewport.y + viewport.height);
        expect(background.x).toBeGreaterThanOrEqual(viewport.x);
        expect(background.x + background.width).toBeLessThanOrEqual(viewport.x + viewport.width);
      }
    }
    expect(viewport.y + viewport.height).toBeLessThanOrEqual(ACHIEVEMENT_LAYOUT.panel.y + ACHIEVEMENT_LAYOUT.panel.height);
  });

  it("centers native supplied active and inactive plates without moving content", () => {
    expect(achievementRowBackgroundPlacement(0, 0, true)).toEqual({ x: 100.5, y: 568.5, width: 519, height: 115 });
    expect(achievementRowBackgroundPlacement(0, 0, false)).toEqual({ x: 101.5, y: 569, width: 517, height: 114 });
    const background = achievementRowBackgroundPlacement(3, 42, true);
    expect(background.y).toBe(568.5 + 330 - 42);
    expect(background.x + background.width / 2).toBe(360);
    expect(achievementClaimPlacement(0, 0)).toEqual({ x: 472, y: 606, width: 120, height: 53 });
  });
});
