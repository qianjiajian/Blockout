// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { resolve } from "node:path";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { MECHANISM_GUIDE } from "../src/core/mechanismCatalog";
import { GAME_ART } from "../src/game/artManifest";
import { FORMAL_COLLECTION_LAYOUT } from "../src/game/formalPageLayout";

const SOURCE_DIR = resolve("art-source");
const RUNTIME_DIR = resolve("public/assets/art");
const sharp = createRequire(import.meta.url)("sharp");

const MECHANISM_ASSETS = [
  { id: "generator", title: "色块生成器", source: "ui/formal-pages/mechanism-guide-v2/icon-generator.png", runtime: "ui/formal-pages/mechanism-guide-v2/icon-generator.png", width: 81, height: 92 },
  { id: "axis-block", title: "轴向块", source: "ui/formal-pages/mechanism-guide-v2/icon-axis-block.png", runtime: "ui/formal-pages/mechanism-guide-v2/icon-axis-block.png", width: 135, height: 98 },
  { id: "key-lock", title: "钥匙与锁", source: "ui/formal-pages/mechanism-guide-v2/icon-key-lock.png", runtime: "ui/formal-pages/mechanism-guide-v2/icon-key-lock.png", width: 109, height: 108 },
  { id: "star", title: "星标块、星门", source: "ui/formal-pages/mechanism-guide-v2/icon-star.png", runtime: "ui/formal-pages/mechanism-guide-v2/icon-star.png", width: 115, height: 109 },
  { id: "flip-door", title: "翻转门", source: "ui/formal-pages/mechanism-guide-v2/icon-flip-door.png", runtime: "ui/formal-pages/mechanism-guide-v2/icon-flip-door.png", width: 101, height: 106 },
  { id: "colored-grid", title: "彩色地格", source: "ui/formal-pages/mechanism-guide-v2/icon-colored-grid.png", runtime: "ui/formal-pages/mechanism-guide-v2/icon-colored-grid.png", width: 136, height: 95 },
  { id: "bomb", title: "炸弹", source: "ui/formal-pages/mechanism-guide-v2/icon-bomb.png", runtime: "ui/formal-pages/mechanism-guide-v2/icon-bomb.png", width: 97, height: 117 },
  { id: "shutter", title: "卷帘门", source: "ui/formal-pages/mechanism-guide-v2/icon-shutter.png", runtime: "ui/formal-pages/mechanism-guide-v2/icon-shutter.png", width: 98, height: 97 },
  { id: "layered-lift", title: "升降台", source: "ui/formal-pages/mechanism-guide-v2/icon-layered-lift.png", runtime: "ui/formal-pages/mechanism-guide-v2/icon-layered-lift.png", width: 91, height: 107 },
  { id: "color-exit", title: "普通出口", source: "ui/formal-pages/mechanism-guide-v2/icon-color-exit.png", runtime: "ui/formal-pages/mechanism-guide-v2/icon-color-exit.png", width: 84, height: 100 },
  { id: "irregular-block", title: "异形色块", source: "ui/formal-pages/mechanism-guide-v2/icon-irregular-block.png", runtime: "ui/formal-pages/mechanism-guide-v2/icon-irregular-block.png", width: 82, height: 83 },
  { id: "irregular-board", title: "异形棋盘", source: "ui/formal-pages/mechanism-guide-v2/icon-irregular-board.png", runtime: "ui/formal-pages/mechanism-guide-v2/icon-irregular-board.png", width: 93, height: 97 },
  { id: "frozen-exit", title: "冰冻出口", source: "ui/formal-pages/mechanism-guide-v2/icon-frozen-exit.png", runtime: "ui/formal-pages/mechanism-guide-v2/icon-frozen-exit.png", width: 107, height: 95 },
  { id: "numeric-ice", title: "数字冰块", source: "ui/formal-pages/mechanism-guide-v2/icon-numeric-ice.png", runtime: "ui/formal-pages/mechanism-guide-v2/icon-numeric-ice.png", width: 98, height: 106 },
  { id: "multilayer-shell", title: "外壳块", source: "ui/formal-pages/mechanism-guide-v2/icon-multilayer-shell.png", runtime: "ui/formal-pages/mechanism-guide-v2/icon-multilayer-shell.png", width: 94, height: 98 },
] as const;

const uint32be = (contents: Uint8Array, offset: number): number => (
  (contents[offset] * 0x1000000)
  + (contents[offset + 1] << 16)
  + (contents[offset + 2] << 8)
  + contents[offset + 3]
);

const pngSize = (contents: Uint8Array): { width: number; height: number } => ({
  width: uint32be(contents, 16),
  height: uint32be(contents, 20),
});

