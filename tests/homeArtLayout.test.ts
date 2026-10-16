// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createHash } from "node:crypto";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync, readdirSync } from "node:fs";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  HOME_ARTBOARD,
  HOME_ART_LAYOUT,
  HOME_NAVIGATION_LAYOUT,
  HOME_NAVIGATION_SELECTED_SLOT_WIDTH,
  HOME_NAVIGATION_UNSELECTED_SLOT_WIDTH,
  homeNavigationIconPlacement,
  homeNavigationTabCenterX,
  homeNavigationTabPlacement,
} from "../src/game/homeArtLayout";

const ROOT = ".";
const SOURCE_DIR = resolve(ROOT, "art-source/ui/home-v3");
const RUNTIME_DIR = resolve(ROOT, "public/assets/art/ui/home-v3");

const CUTOUTS = [
  { file: "top-header.png", artProperty: "topHeader", placements: ["header"] },
  { file: "resource-panel.png", artProperty: "resourcePanel", placements: ["coinPanel", "lifePanel"] },
  { file: "coin-icon.png", artProperty: "coinIcon", placements: ["coinIcon"] },
  { file: "heart-icon.png", artProperty: "heartIcon", placements: ["heartIcon"] },
  { file: "add-button.png", artProperty: "addButton", placements: ["coinAdd", "lifeAdd"] },
  { file: "settings-icon.png", artProperty: "settingsButton", placements: ["settings"] },
  { file: "daily-tasks-entry.png", artProperty: "dailyTaskEntry", placements: ["dailyTaskEntry"] },
  { file: "achievements-entry.png", artProperty: "achievementEntry", placements: ["achievementEntry"] },
  { file: "level-plate.png", artProperty: "levelPlate", placements: ["levelPlate"] },
  { file: "arrow-left.png", artProperty: "arrowLeft", placements: ["previousLevel"] },
  { file: "arrow-right.png", artProperty: "arrowRight", placements: ["nextLevel"] },
  { file: "star-left.png", artProperty: "starLeft", placements: ["starLeft"] },
  { file: "star-center.png", artProperty: "starCenter", placements: ["starCenter"] },
  { file: "star-right.png", artProperty: "starRight", placements: ["starRight"] },
  { file: "star-empty-left.png", artProperty: "emptyStarLeft", placements: ["emptyStarLeft"] },
  { file: "star-empty-center.png", artProperty: "emptyStarCenter", placements: ["emptyStarCenter"] },
  { file: "star-empty-right.png", artProperty: "emptyStarRight", placements: ["emptyStarRight"] },
  { file: "start-button.png", artProperty: "startButton", placements: ["start"] },
  { file: "navigation-bar.png", artProperty: "navigationBar", placements: ["navigationBar"] },
  { file: "navigation-selected.png", artProperty: "navigationSelected", placements: ["navigationSelected"] },
  { file: "navigation-divider.png", artProperty: "navigationDivider", placements: ["navigationDividerLeft", "navigationDividerRight"] },
  { file: "shop-icon.png", artProperty: "shopIcon", placements: ["shop"] },
  { file: "shop-icon-locked.png", artProperty: "shopIconLocked", placements: ["shop"] },
  { file: "leaderboard-icon.png", artProperty: "leaderboardIcon", placements: ["leaderboard"] },
  { file: "leaderboard-icon-locked.png", artProperty: "leaderboardIconLocked", placements: ["leaderboard"] },
  { file: "home-icon.png", artProperty: "homeIcon", placements: ["home"] },
  { file: "journey-icon.png", artProperty: "journeyIcon", placements: ["journey"] },
  { file: "journey-icon-locked.png", artProperty: "journeyIconLocked", placements: ["journey"] },
  { file: "collection-icon.png", artProperty: "collectionIcon", placements: ["collection"] },
] as const;

const uint16be = (contents: Uint8Array, offset: number): number => (contents[offset] << 8) | contents[offset + 1];
const uint32be = (contents: Uint8Array, offset: number): number => (
  (contents[offset] * 0x1000000)
  + (contents[offset + 1] << 16)
  + (contents[offset + 2] << 8)
  + contents[offset + 3]
);

