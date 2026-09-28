// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FORMAL_COLLECTION_LAYOUT,
  FORMAL_JOURNEY_LAYOUT,
  FORMAL_LEADERBOARD_LAYOUT,
  FORMAL_SHOP_LAYOUT,
  JOURNEY_PRESENTATION_LAYOUT,
  LANGUAGE_PICKER_LAYOUT,
  PAUSE_SETTINGS_LAYOUT,
  STATUS_OVERLAY_LAYOUT,
  WIN_ART_LAYOUT,
} from "../src/game/formalPageLayout";
import { GAMEPLAY_ART_LAYOUT } from "../src/game/gameplayArtLayout";
import { HOME_NAVIGATION_LAYOUT, HOME_TYPOGRAPHY } from "../src/game/homeArtLayout";

describe("formal UI typography mapped from the supplied mockups", () => {
  it("locks Home text to fixed sizes and calibrated middle-baseline anchors", () => {
    expect(HOME_TYPOGRAPHY).toEqual({
      coin: { x: 127, y: 80, size: 27, maxWidth: 82 },
      life: { x: 334, y: 80, size: 27, maxWidth: 36, statusSize: 17, statusMaxWidth: 68 },
      level: { x: 356, y: 1180, size: 34 },
      start: { x: 354, y: 1315, size: 43 },
      navigationY: 1567,
    });
    expect(HOME_NAVIGATION_LAYOUT.map(({ screen, labelSize }) => [screen, labelSize])).toEqual([
      ["supply", 26],
      ["leaderboard", 26],
      ["home", 26],
      ["levels", 26],
      ["records", 26],
    ]);
    const game = readFileSync(resolve("src/game/ColorEscapeGame.ts"), "utf8");
    const navigation = game.slice(game.indexOf("private drawMainNavigation(selected:"), game.indexOf("private drawDiscoveryBadge("));
    expect(navigation).toContain("selectedLayout.labelSize");
    expect(navigation).toContain("HOME_ART_LAYOUT.navigationSelected.width - 20");
  });

  it("locks Shop text hierarchy and every repeated row anchor", () => {
    expect(FORMAL_SHOP_LAYOUT.referenceCleanup).toEqual([
      {
        source: { x: 616, y: 1400, width: 104, height: 48 },
        target: { x: 256, y: 1400, width: 104, height: 48 },
      },
      {
        source: { x: 0, y: 1400, width: 100, height: 48 },
        target: { x: 360, y: 1400, width: 100, height: 48 },
      },
    ]);
    expect(FORMAL_SHOP_LAYOUT.referenceCleanup.every(({ target }) => (
      target.y + target.height <= 1448
    ))).toBe(true);
    expect(FORMAL_SHOP_LAYOUT.typography).toEqual({
      coin: { x: 127, y: 80, size: 27, maxWidth: 82 },
      effect: { x: 279, size: 30, maxWidth: 363 },
      stock: { x: 279, size: 31, maxWidth: 218 },
      title: { x: 84, size: 39 },
      buy: { centerYOffset: 40, priceXOffset: 113, lockedSize: 28, fullSize: 30, priceSize: 32 },
      feedback: { x: 360, y: 1300, size: 25 },
    });
    expect(FORMAL_SHOP_LAYOUT.rows.map(({ effectY, stockY, titleY }) => ({ effectY, stockY, titleY }))).toEqual([
      { effectY: 322, stockY: 372, titleY: 497 },
      { effectY: 664, stockY: 714, titleY: 839 },
      { effectY: 1007, stockY: 1057, titleY: 1182 },
    ]);
  });

  it("locks Leaderboard tabs, podium labels, rows, and metrics independently", () => {
    const layout = FORMAL_LEADERBOARD_LAYOUT;
    expect(layout.typography).toEqual({
      coin: { x: 127, y: 80, size: 27, maxWidth: 82 },
      tab: { centerYOffset: 36, size: 30 },
      status: { x: 360, y: 296, size: 19 },
      podiumName: { size: 35, maxWidth: 108 },
      empty: { x: 360, rowYOffset: 70, size: 26 },
      rowRank: { x: 75, size: 32 },
      rowTitle: { x: 205, size: 30 },
      rowDetail: { x: 205, centerYOffset: 32, size: 19 },
      rowMetric: { x: 503, size: 29 },
    });
    expect(layout.tabs.map((tab) => tab.y + layout.typography.tab.centerYOffset)).toEqual([220, 220, 220]);
    expect(layout.podiumSlots.map(({ nameY }) => nameY)).toEqual([442, 474, 472]);
    expect(layout.rowNameCenters[0]).toBe(657);
    expect(layout.rowMetricCenters[0]).toBe(663);
    expect({
      rank: layout.playerRankCenterY,
      name: layout.playerNameCenterY,
      metric: layout.playerMetricCenterY,
      overlap: layout.playerRowOverlap,
    }).toEqual({ rank: 1398, name: 1398, metric: 1397, overlap: 32 });
  });

  it("locks Journey reward, chapter, finale, and progress labels to the long-map geometry", () => {
    expect(FORMAL_JOURNEY_LAYOUT.typography).toEqual({
      segment: { x: 360, y: 1054, size: 24 },
      levelLabel: { x: 197, centerYOffset: 39, size: 28 },
      levelNumber: { x: 197, centerYOffset: 90, size: 48 },
      play: { x: 512, centerYOffset: 70, size: 24 },
      rewardAmount: { x: 522.5, centerYOffset: 105, size: 47 },
      episodeTitle: { x: 360, centerYOffset: 39, size: 35 },
      episodeRange: { x: 356, centerYOffset: 119, size: 24 },
      episodeButton: { x: 356, centerYOffset: 385, size: 24 },
      finaleTitle: { x: 360, centerYOffset: 43, size: 32 },
      finaleLevel: { x: 360, centerYOffset: 381, size: 25 },
      progressLevel: { x: 433, centerYOffset: 0, size: 23 },
    });
    const content = FORMAL_JOURNEY_LAYOUT.journeyContent;
    expect(FORMAL_JOURNEY_LAYOUT.rewardCenters).toEqual([
      { x: 522.5, y: 435.5 },
      { x: 522.5, y: 624.5 },
      { x: 522.5, y: 806.5 },
    ]);
    expect(FORMAL_JOURNEY_LAYOUT.typography.levelLabel.x).toBeLessThan(360);
    expect(FORMAL_JOURNEY_LAYOUT.typography.rewardAmount.x).toBeGreaterThan(360);
    expect(content.episodeImage.yOffset + content.episodeImage.height).toBeLessThanOrEqual(content.episodeHeight);
    expect(content.episodeButton.yOffset + content.episodeButton.height).toBeLessThanOrEqual(content.episodeHeight);
    expect(content.finaleImage.yOffset + content.finaleImage.height).toBeLessThanOrEqual(content.finaleHeight);
    expect(FORMAL_JOURNEY_LAYOUT.typography.progressLevel.x).toBe(
      content.progressBadge.x + content.progressBadge.width / 2,
    );
  });

  it("locks the Cut 3 Journey and status popup compositions to their reference coordinates", () => {
    expect(JOURNEY_PRESENTATION_LAYOUT).toEqual({
      overlay: { color: "#000000", alpha: 199 / 255 },
      panel: { x: 25, y: 287, width: 671, height: 867 },
      close: { x: 616, y: 336, width: 94, height: 98 },
      button: { x: 199, y: 943, width: 322, height: 125 },
      episodeTitle: { x: 105, y: 310, width: 510, height: 95 },
      rewardsTitle: { x: 99, y: 301, width: 518, height: 98 },
      episodeImage: { x: 237, y: 476, width: 246, height: 237 },
      rewardCenter: { x: 360, y: 603 },
      typography: {
        level: { x: 360, y: 765, size: 38, fill: "#8c432a" },
        name: { x: 360, y: 854, size: 55, fill: "#fff5c9", stroke: "#d24600", lineWidth: 3 },
        episodeButton: { x: 360, y: 1006, size: 31, fill: "#ffffff", stroke: "#10520b", lineWidth: 3 },
        rewardButton: { x: 360, y: 1006, size: 40, fill: "#ffffff", stroke: "#10520b", lineWidth: 3 },
        error: { x: 360, y: 1106, size: 22, fill: "#b82f45", stroke: "#fff4e4", lineWidth: 2 },
      },
    });
    expect(STATUS_OVERLAY_LAYOUT).toEqual({
      overlay: { color: "#000000", alpha: 0.5 },
      panel: { x: 59, y: 298, width: 594, height: 889 },
      title: { x: 356, y: 360, size: 30, fill: "#ffffff", stroke: "#381ea2", lineWidth: 3 },
      timeout: {
        title: { x: 356, y: 363, size: 60, maxWidth: 330, fill: "#ffffff", stroke: "#381ea2", lineWidth: 4 },
        clock: { x: 272, y: 516, width: 188, height: 203 },
        remainingPanel: { x: 143, y: 779, width: 427, height: 57 },
        remainingText: { x: 356, y: 808, size: 30, fill: "#673817" },
        replayButton: { x: 114, y: 994, width: 225, height: 84 },
        homeButton: { x: 377, y: 994, width: 225, height: 84 },
        actionText: { y: 1037, size: 36 },
      },
      feature: {
        iceDoor: { x: 194, y: 574, width: 315, height: 97 },
        visualCenter: { x: 352, y: 622 },
        description: { x: 158, y: 806, maxWidth: 410, lineHeight: 44, size: 30, fill: "#713a19" },
        button: { x: 242, y: 1003, width: 225, height: 84 },
        buttonText: { x: 354, y: 1045, size: 30, fill: "#ffffff", stroke: "#10520b", lineWidth: 3 },
      },
    });
  });

  it("uses every explicitly annotated Collection, pause/settings, gameplay, and win size", () => {
    expect(FORMAL_COLLECTION_LAYOUT.typography.title).toMatchObject({ size: 51, x: 360, y: 294 });
    expect(FORMAL_COLLECTION_LAYOUT.typography.cardTitle).toMatchObject({ size: 27, centerYOffset: 176 });
    expect(FORMAL_COLLECTION_LAYOUT.typography.detailTitle).toMatchObject({ size: 30, x: 369.5, y: 1087.5 });
    expect(FORMAL_COLLECTION_LAYOUT.typography.detailBody).toMatchObject({
      size: 26,
      x: 134,
      y: 1165,
      lineHeight: 44,
      align: "left",
    });
    expect(PAUSE_SETTINGS_LAYOUT.overlay).toEqual({ color: "#000000", alpha: 0.72 });
    expect(STATUS_OVERLAY_LAYOUT.timeout.title.size).toBe(PAUSE_SETTINGS_LAYOUT.typography.title.size);
    expect(STATUS_OVERLAY_LAYOUT.timeout.title.x).toBe(STATUS_OVERLAY_LAYOUT.panel.x + STATUS_OVERLAY_LAYOUT.panel.width / 2);
    expect(PAUSE_SETTINGS_LAYOUT.typography).toMatchObject({
      title: { x: 360, settingsY: 381, pauseY: 375, size: 60 },
      rowLabel: { x: 263, size: 46 },
      action: { y: 1065, size: 36, settingsX: 360, pauseX: [228.5, 492.5] },
    });
    expect(PAUSE_SETTINGS_LAYOUT.rows.map(({ labelY }) => labelY)).toEqual([586, 716, 848]);
    expect(PAUSE_SETTINGS_LAYOUT).toMatchObject({
      replayButton: { x: 116, y: 1017, width: 225, height: 84 },
      homeButton: { x: 380, y: 1017, width: 225, height: 84 },
      languageButton: { x: 116, y: 1017, width: 225, height: 84 },
      settingsClearButton: { x: 380, y: 1017, width: 225, height: 84 },
    });
    expect(LANGUAGE_PICKER_LAYOUT).toEqual({
      overlay: { color: "#000000", alpha: 0.72 },
      panel: { x: 63, y: 310, width: 594, height: 889 },
      close: { x: 574, y: 342, width: 94, height: 98 },
      title: { x: 360, y: 381, size: 60, fill: "#ffffff", stroke: "#381ea2", lineWidth: 4 },
      options: [
        { x: 116, y: 480, width: 225, height: 100 },
        { x: 380, y: 480, width: 225, height: 100 },
        { x: 116, y: 604, width: 225, height: 100 },
        { x: 380, y: 604, width: 225, height: 100 },
        { x: 116, y: 728, width: 225, height: 100 },
        { x: 380, y: 728, width: 225, height: 100 },
        { x: 116, y: 852, width: 225, height: 100 },
        { x: 380, y: 852, width: 225, height: 100 },
        { x: 116, y: 976, width: 225, height: 100 },
        { x: 380, y: 976, width: 225, height: 100 },
      ],
    });
    expect(GAMEPLAY_ART_LAYOUT.typography).toMatchObject({ level: 31, timer: 33, boosterCount: 32 });
    expect(GAMEPLAY_ART_LAYOUT).toMatchObject({
      coin: { label: { x: 146, y: 107, maxWidth: 98 } },
      levelLabel: { x: 361.5, y: 202 },
      timer: { label: { x: 371, y: 288 } },
    });
    expect(GAMEPLAY_ART_LAYOUT.boosters.map(({ countLabel }) => countLabel)).toEqual([
      { x: 200.5, y: 1434 },
      { x: 410.5, y: 1434 },
      { x: 624.5, y: 1434 },
    ]);
    expect(WIN_ART_LAYOUT.rewardText).toMatchObject({ designSize: 28, renderSize: 44, x: 360, y: 838 });
    expect(WIN_ART_LAYOUT.continueText).toMatchObject({ designSize: 28, renderSize: 44, x: 360, y: 1027 });
  });

  it("does not resize reference-backed Home text from string length at runtime", () => {
    const source = readFileSync(resolve("src/game/ColorEscapeGame.ts"), "utf8");
    expect(source).not.toContain("lifeText.length");
    expect(source).not.toContain("selectedLayout.label.length");
    expect(source).not.toContain("layout.rowNameCenters[0]");
    expect(source).not.toContain("layout.rowMetricCenters[0]");
    expect(source).toContain("HOME_TYPOGRAPHY.life.size");
    expect(source).toContain("selectedLayout.labelSize");
    expect(source).toContain("journeyView.entries.forEach((entry)");
    expect(source).toContain("layout.typography.episodeTitle.size");
    expect(source).toContain("layout.typography.episodeRange.size");
    expect(source).toContain("layout.typography.episodeButton.size");
    expect(source).toContain("layout.typography.finaleTitle.size");
    expect(source).toContain("layout.typography.finaleLevel.size");
    expect(source).not.toContain("layout.typography.progressLevel.size");
  });
});