describe("formal Collection artwork and typography", () => {
  it("contains exactly the workbook mechanisms without a basic color-block placeholder", () => {
    const source = readFileSync(resolve("src/game/ColorEscapeGame.ts"), "utf8");
    expect(source.includes("const COLLECTION_COLOR_ITEMS"), "obsolete aggregate colour-card declaration").toBe(false);
    expect(MECHANISM_GUIDE).toHaveLength(15);
    expect(MECHANISM_GUIDE.map(({ id }) => id)).not.toContain("color-block");
  });

  it("maps every shipping mechanic to the matching supplied cutout", async () => {
    expect([...MECHANISM_GUIDE].sort((a, b) => a.atlasIndex - b.atlasIndex)
      .map(({ id, title, atlasIndex }) => ({ id, title, atlasIndex }))).toEqual(
      MECHANISM_ASSETS.map(({ id, title }, atlasIndex) => ({ id, title, atlasIndex })),
    );
    expect(GAME_ART.ui.formalPages.collection.itemImages).toEqual(
      MECHANISM_ASSETS.map(({ runtime }) => `assets/art/${runtime}`),
    );

    for (const asset of MECHANISM_ASSETS) {
      const source = readFileSync(resolve(SOURCE_DIR, asset.source));
      const runtime = readFileSync(resolve(RUNTIME_DIR, asset.runtime));
      expect(pngSize(source), `${asset.title} source dimensions`).toEqual({
        width: asset.width,
        height: asset.height,
      });
      expect(pngSize(runtime), `${asset.title} runtime dimensions`).toEqual({ width: asset.width, height: asset.height });
      const sourcePixels = await sharp(source).ensureAlpha().raw().toBuffer();
      const runtimePixels = await sharp(runtime).ensureAlpha().raw().toBuffer();
      expect(runtimePixels.equals(sourcePixels), `${asset.title} must preserve every decoded RGBA byte`).toBe(true);
    }
  });

  it("uses the four font sizes annotated on the supplied popup reference", () => {
    expect(FORMAL_COLLECTION_LAYOUT.typography.title).toMatchObject({ size: 51, x: 360, y: 294 });
    expect(FORMAL_COLLECTION_LAYOUT.typography.cardTitle.size).toBe(27);
    expect(FORMAL_COLLECTION_LAYOUT.typography.detailTitle.size).toBe(30);
    expect(FORMAL_COLLECTION_LAYOUT.typography.detailBody).toMatchObject({
      size: 26,
      x: 134,
      y: 1165,
      lineHeight: 44,
      align: "left",
    });
  });

  it("compensates Canvas middle-baseline rendering to match the reference glyph positions", () => {
    expect(FORMAL_COLLECTION_LAYOUT.typography.cardTitle.centerYOffset).toBe(176);
    expect(FORMAL_COLLECTION_LAYOUT.cardTop + FORMAL_COLLECTION_LAYOUT.typography.cardTitle.centerYOffset).toBe(576);
    expect(FORMAL_COLLECTION_LAYOUT.typography.detailTitle).toMatchObject({ x: 369.5, y: 1087.5 });
    const { cardIcon, cardLock } = FORMAL_COLLECTION_LAYOUT;
    expect(cardIcon).toEqual({ centerX: 79, centerY: 88, maxWidth: 140, maxHeight: 130 });
    expect(cardLock.x + cardLock.width / 2).toBe(cardIcon.centerX);
    expect(cardLock.y + cardLock.height / 2).toBe(cardIcon.centerY);
  });

  it("uses exactly fifteen workbook cards in a vertical viewport", () => {
    const layout = FORMAL_COLLECTION_LAYOUT;
    expect(layout.cardColumns).toHaveLength(3);
    expect(layout.cardSize).toMatchObject({ width: 158, height: 198 });
    expect(layout.cardColumns).toEqual([87, 279, 471]);
    expect(layout.rowPitch).toBe(234);
    expect(layout.listViewport.y).toBeGreaterThanOrEqual(layout.topHeader.y + layout.topHeader.height);
    expect(layout.listViewport.y + layout.listViewport.height).toBeLessThanOrEqual(layout.detailPanel.y);

    const shippingItemCount = MECHANISM_ASSETS.length;
    const rowCount = Math.ceil(shippingItemCount / layout.cardColumns.length);
    const selectedBottomOverhang = Math.max(
      0,
      layout.selectedOffset.y + layout.selectedOffset.height - layout.cardSize.height,
    );
    const contentBottom = layout.cardTop + (rowCount - 1) * layout.rowPitch
      + layout.cardSize.height + selectedBottomOverhang;
    const maxScrollOffset = contentBottom - (layout.listViewport.y + layout.listViewport.height);
    expect(rowCount).toBe(5);
    expect(selectedBottomOverhang).toBe(7);
    expect(maxScrollOffset).toBe(520);
    expect(contentBottom - maxScrollOffset).toBe(layout.listViewport.y + layout.listViewport.height);

    const legacyControls = layout as typeof layout & Record<string, unknown>;
    expect(legacyControls.categoryPanels).toBeUndefined();
    expect(legacyControls.pagePrevious).toBeUndefined();
    expect(legacyControls.pageNext).toBeUndefined();
  });

  it("uses independent original-size popup frames, masks, and fixed details", () => {
    const layout = FORMAL_COLLECTION_LAYOUT;
    expect(layout.panel).toEqual({ x: 22, y: 226, width: 677, height: 1152 });
    expect(layout.close).toEqual({ x: 624, y: 253, width: 94, height: 98 });
    expect(layout.selectedOffset).toEqual({ x: -8, y: -7, width: 174, height: 212 });
    expect(layout.lockedOverlayOffset).toEqual({ x: 0, y: 0, width: 159, height: 197 });
    expect(layout.cardLock).toMatchObject({ width: 64, height: 77 });
    expect(layout.detailPanel).toEqual({ x: 80, y: 1030, width: 571, height: 294 });
    expect(layout.detailTitleShade).toEqual({ x: 229, y: 1063, width: 281, height: 49 });
    expect(layout.detailBody).toEqual({ x: 122, y: 1130, width: 484, height: 157 });
    expect(layout.listViewport.y + layout.listViewport.height).toBeLessThan(layout.detailPanel.y);
  });
});
