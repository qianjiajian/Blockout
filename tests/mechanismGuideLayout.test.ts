import { describe, expect, it } from "vitest";
import { FORMAL_COLLECTION_LAYOUT } from "../src/game/formalPageLayout";
import { HOME_ARTBOARD } from "../src/game/homeArtLayout";
import {
  createMechanismGuideLayout,
  mechanismGuidePoint,
  mechanismGuideRect,
} from "../src/game/mechanismGuideLayout";

const expectContained = (
  child: { x: number; y: number; width: number; height: number },
  parent: { x: number; y: number; width: number; height: number },
) => {
  expect(child.x).toBeGreaterThanOrEqual(parent.x - 1e-9);
  expect(child.y).toBeGreaterThanOrEqual(parent.y - 1e-9);
  expect(child.x + child.width).toBeLessThanOrEqual(parent.x + parent.width + 1e-9);
  expect(child.y + child.height).toBeLessThanOrEqual(parent.y + parent.height + 1e-9);
};

const artRect = (rect: { x: number; y: number; width: number; height: number }) => {
  const scale = 496 / HOME_ARTBOARD.width;
  return {
    x: rect.x * scale,
    y: (1078 - HOME_ARTBOARD.height * scale) / 2 + rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
};

describe("mechanism guide modal layout", () => {
  it("uses the supplied 677×1152 panel, not a crop of a legacy full page", () => {
    const layout = createMechanismGuideLayout();
    expect(FORMAL_COLLECTION_LAYOUT.panel).toEqual({ x: 22, y: 226, width: 677, height: 1152 });
    expect(layout.source).toEqual(artRect(FORMAL_COLLECTION_LAYOUT.panel));
    expectContained(FORMAL_COLLECTION_LAYOUT.detailBody, FORMAL_COLLECTION_LAYOUT.detailPanel);
    expectContained(FORMAL_COLLECTION_LAYOUT.detailPanel, FORMAL_COLLECTION_LAYOUT.panel);
  });

  it("does not additionally shrink or translate the native reference at the default viewport", () => {
    const layout = createMechanismGuideLayout();
    expect(layout.scale).toBe(1);
    expect(layout.offsetX).toBe(0);
    expect(layout.offsetY).toBe(0);
    expect(layout.panel).toEqual(layout.source);
    expect(layout.panel.width / layout.panel.height).toBeCloseTo(layout.source.width / layout.source.height);
    expect(layout.close.visual).toEqual(artRect(FORMAL_COLLECTION_LAYOUT.close));
    expect(FORMAL_COLLECTION_LAYOUT.close).toEqual({ x: 624, y: 253, width: 94, height: 98 });
  });

  for (const options of [
    { width: 496, height: 1078, logicalToCssScale: 1, safeTop: 0, safeBottom: 0 },
    { width: 496, height: 1078, logicalToCssScale: 568 / 1078, safeTop: 50, safeBottom: 38 },
    { width: 320, height: 568, logicalToCssScale: 1, safeTop: 24, safeBottom: 34 },
    { width: 496, height: 700, logicalToCssScale: 0.5, safeTop: 80, safeBottom: 60 },
    { width: 496, height: 1078, logicalToCssScale: 0.527, safeTop: 300, safeBottom: 300 },
  ]) {
    it(`fits the safe area and 44 CSS close target at ${options.width}×${options.height}, scale ${options.logicalToCssScale}`, () => {
      const layout = createMechanismGuideLayout(options);
      const safe = { x: 0, y: options.safeTop, width: options.width, height: options.height - options.safeTop - options.safeBottom };
      expectContained(layout.panel, safe);
      expectContained(layout.close.visual, safe);
      expectContained(layout.close.hit, safe);
      expect(layout.close.hit.width * options.logicalToCssScale).toBeGreaterThanOrEqual(44 - 1e-9);
      expect(layout.close.hit.height * options.logicalToCssScale).toBeGreaterThanOrEqual(44 - 1e-9);
      expectContained(layout.close.visual, layout.close.hit);
      expect(layout.close.visual.width / layout.close.visual.height).toBeCloseTo(94 / 98);
      expect(layout.close.visual).toEqual(mechanismGuideRect(artRect(FORMAL_COLLECTION_LAYOUT.close), layout));
    });
  }

  it("maps the source exactly to panel and preserves rectangle proportions", () => {
    const layout = createMechanismGuideLayout({ safeTop: 47, safeBottom: 31 });
    const mapped = mechanismGuideRect(layout.source, layout);
    expect(mapped.x).toBeCloseTo(layout.panel.x);
    expect(mapped.y).toBeCloseTo(layout.panel.y);
    expect(mapped.width).toBeCloseTo(layout.panel.width);
    expect(mapped.height).toBeCloseTo(layout.panel.height);
    const rect = { x: 58, y: 201, width: 180, height: 112 };
    const copy = { ...rect };
    expect(mechanismGuideRect(rect, layout).width / mechanismGuideRect(rect, layout).height).toBeCloseTo(rect.width / rect.height);
    expect(rect).toEqual(copy);
  });

  it("round-trips pointer coordinates and preserves metadata without mutation", () => {
    const layout = createMechanismGuideLayout({ width: 320, height: 568, safeTop: 24, safeBottom: 34 });
    const original = { id: 42, x: 112, y: 310, pressure: 0.5 };
    const mapped = mechanismGuideRect({ ...original, width: 0, height: 0 }, layout);
    const pointer = { ...original, x: mapped.x, y: mapped.y };
    const copy = { ...pointer };
    const inverse = mechanismGuidePoint(pointer, layout);
    expect(inverse.x).toBeCloseTo(original.x);
    expect(inverse.y).toBeCloseTo(original.y);
    expect(inverse.id).toBe(42);
    expect(inverse.pressure).toBe(0.5);
    expect(pointer).toEqual(copy);
  });

  it("normalizes invalid options and isolates returned rectangles from later calls", () => {
    const layout = createMechanismGuideLayout({ width: NaN, height: -1, logicalToCssScale: 0, safeTop: -Infinity, safeBottom: NaN });
    expect(layout).toEqual(createMechanismGuideLayout());
    layout.source.x = 99;
    layout.panel.x = 99;
    expect(createMechanismGuideLayout().source.x).toBe(22 * 496 / 720);
    expect(createMechanismGuideLayout().panel.x).toBe(22 * 496 / 720);
  });

  it("keeps tiny or over-inset finite viewports bounded instead of producing negative geometry", () => {
    const layout = createMechanismGuideLayout({ width: 24, height: 32, safeTop: 1000, safeBottom: 1000, logicalToCssScale: 0.1 });
    expect(layout.scale).toBeGreaterThan(0);
    expectContained(layout.panel, { x: 0, y: 0, width: 24, height: 32 });
    expectContained(layout.close.visual, { x: 0, y: 0, width: 24, height: 32 });
    expectContained(layout.close.hit, { x: 0, y: 0, width: 24, height: 32 });
  });

  it("keeps the final row fully reachable and separates list targets from the fixed detail panel", () => {
    const native = FORMAL_COLLECTION_LAYOUT;
    const count = 15;
    const rows = Math.ceil(count / native.cardColumns.length);
    const overhang = native.selectedOffset.y + native.selectedOffset.height - native.cardSize.height;
    const contentBottom = native.cardTop + (rows - 1) * native.rowPitch + native.cardSize.height + overhang;
    const maxScroll = contentBottom - native.listViewport.y - native.listViewport.height;
    expect(maxScroll).toBe(520);
    for (const options of [{}, { logicalToCssScale: 568 / 1078, safeTop: 50, safeBottom: 38 }]) {
      const layout = createMechanismGuideLayout(options);
      const viewport = mechanismGuideRect(artRect(native.listViewport), layout);
      const detail = mechanismGuideRect(artRect(native.detailPanel), layout);
      expect(viewport.y + viewport.height).toBeLessThan(detail.y);
      for (const x of native.cardColumns) {
        const final = mechanismGuideRect(artRect({ x, y: native.cardTop + 4 * native.rowPitch - maxScroll, ...{ width: native.cardSize.width, height: native.cardSize.height } }), layout);
        expectContained(final, viewport);
        const cssScale = options.logicalToCssScale ?? 1;
        expect(final.width * cssScale).toBeGreaterThanOrEqual(44);
        expect(final.height * cssScale).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
