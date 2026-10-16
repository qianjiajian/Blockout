// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createHash } from "node:crypto";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import {
  fitGameplayBoard,
  GAMEPLAY_ARTBOARD,
  GAMEPLAY_ART_LAYOUT,
  GAMEPLAY_BOARD_LAYOUT,
} from "../src/game/gameplayArtLayout";

const ROOT = ".";
const gameSource = readFileSync(resolve(ROOT, "src/game/ColorEscapeGame.ts"), "utf8");
const LOGICAL_GAMEPLAY_VIEWPORT = { width: 496, height: 1078 } as const;
const GAMEPLAY_ARTBOARD_SCALE = LOGICAL_GAMEPLAY_VIEWPORT.width / GAMEPLAY_ARTBOARD.width;
const GAMEPLAY_ARTBOARD_OFFSET_Y = (
  LOGICAL_GAMEPLAY_VIEWPORT.height - GAMEPLAY_ARTBOARD.height * GAMEPLAY_ARTBOARD_SCALE
) / 2;
const GAMEPLAY_BOOSTER_TOP = GAMEPLAY_ARTBOARD_OFFSET_Y + Math.min(
  ...GAMEPLAY_ART_LAYOUT.boosters.map(({ base }) => base.y),
) * GAMEPLAY_ARTBOARD_SCALE;
const LAYOUT_EPSILON = 1e-9;

