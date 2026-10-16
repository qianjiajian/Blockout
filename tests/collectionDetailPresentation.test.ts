import { describe, expect, it, vi } from "vitest";
import {
  LEVEL_COLLECTION_CATALOG,
  MASTERPIECE_COLLECTION_CATALOG,
  type CollectionCatalogItem,
} from "../src/core/collectionCatalog";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import {
  collectionAlbumArtRect,
  type CollectionAlbumRect,
} from "../src/game/collectionAlbumLayout";

const MASTERPIECE = MASTERPIECE_COLLECTION_CATALOG[0]!;
const LEVEL = LEVEL_COLLECTION_CATALOG.find((item) => item.levelId === 44)!;
const PRIMARY = "collectionAlbumDetailPrimary";

interface DrawnImage {
  image: unknown;
  rect: CollectionAlbumRect;
  alpha: number;
}

/** Exercises the real detail renderer and ownership gate with in-memory state only. */
function detailGame(item: CollectionCatalogItem, options: {
  inspiration?: number;
  completed?: boolean;
  restored?: boolean;
  parentAlpha?: number;
  cssScale?: number;
} = {}) {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  const alphaStack: number[] = [];
  const ctx = {
    globalAlpha: options.parentAlpha ?? 1,
    fillStyle: "",
    save: vi.fn(() => alphaStack.push(ctx.globalAlpha)),
    restore: vi.fn(() => { ctx.globalAlpha = alphaStack.pop()!; }),
    drawImage: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), quadraticCurveTo: vi.fn(), closePath: vi.fn(),
  };
  const images: DrawnImage[] = [];
  const labels: { text: string; x: number; y: number; alpha: number }[] = [];
  const art = {
    detailPanel: {}, detailClose: {}, suppliedTabBlue: {}, inspiration: {},
    starFilled: {}, starEmpty: {},
  };
  Object.assign(game, {
    ctx,
    save: {
      language: "zh-CN",
      rewardedLevels: options.completed ? [item.unlockLevel] : [],
      bestStars: options.completed && item.category === "level" ? { [item.levelId]: 3 } : {},
      bestStarConditions: {},
      collectionProgress: {
        inspiration: options.inspiration ?? 0,
        restoredMasterpieceIds: options.restored ? [item.id] : [],
        seenItemIds: [], claimedMilestoneIds: [],
      },
    },
    collectionAlbumTab: item.category === "level" ? "levels" : "masterpieces",
    collectionAlbumPage: { levels: 0, masterpieces: 0 },
    collectionAlbumDetailId: item.id,
    collectionAlbumArt: art,
    safeOffsets: () => ({ top: 0, bottom: 0 }),
    viewportTransform: () => ({ scale: options.cssScale ?? 1 }),
    withPopupEntrance: (_key: string, _rect: unknown, draw: () => void) => draw(),
    drawPressable: vi.fn((_key: string, _rect: unknown, draw: () => void) => draw()),
    drawCollectionAlbumArtwork: vi.fn(),
    drawTapGuideHand: vi.fn(),
    drawCollectionImageContained: (image: unknown, rect: CollectionAlbumRect) => {
      images.push({ image, rect: { ...rect }, alpha: ctx.globalAlpha });
    },
    label: (text: string, x: number, y: number) => labels.push({ text, x, y, alpha: ctx.globalAlpha }),
  });
  const layout = game.collectionAlbumLayout();
  const render = () => game.drawCollectionAlbumDetail(layout, item);
  return { game, layout, render, ctx, art, images, labels };
}

const inside = (inner: CollectionAlbumRect, outer: CollectionAlbumRect) => (
  inner.x >= outer.x - 1e-6 && inner.y >= outer.y - 1e-6
  && inner.x + inner.width <= outer.x + outer.width + 1e-6
  && inner.y + inner.height <= outer.y + outer.height + 1e-6
);

const expectRectClose = (actual: CollectionAlbumRect, expected: CollectionAlbumRect): void => {
  for (const key of ["x", "y", "width", "height"] as const) {
    expect(actual[key]).toBeCloseTo(expected[key], 8);
  }
};

