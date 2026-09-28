import { describe, expect, it } from "vitest";
import {
  COLLECTION_ALBUM_PAGE_SIZE,
  COLLECTION_ALBUM_ART_LAYOUT,
  COLLECTION_ALBUM_TYPOGRAPHY,
  collectionAlbumArtRect,
  collectionAlbumContainRect,
  collectionAlbumLatestLevelPage,
  collectionAlbumLevelFrame,
  collectionAlbumPageStepForSwipe,
  collectionAlbumPagination,
  createCollectionAlbumLayout,
  createCollectionHomeEntryLayout,
  hitTestCollectionAlbum,
  hitTestCollectionHomeEntry,
  type CollectionAlbumRect,
} from "../src/game/collectionAlbumLayout";
import { HOME_ARTBOARD, HOME_ART_LAYOUT } from "../src/game/homeArtLayout";

const center = (rect: CollectionAlbumRect) => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
});

const isInside = (inner: CollectionAlbumRect, outer: CollectionAlbumRect): boolean => (
  inner.x >= outer.x - 1e-6
  && inner.y >= outer.y - 1e-6
  && inner.x + inner.width <= outer.x + outer.width + 1e-6
  && inner.y + inner.height <= outer.y + outer.height + 1e-6
);

describe("independent Collection album layout", () => {
  it("maps level ownership and stars to the four supplied card frames", () => {
    expect(collectionAlbumLevelFrame(false, 0)).toBe("gray");
    expect(collectionAlbumLevelFrame(false, 3)).toBe("gray");
    expect(collectionAlbumLevelFrame(true, 1)).toBe("blue");
    expect(collectionAlbumLevelFrame(true, 2)).toBe("purple");
    expect(collectionAlbumLevelFrame(true, 3)).toBe("gold");
    expect(collectionAlbumLevelFrame(true, 0)).toBe("blue");
  });

  it.each([
    [0, 0], [1, 0], [9, 0], [10, 1], [18, 1], [19, 2],
    [24, 2], [198, 21], [199, 22], [200, 22],
  ])("opens the page containing highest cleared level %i (index %i)", (highest, page) => {
    const cards = Array.from({ length: 200 }, (_, index) => ({
      level: index + 1, obtained: index + 1 <= highest,
    }));
    expect(collectionAlbumLatestLevelPage(cards)).toBe(page);
    expect(collectionAlbumPagination(cards.length, page).pageIndex).toBe(page);
  });

  it("uses the highest obtained card's catalogue position rather than count or last array element", () => {
    const cards = Array.from({ length: 200 }, (_, index) => ({
      level: index + 1, obtained: [2, 9, 24].includes(index + 1),
    }));
    expect(collectionAlbumLatestLevelPage(cards)).toBe(2);
    const reordered = [...cards.slice(0, 9), cards[23], ...cards.slice(9, 23), ...cards.slice(24)];
    expect(collectionAlbumLatestLevelPage(reordered)).toBe(1);
  });

  it("returns the first page for an empty or entirely locked collection", () => {
    expect(collectionAlbumLatestLevelPage([])).toBe(0);
    expect(collectionAlbumLatestLevelPage([{ level: 200, obtained: false }])).toBe(0);
    expect(collectionAlbumLatestLevelPage([{ level: Number.NaN, obtained: true }])).toBe(0);
  });

  it("keeps the portrait Home shortcut inside safe bounds on a 320x568-class screen", () => {
    const logicalToCssScale = 568 / 1078;
    const entry = createCollectionHomeEntryLayout({
      logicalToCssScale,
      safeInsets: { top: 48, right: 12, bottom: 36, left: 12 },
    });

    expect(entry.side).toBe("left");
    expect(isInside(entry.visual, entry.safeBounds)).toBe(true);
    expect(isInside(entry.hit, entry.safeBounds)).toBe(true);
    expect(entry.hit.width * logicalToCssScale).toBeGreaterThanOrEqual(44);
    expect(entry.hit.height * logicalToCssScale).toBeGreaterThanOrEqual(44);
    expect(hitTestCollectionHomeEntry(entry, center(entry.visual))).toBe(true);
  });

  it("lays out nine proportionally scaled cards, two top category tabs and a footer guide", () => {
    const layout = createCollectionAlbumLayout({ itemCount: 1201, pageIndex: 0 });

    expect(layout.title.width).toBeGreaterThan(0);
    expect(layout.close.visual.width).toBeGreaterThan(0);
    expect(Object.keys(layout.tabs)).toEqual(["levels", "masterpieces"]);
    expect(layout.progress.height).toBeGreaterThan(0);
    expect(isInside(layout.progress.collected, layout.progress)).toBe(true);
    expect(isInside(layout.progress.icon, layout.progress)).toBe(true);
    expect(isInside(layout.progress.inspiration, layout.panel)).toBe(true);
    expect(layout.progress.collected).toEqual(layout.progress.text);
    expect(layout.cards).toHaveLength(COLLECTION_ALBUM_PAGE_SIZE);
    expect(new Set(layout.cards.map((card) => card.visual.x))).toHaveLength(3);
    expect(new Set(layout.cards.map((card) => card.visual.y))).toHaveLength(3);
    expect(layout.pagination.pageNumber).toBe(1);
    expect(layout.pagination.pageCount).toBe(134);
    expect(layout.pagination.previous.enabled).toBe(false);
    expect(layout.pagination.next.enabled).toBe(true);
    expect(isInside(layout.guide.visual, layout.panel)).toBe(true);
    expect(layout.cards[0].visual.width / layout.cards[0].visual.height).toBeGreaterThan(0.7);
    expect(layout.detail.panel.width).toBeGreaterThan(0);
    expect(layout.detail.artwork.height).toBeGreaterThan(0);
    expect(layout.detail.body.height).toBeGreaterThan(0);
    expect(layout.tabs.levels.visual.y).toBe(layout.tabs.masterpieces.visual.y);
    expect(layout.guide.visual.y).toBeGreaterThan(layout.grid.y + layout.grid.height);
    for (const card of layout.cards) {
      expect(isInside(card.artwork, card.visual)).toBe(true);
      expect(isInside(card.label, card.visual)).toBe(true);
      expect(isInside(card.lock, card.artwork)).toBe(true);
    }
  });

  it.each([
    { width: 720, height: 1584 },
    { width: 496, height: 1078 },
    { width: 320, height: 568, safeInsets: { top: 24, bottom: 18 } },
  ])("adds a separate masterpiece balance without moving cards on $width x $height", (viewport) => {
    const levels = createCollectionAlbumLayout({ ...viewport, itemCount: 40 });
    const explicitLevels = createCollectionAlbumLayout({ ...viewport, itemCount: 40, tab: "levels" });
    const masterpieces = createCollectionAlbumLayout({ ...viewport, itemCount: 40, tab: "masterpieces" });
    expect(explicitLevels).toEqual(levels);
    expect(masterpieces.cards).toEqual(levels.cards);
    expect(masterpieces.grid).toEqual(levels.grid);
    expect(masterpieces.tabs).toEqual(levels.tabs);
    expect(masterpieces.detail).toEqual(levels.detail);
    expect(masterpieces.pagination).toEqual(levels.pagination);
    const progress = masterpieces.progress;
    expect(progress.width).toBe(levels.progress.width);
    expect(progress.height).toBe(levels.progress.height);
    expect(progress.inspiration.width).toBe(progress.width);
    expect(progress.inspiration.height).toBe(progress.height);
    expect(progress.inspiration.y).toBe(progress.y);
    expect(progress.x + progress.width).toBeLessThan(progress.inspiration.x);
    expect(progress.y + progress.height).toBeLessThan(masterpieces.grid.y);
    for (const rect of [progress, progress.inspiration]) {
      expect(isInside(rect, masterpieces.safeBounds)).toBe(true);
      expect(isInside(rect, masterpieces.panel)).toBe(true);
      expect(rect.width / rect.height).toBeCloseTo(320 / 60);
    }
    expect(isInside(progress.icon, progress)).toBe(true);
    expect(isInside(progress.text, progress)).toBe(true);
    expect(isInside(progress.inspirationIcon, progress.inspiration)).toBe(true);
    expect(isInside(progress.inspirationText, progress.inspiration)).toBe(true);
    expect(progress.inspirationIcon.x + progress.inspirationIcon.width).toBeLessThan(progress.inspirationText.x);
    expect(center(progress.inspirationIcon).y).toBeCloseTo(center(progress.inspiration).y, 10);
    expect(center(progress.inspirationText).y).toBeCloseTo(center(progress.inspiration).y, 10);
    expect(progress.inspirationIcon.width).toBeCloseTo(48 * masterpieces.artTransform.scale, 10);
    expect(progress.inspirationIcon.height).toBeCloseTo(48 * masterpieces.artTransform.scale, 10);
    expect(progress.text.x - progress.x).toBeCloseTo(levels.progress.text.x - levels.progress.x);
    expect(progress.icon.x - progress.x).toBeCloseTo(levels.progress.icon.x - levels.progress.x);
  });

  it.each(["ltr", "rtl"] as const)("keeps the inspiration palette and balance inside their own safe header slot in %s", (direction) => {
    const native = COLLECTION_ALBUM_ART_LAYOUT;
    expect(native.inspiration).toEqual({ x: 368, y: 332, width: 320, height: 60 });
    expect(native.inspirationIcon).toEqual({ x: 384, y: 338, width: 48, height: 48 });
    expect(native.inspirationText).toEqual({ x: 444, y: 332, width: 228, height: 60 });
    for (const options of [
      { width: 720, height: 1584, logicalToCssScale: 1 },
      { width: 496, height: 1078, logicalToCssScale: 1 },
      { width: 320, height: 568, logicalToCssScale: 1, safeInsets: { top: 24, right: 8, bottom: 18, left: 8 } },
      { width: 496, height: 1078, logicalToCssScale: 568 / 1078, safeInsets: { top: 48, right: 12, bottom: 64, left: 12 } },
    ]) {
      const layout = createCollectionAlbumLayout({ ...options, direction, tab: "masterpieces", itemCount: 40 });
      const { inspiration, inspirationIcon, inspirationText } = layout.progress;
      for (const rect of [inspiration, inspirationIcon, inspirationText]) {
        expect(isInside(rect, layout.safeBounds)).toBe(true);
        expect(isInside(rect, layout.panel)).toBe(true);
        expect(rect.y + rect.height).toBeLessThan(layout.grid.y);
      }
      expect(isInside(inspirationIcon, inspiration)).toBe(true);
      expect(isInside(inspirationText, inspiration)).toBe(true);
      expect(inspirationIcon.width / inspirationIcon.height).toBeCloseTo(1, 12);
      expect((inspirationText.x - inspirationIcon.x - inspirationIcon.width) / layout.artTransform.scale).toBeCloseTo(12, 10);
      expect(inspirationText.width / layout.artTransform.scale).toBeCloseTo(228, 10);
      expect(layout.progress.x + layout.progress.width).toBeLessThan(inspiration.x);
      expect(hitTestCollectionAlbum(layout, center(inspirationIcon))).toEqual({ kind: "panel" });
      expect(hitTestCollectionAlbum(layout, center(inspirationText))).toEqual({ kind: "panel" });
    }
  });

  it("normalises empty, partial and out-of-range pages deterministically", () => {
    expect(collectionAlbumPagination(0, 99)).toMatchObject({
      pageIndex: 0,
      pageNumber: 1,
      pageCount: 1,
      visibleCount: 0,
      canPrevious: false,
      canNext: false,
    });
    expect(collectionAlbumPagination(10, 99)).toMatchObject({
      pageIndex: 1,
      pageNumber: 2,
      pageCount: 2,
      startIndex: 9,
      endIndex: 10,
      visibleCount: 1,
      canPrevious: true,
      canNext: false,
    });
    expect(collectionAlbumPagination(-3, -5).itemCount).toBe(0);
    expect(collectionAlbumPagination(Number.NaN, Number.POSITIVE_INFINITY).visibleCount).toBe(0);
  });

  it("keeps every interactive region at least 44 CSS px on a short phone", () => {
    const logicalToCssScale = 568 / 1078;
    const layout = createCollectionAlbumLayout({
      itemCount: 18,
      pageIndex: 1,
      logicalToCssScale,
      safeInsets: { top: 36, right: 8, bottom: 28, left: 8 },
    });
    const hits = [
      layout.close.hit,
      layout.tabs.levels.hit,
      layout.tabs.masterpieces.hit,
      ...layout.cards.map((card) => card.hit),
      layout.pagination.previous.hit,
      layout.pagination.next.hit,
      layout.guide.hit,
      layout.detail.close.hit,
      layout.detail.primaryAction.hit,
    ];

    for (const hit of hits) {
      expect(hit.width * logicalToCssScale).toBeGreaterThanOrEqual(44 - 1e-6);
      expect(hit.height * logicalToCssScale).toBeGreaterThanOrEqual(44 - 1e-6);
    }
    expect(isInside(layout.panel, layout.safeBounds)).toBe(true);
    expect(isInside(layout.detail.panel, layout.panel)).toBe(true);
  });

  it("mirrors reading order and page-arrow placement in RTL", () => {
    const ltr = createCollectionAlbumLayout({ itemCount: 30, pageIndex: 1, direction: "ltr" });
    const rtl = createCollectionAlbumLayout({ itemCount: 30, pageIndex: 1, direction: "rtl" });

    expect(ltr.cards[0].visual.x).toBeLessThan(ltr.cards[2].visual.x);
    expect(rtl.cards[0].visual.x).toBeGreaterThan(rtl.cards[2].visual.x);
    expect(ltr.tabs.levels.visual.x).toBeLessThan(ltr.tabs.masterpieces.visual.x);
    expect(rtl.tabs.levels.visual.x).toBeGreaterThan(rtl.tabs.masterpieces.visual.x);
    expect(rtl.tabs.levels.visual.y).toBe(ltr.tabs.levels.visual.y);
    expect(ltr.pagination.previous.visual.x).toBeLessThan(ltr.pagination.next.visual.x);
    expect(rtl.pagination.previous.visual.x).toBeGreaterThan(rtl.pagination.next.visual.x);
    expect(ltr.pagination.previous.arrow).toBe("left");
    expect(rtl.pagination.previous.arrow).toBe("right");
    expect(collectionAlbumPageStepForSwipe(-40, "ltr")).toBe(1);
    expect(collectionAlbumPageStepForSwipe(-40, "rtl")).toBe(-1);
  });

  it("maps card hits to the current page and blocks click-through under details", () => {
    const layout = createCollectionAlbumLayout({ itemCount: 10, pageIndex: 1 });
    const onlyActiveCard = layout.cards[0];
    const inactiveCard = layout.cards[1];

    expect(hitTestCollectionAlbum(layout, center(onlyActiveCard.hit))).toEqual({
      kind: "card",
      slotIndex: 0,
      itemIndex: 9,
    });
    expect(hitTestCollectionAlbum(layout, center(inactiveCard.hit))).toEqual({ kind: "panel" });
    expect(hitTestCollectionAlbum(layout, center(layout.detail.close.hit), { detailOpen: true })).toEqual({
      kind: "detail-close",
    });
    expect(hitTestCollectionAlbum(layout, center(onlyActiveCard.hit), { detailOpen: true })).toEqual({
      kind: "detail-panel",
    });
    expect(hitTestCollectionAlbum(layout, center(layout.guide.hit))).toEqual({ kind: "guide" });
    expect(hitTestCollectionAlbum(layout, center(layout.tabs.levels.hit))).toEqual({ kind: "tab", tab: "levels" });
    expect(hitTestCollectionAlbum(layout, center(layout.tabs.masterpieces.hit))).toEqual({ kind: "tab", tab: "masterpieces" });
    expect(hitTestCollectionAlbum(layout, center(layout.close.hit))?.kind).not.toBe("close");
    expect(hitTestCollectionAlbum(layout, { x: 248, y: 1050 }, { detailOpen: true })).toEqual({ kind: "detail-backdrop" });
    expect(hitTestCollectionAlbum(layout, center(layout.guide.hit), { detailOpen: true })).toEqual({ kind: "detail-backdrop" });
  });

  it("pins supplied native dimensions and matches the Home artboard mapping", () => {
    const native = COLLECTION_ALBUM_ART_LAYOUT;
    const layout = createCollectionAlbumLayout({ width: 720, height: 1584, itemCount: 40 });
    expect(layout.artTransform).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
    expect(layout.guide.visual).toEqual({ x: 24, y: 1300, width: 128, height: 112 });
    expect(layout.tabs.masterpieces.visual).toEqual({ x: 394, y: 210, width: 241, height: 241 * 80 / 203 });
    expect(layout.tabs.levels.visual).toEqual({ x: 90, y: 210, width: 242, height: 242 * 77 / 204 });
    expect(layout.progress.icon).toEqual({ x: 236, y: 340, width: 45, height: 46 });
    const cardHeight = 242 * (211.5 / 194);
    const expectedCards = [
      { x: 18.75, y: 420, width: 211.5, height: cardHeight },
      { x: 258.75, y: 420, width: 211.5, height: cardHeight },
      { x: 498.75, y: 420, width: 211.5, height: cardHeight },
      { x: 18.75, y: 720, width: 211.5, height: cardHeight },
      { x: 258.75, y: 720, width: 211.5, height: cardHeight },
      { x: 498.75, y: 720, width: 211.5, height: cardHeight },
      { x: 18.75, y: 1020, width: 211.5, height: cardHeight },
      { x: 258.75, y: 1020, width: 211.5, height: cardHeight },
      { x: 498.75, y: 1020, width: 211.5, height: cardHeight },
    ];
    layout.cards.forEach((card, index) => {
      for (const key of ["x", "y", "width", "height"] as const) {
        expect(card.visual[key]).toBeCloseTo(expectedCards[index][key], 10);
      }
    });
    expect(layout.detail.panel).toEqual({ x: 21, y: 342, width: 679, height: 960 });
    expect(layout.detail.close.visual).toEqual({ x: 625, y: 300, width: 94, height: 98 });
    expect(layout.detail.artwork).toEqual({ x: 126, y: 509, width: 473, height: 473 });
    expect(layout.detail.restorationIcon).toEqual({ x: 325, y: 1205, width: 40, height: 40 });
    expect(layout.detail.restorationCost).toEqual({ x: 361, y: 1208, width: 32, height: 40 });
    expect((layout.detail.restorationIcon.x + layout.detail.restorationCost.x + layout.detail.restorationCost.width) / 2)
      .toBe(layout.detail.primaryAction.visual.x + layout.detail.primaryAction.visual.width / 2);
    expect(layout.detail.restorationCost.x).toBe(layout.detail.restorationIcon.x + layout.detail.restorationIcon.width - 4);
    expect(layout.detail.restorationLabel).toEqual({ x: 250, y: 1242, width: 218, height: 40 });
    expect(center(layout.detail.title)).toEqual({ x: 360, y: 435 });
    expect(COLLECTION_ALBUM_TYPOGRAPHY).toMatchObject({ tab: 38, progress: 21, cardLabel: 28, detailTitle: 41, detailBody: 34 });

    const logical = createCollectionAlbumLayout();
    const scale = 496 / HOME_ARTBOARD.width;
    const offsetY = (1078 - HOME_ARTBOARD.height * scale) / 2;
    expect(logical.artTransform.scale).toBeCloseTo(scale, 12);
    expect(logical.artTransform.offsetY).toBeCloseTo(offsetY, 12);
    expect(logical.detail.panel).toEqual(collectionAlbumArtRect(native.detail.panel, logical.artTransform));
  });

  it("makes every one of the 40 masterpieces and 200 level cards reachable once", () => {
    for (const [itemCount, pageCount, tailCount] of [[40, 5, 4], [200, 23, 2]]) {
      const visited: number[] = [];
      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        const layout = createCollectionAlbumLayout({ itemCount, pageIndex });
        expect(layout.pagination.pageCount).toBe(pageCount);
        for (const card of layout.cards.filter((entry) => entry.active)) {
          visited.push(card.itemIndex);
          expect(hitTestCollectionAlbum(layout, center(card.visual))).toEqual({
            kind: "card", slotIndex: card.slotIndex, itemIndex: card.itemIndex,
          });
        }
      }
      expect(visited).toEqual(Array.from({ length: itemCount }, (_, index) => index));
      const tail = collectionAlbumPagination(itemCount, 999);
      expect(tail.pageCount).toBe(pageCount);
      expect(tail.visibleCount).toBe(tailCount);
      expect(tail.canNext).toBe(false);
    }
  });

  it("fits both screen classes and safe areas above navigation without overlapping controls", () => {
    for (const options of [
      { width: 720, height: 1584, logicalToCssScale: 1 },
      { logicalToCssScale: 568 / 1078 },
      { logicalToCssScale: 568 / 1078, safeInsets: { top: 48, right: 12, bottom: 64, left: 12 } },
    ]) {
      const layout = createCollectionAlbumLayout({ ...options, itemCount: 40, pageIndex: 1 });
      const controls = [layout.guide, layout.tabs.masterpieces, layout.tabs.levels,
        layout.pagination.previous, layout.pagination.next, ...layout.cards];
      const scale = layout.viewport.width / HOME_ARTBOARD.width;
      const offsetY = (layout.viewport.height - HOME_ARTBOARD.height * scale) / 2;
      const safeBottom = layout.viewport.height - layout.safeBounds.y - layout.safeBounds.height;
      const navigationTop = offsetY + HOME_ART_LAYOUT.navigationSelected.y * scale - safeBottom;
      for (const control of controls) {
        expect(isInside(control.hit, layout.safeBounds)).toBe(true);
        expect(control.hit.y + control.hit.height).toBeLessThan(navigationTop);
        expect(control.hit.width * options.logicalToCssScale).toBeGreaterThanOrEqual(44 - 1e-6);
        expect(control.hit.height * options.logicalToCssScale).toBeGreaterThanOrEqual(44 - 1e-6);
      }
      for (let a = 0; a < controls.length; a += 1) {
        for (let b = a + 1; b < controls.length; b += 1) {
          const first = controls[a].hit;
          const second = controls[b].hit;
          const overlap = first.x < second.x + second.width && first.x + first.width > second.x
            && first.y < second.y + second.height && first.y + first.height > second.y;
          expect(overlap).toBe(false);
        }
      }
      expect(isInside(layout.detail.close.hit, layout.safeBounds)).toBe(true);
      expect(isInside(layout.detail.artwork, layout.detail.panel)).toBe(true);
      expect(isInside(layout.detail.body, layout.detail.panel)).toBe(true);
      expect(isInside(layout.detail.primaryAction.hit, layout.detail.panel)).toBe(true);
      expect(isInside(layout.detail.restorationIcon, layout.detail.primaryAction.visual)).toBe(true);
      expect(isInside(layout.detail.restorationCost, layout.detail.primaryAction.visual)).toBe(true);
      expect(isInside(layout.detail.restorationLabel, layout.detail.primaryAction.visual)).toBe(true);
    }
  });

  it("shifts the safe-area grid only as needed while keeping 300px row pitch and 44 CSS footer hits", () => {
    const baseline = createCollectionAlbumLayout({ itemCount: 200, logicalToCssScale: 568 / 1078 });
    expect(baseline.gridOffsetY).toBeCloseTo(0, 12);
    const layout = createCollectionAlbumLayout({
      itemCount: 200,
      logicalToCssScale: 568 / 1078,
      safeInsets: { top: 48, left: 12, right: 12, bottom: 64 },
    });
    const scale = layout.artTransform.scale;
    expect(layout.gridOffsetY).toBeLessThan(0);
    expect(-layout.gridOffsetY / scale).toBeLessThanOrEqual(8);
    for (let column = 0; column < 3; column += 1) {
      expect((layout.cards[column + 3].visual.y - layout.cards[column].visual.y) / scale).toBeCloseTo(300, 10);
      expect((layout.cards[column + 6].visual.y - layout.cards[column + 3].visual.y) / scale).toBeCloseTo(300, 10);
    }
    for (const card of layout.cards) {
      expect(card.visual.width / scale).toBeCloseTo(211.5, 10);
      expect(card.visual.height / scale).toBeCloseTo(242 * 211.5 / 194, 10);
      expect(card.artwork.width / card.visual.width).toBeCloseTo(159 / 194, 10);
      expect(card.label.width / card.visual.width).toBeCloseTo(178 / 194, 10);
      expect(card.lock.width / card.visual.width).toBeCloseTo(64 / 194, 10);
    }
    for (const hit of [layout.guide.hit, layout.pagination.previous.hit, layout.pagination.next.hit]) {
      expect(hit.height * 568 / 1078).toBeGreaterThanOrEqual(44 - 1e-6);
      expect(hit.y - (layout.grid.y + layout.grid.height)).toBeGreaterThanOrEqual(4 * scale - 1e-6);
    }
  });

  it("centers three real-image star slots below the artwork without crowding the frame", () => {
    for (const direction of ["ltr", "rtl"] as const) {
      for (const safeInsets of [undefined, { top: 48, right: 12, bottom: 64, left: 12 }]) {
        const layout = createCollectionAlbumLayout({
          direction, safeInsets, itemCount: 200, logicalToCssScale: 568 / 1078,
        });
        for (const card of layout.cards) {
          expect(card.stars).toHaveLength(3);
          expect(center(card.stars[1]).x).toBeCloseTo(center(card.visual).x, 12);
          for (let index = 0; index < card.stars.length; index += 1) {
            const slot = card.stars[index];
            expect(isInside(slot, card.label)).toBe(true);
            expect(slot.y).toBeGreaterThan(card.artwork.y + card.artwork.height);
            if (index > 0) expect(slot.x).toBeGreaterThan(card.stars[index - 1].x + card.stars[index - 1].width);
            for (const source of [{ width: 36, height: 35 }, { width: 38, height: 37 }]) {
              const image = collectionAlbumContainRect(source, slot);
              expect(isInside(image, slot)).toBe(true);
              expect(image.width / image.height).toBeCloseTo(source.width / source.height, 12);
            }
          }
        }
      }
    }
  });

  it("preserves the new rectangular card window and all supplied control aspect ratios", () => {
    const native = COLLECTION_ALBUM_ART_LAYOUT;
    expect(native.card).toMatchObject({ width: 194, height: 242, slotWidth: 225, displayScale: 211.5 / 194 });
    expect(native.cardArtwork).toEqual({ x: 17, y: 27, width: 159, height: 157 });
    expect(native.cardArtworkRadius).toBe(8);
    expect(native.cardLabel).toEqual({ x: 8, y: 187, width: 178, height: 42 });
    expect(native.cardLock).toEqual({ x: 64.5, y: 68, width: 64, height: 75 });
    for (const direction of ["ltr", "rtl"] as const) {
      const layout = createCollectionAlbumLayout({ direction, itemCount: 200, pageIndex: 1 });
      for (const card of layout.cards) {
        expect(card.visual.width / card.visual.height).toBeCloseTo(194 / 242, 12);
        expect(card.artwork.width / card.artwork.height).toBeCloseTo(159 / 157, 12);
        expect(center(card.lock).x).toBeCloseTo(center(card.artwork).x, 12);
        expect(center(card.lock).y).toBeCloseTo(center(card.artwork).y, 12);
      }
      expect(layout.tabs.levels.visual.width / layout.tabs.levels.visual.height).toBeCloseTo(204 / 77, 12);
      expect(layout.tabs.masterpieces.visual.width / layout.tabs.masterpieces.visual.height).toBeCloseTo(203 / 80, 12);
      expect(layout.guide.artwork.width / layout.guide.artwork.height).toBeCloseTo(96 / 103, 12);
      expect(isInside(layout.guide.artwork, layout.guide.visual)).toBe(true);
      expect(layout.pagination.previous.visual.width / layout.pagination.previous.visual.height)
        .toBeCloseTo(direction === "rtl" ? 49 / 57 : 50 / 58, 12);
      expect(layout.pagination.next.visual.width / layout.pagination.next.visual.height)
        .toBeCloseTo(direction === "rtl" ? 50 / 58 : 49 / 57, 12);
      expect(layout.pagination.indicatorImage.width / layout.pagination.indicatorImage.height).toBeCloseTo(116 / 45, 12);
      expect(isInside(layout.pagination.indicatorImage, layout.pagination.indicator)).toBe(true);
    }
    expect(collectionAlbumContainRect({ width: 50, height: 58 }, native.previous)).toEqual({
      x: 204 + (64 - 50 * (64 / 58)) / 2, y: 1330, width: 50 * (64 / 58), height: 64,
    });
  });
});