const pngSize = (contents: Uint8Array): { width: number; height: number } => {
  const signature = [...contents.subarray(0, 8)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (signature !== "89504e470d0a1a0a") throw new Error("Expected a PNG image");
  const uint32be = (offset: number): number => (
    (contents[offset] * 0x1000000)
    + (contents[offset + 1] << 16)
    + (contents[offset + 2] << 8)
    + contents[offset + 3]
  );
  return { width: uint32be(16), height: uint32be(20) };
};

const sha256 = (contents: Uint8Array): string => createHash("sha256").update(contents).digest("hex");

const CUTOUTS = [
  { file: "back-button.png", placements: [GAMEPLAY_ART_LAYOUT.back] },
  { file: "pause-button.png", placements: [GAMEPLAY_ART_LAYOUT.pause] },
  { file: "level-pill.png", placements: [GAMEPLAY_ART_LAYOUT.level] },
  { file: "timer-icon.png", placements: [GAMEPLAY_ART_LAYOUT.timer.icon] },
  { file: "timer-panel.png", placements: [GAMEPLAY_ART_LAYOUT.timer.panel] },
  { file: "booster-base.png", placements: GAMEPLAY_ART_LAYOUT.boosters.map(({ base }) => base) },
  { file: "booster-count-badge.png", placements: GAMEPLAY_ART_LAYOUT.boosters.map(({ badge }) => badge) },
  { file: "booster-time.png", placements: [GAMEPLAY_ART_LAYOUT.boosters[0].icon] },
  { file: "booster-rocket.png", placements: [GAMEPLAY_ART_LAYOUT.boosters[1].icon] },
  { file: "booster-pulse.png", placements: [GAMEPLAY_ART_LAYOUT.boosters[2].icon] },
] as const;

const FORMAL_FROZEN_BLOCKS = [
  { file: "ice-cell.png", width: 95, height: 104 },
  { file: "ice-vertical-2.png", width: 95, height: 199 },
  { file: "ice-vertical-3.png", width: 95, height: 294 },
  { file: "ice-horizontal-2.png", width: 190, height: 104 },
  { file: "ice-horizontal-3.png", width: 285, height: 104 },
  { file: "ice-l-triomino.png", width: 191, height: 199 },
  { file: "ice-s-tetromino.png", width: 285, height: 199 },
  { file: "ice-t-tetromino.png", width: 285, height: 199 },
  { file: "ice-square-2x2.png", width: 192, height: 199 },
] as const;

const COPIED_ASSETS = [
  ...CUTOUTS.map(({ file }) => ({
    file,
    source: resolve(ROOT, "art-source/ui/gameplay-v1", file),
    runtime: resolve(ROOT, "public/assets/art/ui/gameplay-v1", file),
  })),
  {
    file: "booster-plus.png",
    source: resolve(ROOT, "art-source/ui/gameplay-v1/booster-plus.png"),
    runtime: resolve(ROOT, "public/assets/art/ui/gameplay-v1/booster-plus.png"),
  },
  {
    file: "empty-cells-2x2.png",
    source: resolve(ROOT, "art-source/gameplay/board/formal-floor-v1/empty-cells-2x2.png"),
    runtime: resolve(ROOT, "public/assets/art/gameplay/board/formal-floor-v1/empty-cells-2x2.png"),
  },
  {
    file: "selection-frame.png",
    source: resolve(ROOT, "art-source/fx/formal-gameplay-v1/selection-frame.png"),
    runtime: resolve(ROOT, "public/assets/art/fx/formal-gameplay-v1/selection-frame.png"),
  },
] as const;

const TRANSFORMED_ASSETS = [
  {
    file: "gameplay-formal-v1.png",
    source: resolve(ROOT, "art-source/backgrounds/gameplay-formal-v1.png"),
    runtime: resolve(ROOT, "public/assets/art/backgrounds/gameplay-formal-v1.png"),
  },
  ...FORMAL_FROZEN_BLOCKS.map(({ file }) => ({
    file,
    source: resolve(ROOT, "art-source/gameplay/mechanics/formal-gameplay-v1", file),
    runtime: resolve(ROOT, "public/assets/art/gameplay/mechanics/formal-gameplay-v1", file),
  })),
] as const;

describe("formal gameplay artwork layout", () => {
  it("fits the 6x8 Lv10 board above the fixed formal booster row including visible rail overflow", () => {
    const level = LEVELS.find(({ id }) => id === 10);
    expect(level).toBeDefined();
    expect({ width: level!.width, height: level!.height }).toEqual({ width: 6, height: 8 });

    const fitted = fitGameplayBoard(level!.width, level!.height, GAMEPLAY_BOOSTER_TOP);
    const visualGap = GAMEPLAY_BOOSTER_TOP - fitted.visualBottom;
    expect(GAMEPLAY_BOOSTER_TOP).toBeCloseTo(891.7111111111, 10);
    expect(fitted.cell).toBe(67);
    expect(level!.width * fitted.cell).toBe(402);
    expect(fitted.innerHeight).toBe(536);
    expect(fitted.innerY).toBeCloseTo(293.0479532164, 10);
    expect(fitted.visualBottom).toBeCloseTo(877.7111111111, 10);
    expect(visualGap).toBeGreaterThanOrEqual(GAMEPLAY_BOARD_LAYOUT.minimumBoosterGap);
  });

  it("keeps every Lv1-Lv200 board inside the vertical and horizontal gameplay bounds", () => {
    expect(LEVELS).toHaveLength(200);
    expect(LEVELS.map(({ id }) => id)).toEqual(Array.from({ length: 200 }, (_, index) => index + 1));

    for (const level of LEVELS) {
      const fitted = fitGameplayBoard(level.width, level.height, GAMEPLAY_BOOSTER_TOP);
      const innerWidth = level.width * fitted.cell;
      const visualGap = GAMEPLAY_BOOSTER_TOP - fitted.visualBottom;
      expect(
        visualGap,
        `Lv${level.id} ${level.width}x${level.height} visible board-to-booster gap`,
      ).toBeGreaterThanOrEqual(GAMEPLAY_BOARD_LAYOUT.minimumBoosterGap - LAYOUT_EPSILON);
      expect(fitted.innerY, `Lv${level.id} innerY`)
        .toBeGreaterThanOrEqual(GAMEPLAY_BOARD_LAYOUT.minimumInnerY - LAYOUT_EPSILON);
      expect(innerWidth, `Lv${level.id} innerWidth`)
        .toBeLessThanOrEqual(GAMEPLAY_BOARD_LAYOUT.maxInnerWidth + LAYOUT_EPSILON);
      expect(fitted.cell, `Lv${level.id} cell`)
        .toBeLessThanOrEqual(GAMEPLAY_BOARD_LAYOUT.maxCell + LAYOUT_EPSILON);
    }
  });

  it("removes the undo control while keeping pause on its fixed HUD image when safe areas are present", () => {
    expect(gameSource).not.toMatch(/offsetRect\(BUTTONS\.(?:undo|pause),\s*0,\s*safe\.top\)/);
    expect(gameSource).not.toContain("BUTTONS.undo");
    expect(gameSource).toContain("this.interactionHit(point, BUTTONS.pause)");
    expect(gameSource).not.toContain('target("undo",');
    expect(gameSource).toContain('target("pause", BUTTONS.pause)');
    expect(gameSource).not.toContain('add("undo",');
    expect(gameSource).toContain('add("pause", BUTTONS.pause)');
    expect(gameSource).not.toContain('this.drawPressable("undo",');
    expect(gameSource).toContain('this.drawPressable("pause", BUTTONS.pause');
  });

  it("keeps booster images and hit targets on the authored bottom row instead of double-applying safeBottom", () => {
    expect(gameSource).not.toMatch(/offsetRect\(BUTTONS\.(?:time|rocket|pulse),\s*0,\s*-safe\.bottom\)/);
    expect(gameSource).not.toContain("ctx.translate(0, -safe.bottom)");
    for (const booster of ["time", "rocket", "pulse"] as const) {
      expect(gameSource).toContain(`this.interactionHit(point, BUTTONS.${booster})`);
      expect(gameSource).toContain(`target("booster.${booster}", BUTTONS.${booster})`);
      expect(gameSource).toContain(`add("booster.${booster}", BUTTONS.${booster})`);
      expect(gameSource).toContain(`this.drawBooster(BUTTONS.${booster}`);
    }
  });

  it("keeps the supplied 720x1584 artboard and every HUD cutout at its native size", () => {
    expect(GAMEPLAY_ARTBOARD).toEqual({ width: 720, height: 1584 });
    expect(pngSize(readFileSync(resolve(ROOT, "art-source/backgrounds/gameplay-formal-v1.png"))))
      .toEqual(GAMEPLAY_ARTBOARD);

    for (const { file, placements } of CUTOUTS) {
      const nativeSize = pngSize(readFileSync(resolve(ROOT, "art-source/ui/gameplay-v1", file)));
      for (const placement of placements) {
        expect(
          { width: placement.width, height: placement.height },
          `${file} placement must preserve its supplied dimensions`,
        ).toEqual(nativeSize);
        expect(placement.x, `${file} must stay inside the artboard`).toBeGreaterThanOrEqual(0);
        expect(placement.y, `${file} must stay inside the artboard`).toBeGreaterThanOrEqual(0);
        expect(placement.x + placement.width, `${file} must stay inside the artboard`).toBeLessThanOrEqual(GAMEPLAY_ARTBOARD.width);
        expect(placement.y + placement.height, `${file} must stay inside the artboard`).toBeLessThanOrEqual(GAMEPLAY_ARTBOARD.height);
      }
    }
  });

  it("locks the latest supplied HUD geometry and keeps every clickable image on its own visual rect", () => {
    expect(GAMEPLAY_ART_LAYOUT).toMatchObject({
      back: { x: 61, y: 153, width: 88, height: 88 },
      level: { x: 255, y: 155, width: 213, height: 88 },
      levelLabel: { x: 361.5, y: 202 },
      pause: { x: 582, y: 153, width: 88, height: 88 },
      timer: {
        panel: { x: 284, y: 256, width: 152, height: 54 },
        icon: { x: 293, y: 265, width: 30, height: 35 },
        label: { x: 371, y: 288 },
      },
    });
    expect(GAMEPLAY_ART_LAYOUT.boosters.map(({ base, badge, countLabel }) => ({ base, badge, countLabel }))).toEqual([
      {
        base: { x: 76, y: 1304, width: 149, height: 149 },
        badge: { x: 178, y: 1407, width: 45, height: 47 },
        countLabel: { x: 200.5, y: 1434 },
      },
      {
        base: { x: 286, y: 1304, width: 149, height: 149 },
        badge: { x: 388, y: 1407, width: 45, height: 47 },
        countLabel: { x: 410.5, y: 1434 },
      },
      {
        base: { x: 500, y: 1304, width: 149, height: 149 },
        badge: { x: 602, y: 1407, width: 45, height: 47 },
        countLabel: { x: 624.5, y: 1434 },
      },
    ]);
    expect(gameSource).toContain('this.tr("common.levelNumber", { level: this.model.level.id }).toUpperCase()');
    expect(gameSource).toContain('String(Math.floor(value / 60)).padStart(2, "0")');
  });

  it("keeps board-floor, whole-shape ice, selection, and plus slices at their authored grid dimensions", () => {
    expect(pngSize(readFileSync(resolve(ROOT, "art-source/gameplay/board/formal-floor-v1/empty-cells-2x2.png"))))
      .toEqual({ width: 190, height: 190 });
    for (const { file, width, height } of FORMAL_FROZEN_BLOCKS) {
      expect(
        pngSize(readFileSync(resolve(ROOT, "art-source/gameplay/mechanics/formal-gameplay-v1", file))),
        `${file} native whole-shape dimensions`,
      ).toEqual({ width, height });
    }
    expect(pngSize(readFileSync(resolve(ROOT, "art-source/fx/formal-gameplay-v1/selection-frame.png"))))
      .toEqual({ width: 107, height: 107 });
    expect(pngSize(readFileSync(resolve(ROOT, "art-source/ui/gameplay-v1/booster-plus.png"))))
      .toEqual({ width: 28, height: 28 });
  });

  it("keeps copied formal gameplay slices byte-for-byte and transformed slices at native size", () => {
    for (const asset of COPIED_ASSETS) {
      const source = readFileSync(asset.source);
      const runtime = readFileSync(asset.runtime);
      expect(pngSize(runtime), `${asset.file} runtime dimensions`).toEqual(pngSize(source));
      expect(sha256(runtime), `${asset.file} runtime bytes`).toBe(sha256(source));
    }
    for (const asset of TRANSFORMED_ASSETS) {
      const source = readFileSync(asset.source);
      const runtime = readFileSync(asset.runtime);
      expect(pngSize(runtime), `${asset.file} transformed runtime dimensions`).toEqual(pngSize(source));
      expect(runtime.byteLength, `${asset.file} transformed runtime package size`).toBeLessThan(source.byteLength);
      expect(sha256(runtime), `${asset.file} transformed runtime bytes`).not.toBe(sha256(source));
    }
  });
});