describe("collection detail presentation", () => {
  it.each([
    { inspiration: 0, parentAlpha: 1 },
    { inspiration: 50, parentAlpha: 1 },
    { inspiration: 0, parentAlpha: 0.45 },
    { inspiration: 50, parentAlpha: 0.45 },
  ])("does not dim an unlocked restoration action at $inspiration inspiration (parent alpha $parentAlpha)", options => {
    const { game, render, ctx, art, images, labels } = detailGame(MASTERPIECE, { ...options, completed: true });
    const before = JSON.stringify(game.save);
    render();
    expect(game.collectionAlbumDetailActionVisible()).toBe(true);
    expect(game.drawPressable.mock.calls.filter(([key]: [string]) => key === PRIMARY)).toHaveLength(1);
    expect(images.filter(({ image }) => image === art.suppliedTabBlue || image === art.inspiration)
      .map(({ alpha }) => alpha)).toEqual([options.parentAlpha, options.parentAlpha]);
    expect(labels.filter(({ text }) => text === "50" || text === "修复")
      .map(({ alpha }) => alpha)).toEqual([options.parentAlpha, options.parentAlpha]);
    expect(ctx.globalAlpha).toBe(options.parentAlpha);
    expect(JSON.stringify(game.save)).toBe(before);
  });

  it.each([
    { completed: false, restored: false, caption: "通关第 5 关解锁" },
    { completed: true, restored: true, caption: "已收藏" },
  ])("omits restoration controls for locked/restored state $completed/$restored", options => {
    const { game, render, art, images, labels } = detailGame(MASTERPIECE, { ...options, inspiration: 50 });
    render();
    expect(game.collectionAlbumDetailActionVisible()).toBe(false);
    expect(game.drawPressable.mock.calls.some(([key]: [string]) => key === PRIMARY)).toBe(false);
    expect(images.some(({ image }) => image === art.suppliedTabBlue || image === art.inspiration)).toBe(false);
    expect(labels.map(({ text }) => text)).toContain(options.caption);
    expect(labels.map(({ text }) => text)).not.toContain("修复");
  });

  it("keeps star conditions and replay controls hidden for a locked level collection", () => {
    const { game, render, art, images, labels } = detailGame(LEVEL);
    render();
    expect(labels.map(({ text }) => text)).toContain("通关第 44 关解锁");
    expect(labels.some(({ text }) => /通关关卡|拖动内通关|秒内通关/.test(text))).toBe(false);
    expect(images.some(({ image }) => image === art.starFilled || image === art.starEmpty)).toBe(false);
    expect(game.drawPressable.mock.calls.some(([key]: [string]) => key === PRIMARY)).toBe(false);
  });

  it("retains all three star conditions and replay controls for an obtained level collection", () => {
    const { game, render, art, images, labels } = detailGame(LEVEL, { completed: true });
    render();
    expect(labels.some(({ text }) => text === "通关关卡")).toBe(true);
    expect(labels.filter(({ text }) => /拖动内通关|秒内通关/.test(text))).toHaveLength(2);
    expect(images.filter(({ image }) => image === art.starFilled || image === art.starEmpty)).toHaveLength(3);
    expect(game.drawPressable.mock.calls.filter(([key]: [string]) => key === PRIMARY)).toHaveLength(1);
  });

  it.each([1, 568 / 1078])("moves the restoration button and all its content together within the panel at scale %s", cssScale => {
    const { layout, render, art, images, labels } = detailGame(MASTERPIECE, { completed: true, cssScale });
    const level = detailGame(LEVEL, { completed: true, cssScale }).layout;
    const expectedButton = collectionAlbumArtRect({ x: 238, y: 1118, width: 242, height: 90 }, layout.artTransform);
    const expectedIcon = collectionAlbumArtRect({ x: 325, y: 1125, width: 40, height: 40 }, layout.artTransform);
    const expectedCost = collectionAlbumArtRect({ x: 361, y: 1128, width: 32, height: 40 }, layout.artTransform);
    const expectedLabel = collectionAlbumArtRect({ x: 250, y: 1162, width: 218, height: 40 }, layout.artTransform);
    expectRectClose(layout.detail.primaryAction.visual, expectedButton);
    expectRectClose(layout.detail.restorationIcon, expectedIcon);
    expectRectClose(layout.detail.restorationCost, expectedCost);
    expectRectClose(layout.detail.restorationLabel, expectedLabel);
    // The level replay action was already at native y=1118; do not lift it twice.
    expectRectClose(level.detail.primaryAction.visual, expectedButton);
    for (const rect of [layout.detail.primaryAction.visual, layout.detail.primaryAction.hit,
      layout.detail.restorationIcon, layout.detail.restorationCost, layout.detail.restorationLabel]) {
      expect(inside(rect, layout.detail.panel)).toBe(true);
    }
    expect(inside(layout.detail.primaryAction.visual, layout.detail.primaryAction.hit)).toBe(true);
    render();
    expectRectClose(images.find(({ image }) => image === art.suppliedTabBlue)!.rect, expectedButton);
    expectRectClose(images.find(({ image }) => image === art.inspiration)!.rect, expectedIcon);
    const costLabel = labels.find(({ text }) => text === "50")!;
    expect(costLabel.x).toBeCloseTo(expectedCost.x + expectedCost.width / 2, 8);
    expect(costLabel.y).toBeCloseTo(expectedCost.y + expectedCost.height / 2, 8);
    const actionLabel = labels.find(({ text }) => text === "修复")!;
    expect(actionLabel.x).toBeCloseTo(expectedLabel.x + expectedLabel.width / 2, 8);
    expect(actionLabel.y).toBeCloseTo(expectedLabel.y + expectedLabel.height / 2, 8);
  });

  it("places save feedback and the restoration guide below the shifted action", () => {
    const { game, layout, render, labels } = detailGame(MASTERPIECE, { completed: true, inspiration: 50 });
    game.collectionAlbumFeedback = { text: "保存失败", color: "#a5414b" };
    render();
    const feedback = labels.find(({ text }) => text === "保存失败")!;
    const expectedFeedbackY = layout.detail.primaryAction.visual.y
      + layout.detail.primaryAction.visual.height + 26 * layout.artTransform.scale;
    expect(feedback.y).toBeCloseTo(expectedFeedbackY, 8);

    game.collectionAlbumFeedback = undefined;
    game.collectionRestorationGuide = { itemId: MASTERPIECE.id, age: 0 };
    game.collectionAlbumArtwork = { image: () => ({}) };
    game.popupEntrance = { active: false };
    game.appVisible = true;
    game.screen = "records";
    game.navigationTransition = undefined;
    game.drawCollectionRestorationGuide();
    const hint = labels.find(({ text }) => text === "点击修复，点亮这幅名画")!;
    expect(hint.y).toBeCloseTo(expectedFeedbackY, 8);
  });
});