const pngSize = (contents: Uint8Array): { width: number; height: number } => {
  const signature = [...contents.subarray(0, 8)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (signature !== "89504e470d0a1a0a") throw new Error("Expected a PNG image");
  return { width: uint32be(contents, 16), height: uint32be(contents, 20) };
};

const jpegSize = (contents: Uint8Array): { width: number; height: number } => {
  if (contents[0] !== 0xff || contents[1] !== 0xd8) throw new Error("Expected a JPEG image");
  const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 8 < contents.length) {
    while (offset < contents.length && contents[offset] !== 0xff) offset += 1;
    while (offset < contents.length && contents[offset] === 0xff) offset += 1;
    const marker = contents[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > contents.length) break;
    const segmentLength = uint16be(contents, offset);
    if (startOfFrameMarkers.has(marker)) {
      return { width: uint16be(contents, offset + 5), height: uint16be(contents, offset + 3) };
    }
    if (segmentLength < 2) break;
    offset += segmentLength;
  }
  throw new Error("JPEG dimensions were not found");
};

const sha256 = (contents: Uint8Array): string => createHash("sha256").update(contents).digest("hex");

describe("Home V3 native artwork layout", () => {
  it("keeps the authored 720x1584 coordinate system and native cutout dimensions", () => {
    expect(HOME_ARTBOARD).toEqual({ width: 720, height: 1584 });
    expect(CUTOUTS).toHaveLength(29);

    for (const cutout of CUTOUTS) {
      const sourceSize = pngSize(readFileSync(resolve(SOURCE_DIR, cutout.file)));
      const runtimeSize = pngSize(readFileSync(resolve(RUNTIME_DIR, cutout.file)));
      expect(runtimeSize, `${cutout.file} runtime dimensions`).toEqual(sourceSize);
      for (const placementName of cutout.placements) {
        const placement = HOME_ART_LAYOUT[placementName];
        expect(
          { width: placement.width, height: placement.height },
          `${placementName} must use ${cutout.file} at native size`,
        ).toEqual(sourceSize);
      }
    }
  });

  it("keeps every lossless cutout byte-identical between source and runtime", () => {
    const expectedFiles = CUTOUTS.map(({ file }) => file).sort();
    const supplementalShortcuts = ["collection-album-entry.png", "side-entry-base.png", "league-entry.png", "daily-challenge-entry.png"];
    const sourceFiles = readdirSync(SOURCE_DIR).filter((file: string) => file.endsWith(".png") && !["background.png", "reference-layout.png", ...supplementalShortcuts].includes(file)).sort();
    const runtimeFiles = readdirSync(RUNTIME_DIR).filter((file: string) => file.endsWith(".png") && !supplementalShortcuts.includes(file)).sort();
    expect(sourceFiles).toEqual(expectedFiles);
    expect(runtimeFiles).toEqual(expectedFiles);

    for (const file of expectedFiles) {
      expect(
        sha256(readFileSync(resolve(RUNTIME_DIR, file))),
        `${file} must be copied without recompression or resizing`,
      ).toBe(sha256(readFileSync(resolve(SOURCE_DIR, file))));
    }
  });

  it("keeps the replacement home background at its supplied 720x1584 dimensions", () => {
    const expected = { width: 720, height: 1584 };
    expect(pngSize(readFileSync(resolve(SOURCE_DIR, "background.png")))).toEqual(expected);
    expect(jpegSize(readFileSync(resolve(RUNTIME_DIR, "background.jpg")))).toEqual(expected);
    expect({ width: HOME_ART_LAYOUT.background.width, height: HOME_ART_LAYOUT.background.height }).toEqual(expected);
  });

  it("expands only the selected navigation slot, icon, and label position", () => {
    expect(HOME_NAVIGATION_SELECTED_SLOT_WIDTH).toBe(204);
    expect(HOME_NAVIGATION_UNSELECTED_SLOT_WIDTH).toBe(129);

    for (const [selectedIndex, selectedTab] of HOME_NAVIGATION_LAYOUT.entries()) {
      let cursor = 0;
      for (const tab of HOME_NAVIGATION_LAYOUT) {
        const width = tab.screen === selectedTab.screen
          ? HOME_NAVIGATION_SELECTED_SLOT_WIDTH
          : HOME_NAVIGATION_UNSELECTED_SLOT_WIDTH;
        const slot = homeNavigationTabPlacement(tab.screen, selectedTab.screen);
        expect(slot.x).toBe(cursor);
        expect(slot.width).toBe(width);
        expect(slot.y).toBe(tab.screen === selectedTab.screen
          ? HOME_ART_LAYOUT.navigationSelected.y
          : HOME_ART_LAYOUT.navigationBar.y);
        expect(homeNavigationTabCenterX(tab.screen, selectedTab.screen)).toBe(cursor + width / 2);
        cursor += width;
      }
      expect(cursor).toBe(HOME_ARTBOARD.width);

      const comparisonTab = HOME_NAVIGATION_LAYOUT[(selectedIndex + 1) % HOME_NAVIGATION_LAYOUT.length];
      const selected = homeNavigationIconPlacement(selectedTab.screen, selectedTab.screen);
      const unselected = homeNavigationIconPlacement(selectedTab.screen, comparisonTab.screen);
      const native = HOME_ART_LAYOUT[selectedTab.icon];
      expect(selected.scale).toBeGreaterThan(unselected.scale);
      expect(selected.width).toBeGreaterThan(unselected.width);
      expect(selected.height).toBeGreaterThan(unselected.height);
      expect(selected.width / selected.height).toBeCloseTo(native.width / native.height, 8);
      expect(unselected.width / unselected.height).toBeCloseTo(native.width / native.height, 8);
    }
  });

  it("keeps source-native draw calls and uses only a uniform context transform for tab emphasis", () => {
    const gamePath = resolve(ROOT, "src/game/ColorEscapeGame.ts");
    const sourceText = readFileSync(gamePath, "utf8");
    const sourceFile = ts.createSourceFile(gamePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const homeMethodNames = new Set([
      "drawStartupStatus",
      "drawGeneratedHome",
      "drawDailyTaskHomeEntry",
      "drawMainNavigation",
      "drawHomeLevelArrows",
    ]);
    const homeMethods: ts.MethodDeclaration[] = [];
    const findHomeMethods = (node: ts.Node): void => {
      if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name) && homeMethodNames.has(node.name.text)) homeMethods.push(node);
      ts.forEachChild(node, findHomeMethods);
    };
    findHomeMethods(sourceFile);
    expect(homeMethods.map((method) => (method.name as ts.Identifier).text).sort()).toEqual([...homeMethodNames].sort());

    const homeMethodText = homeMethods.map((method) => method.getText(sourceFile)).join("\n");
    for (const { artProperty } of CUTOUTS) expect(homeMethodText, `missing Home V3 art property ${artProperty}`).toContain(`ui.${artProperty}`);

    const drawCalls: ts.CallExpression[] = [];
    const findDrawCalls = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node)
        && ts.isPropertyAccessExpression(node.expression)
        && node.expression.name.text === "drawImage"
      ) drawCalls.push(node);
      ts.forEachChild(node, findDrawCalls);
    };
    homeMethods.forEach(findDrawCalls);
    expect(drawCalls.length).toBeGreaterThanOrEqual(20);
    for (const call of drawCalls) {
      const position = sourceFile.getLineAndCharacterOfPosition(call.getStart(sourceFile));
      expect(
        call.arguments,
        `Home V3 drawImage at ${position.line + 1}:${position.character + 1} must use (image, x, y)`,
      ).toHaveLength(3);
    }
    expect(homeMethodText).toContain("ctx.scale(placement.scale, placement.scale)");
  });

  it("keeps the retired generic Daily button removed alongside the distinct task and challenge entries", () => {
    expect("daily" in HOME_ART_LAYOUT).toBe(false);

    const gameSource = readFileSync(resolve(ROOT, "src/game/ColorEscapeGame.ts"), "utf8");
    expect(gameSource).not.toContain('"homeDaily"');
    expect(gameSource).not.toContain("drawDailyHomeButton");
  });
});
