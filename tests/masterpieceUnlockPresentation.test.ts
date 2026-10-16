import { describe, expect, it, vi } from "vitest";
import { MASTERPIECE_COLLECTION_CATALOG } from "../src/core/collectionCatalog";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { WIN_SETTLEMENT_LAYOUT } from "../src/game/winSettlementLayout";

type Rect = { x: number; y: number; width: number; height: number };
type Draw = { kind: "fill" | "stroke" | "image"; rect: Rect; style?: string; image?: unknown; clip?: Rect };
const layout = WIN_SETTLEMENT_LAYOUT.unlock;

/** Exercise the actual formal-art renderer, without constructing a game or opening storage. */
function progressGame(current: number, options: {
  previous?: number; total?: number; age?: number; reducedMotion?: boolean; terminal?: boolean;
} = {}) {
  const total = options.total ?? 5;
  const game = Object.create(ColorEscapeGame.prototype) as any;
  const draws: Draw[] = [];
  let points: [number, number][] = [];
  let clip: Rect | undefined;
  const bounds = (): Rect => {
    const xs = points.map(point => point[0]), ys = points.map(point => point[1]);
    return { x: Math.min(...xs), y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  };
  const stack: { fillStyle: string; strokeStyle: string; lineWidth: number; clip?: Rect }[] = [];
  const ctx = {
    fillStyle: "initial-fill", strokeStyle: "initial-stroke", lineWidth: 1,
    save: vi.fn(() => stack.push({ fillStyle: ctx.fillStyle, strokeStyle: ctx.strokeStyle, lineWidth: ctx.lineWidth, clip })),
    restore: vi.fn(() => {
      const state = stack.pop()!;
      ctx.fillStyle = state.fillStyle; ctx.strokeStyle = state.strokeStyle; ctx.lineWidth = state.lineWidth; clip = state.clip;
    }),
    beginPath: vi.fn(() => { points = []; }),
    moveTo: (x: number, y: number) => points.push([x, y]),
    lineTo: (x: number, y: number) => points.push([x, y]),
    quadraticCurveTo: (cx: number, cy: number, x: number, y: number) => { points.push([cx, cy], [x, y]); },
    closePath: vi.fn(),
    rect: (x: number, y: number, width: number, height: number) => { points.push([x, y], [x + width, y + height]); },
    clip: vi.fn(() => { clip = bounds(); }),
    fill: vi.fn(() => draws.push({ kind: "fill", rect: bounds(), style: ctx.fillStyle })),
    stroke: vi.fn(() => draws.push({ kind: "stroke", rect: bounds(), style: ctx.strokeStyle })),
    drawImage: vi.fn((image: unknown, x: number, y: number, width: number, height: number) => {
      draws.push({ kind: "image", image, rect: { x, y, width, height }, clip });
    }),
  };
  const art = Object.fromEntries(["unlockPanel", "unlockCrown", "progressTrack", "progressFill", "unlockCheck", "artworkFrame"]
    .map(key => [key, { key }]));
  Object.assign(game, {
    ctx,
    winArt: { suppliedSettlement: art },
    save: Object.freeze({ language: "zh-CN", reducedMotion: options.reducedMotion ?? true,
      collectionProgress: Object.freeze({ inspiration: 50, restoredMasterpieceIds: Object.freeze([]) }) }),
    host: { storageSet: vi.fn(), storageRead: vi.fn() },
    masterpieceUnlockPresentation: {
      age: options.age ?? 1.25,
      progress: Object.freeze({ targetId: options.terminal ? undefined : MASTERPIECE_COLLECTION_CATALOG[1]!.id,
        previous: options.previous ?? current, current, total, remaining: total - current,
        justUnlocked: !options.terminal && current === total, allUnlocked: options.terminal ?? false }),
    },
    label: vi.fn(),
    drawMasterpieceUnlockTarget: vi.fn(),
  });
  return { game, ctx, art, draws, render: () => game.drawMasterpieceUnlockProgress(),
    slots: () => draws.filter(draw => draw.kind === "fill" && draw.style === "#35204f"),
    fills: () => draws.filter(draw => draw.image === art.progressFill),
  };
}

describe("formal masterpiece unlock progress slots", () => {
  it.each([0, 1, 2, 5])("retains five outlined dark slots at %s/5 and lights only earned progress", current => {
    const { game, ctx, art, draws, render, slots, fills } = progressGame(current);
    const saved = JSON.stringify(game.save), presentation = JSON.stringify(game.masterpieceUnlockPresentation);
    render();
    expect(layout.segmentGap).toBe(8);
    expect(slots()).toHaveLength(5);
    expect(draws.filter(draw => draw.kind === "stroke" && draw.style === "#9767bb")).toHaveLength(5);
    expect(fills()).toHaveLength(current);
    expect(draws.filter(draw => draw.image === art.progressTrack)).toHaveLength(1);
    slots().forEach((slot, index) => {
      expect(slot.rect).toEqual({ x: 59 + index * 76, y: 1371, width: 68, height: 39 });
      if (index > 0) expect(slot.rect.x - slots()[index - 1]!.rect.x - slot.rect.width).toBe(8);
      if (index < current) {
        expect(fills()[index]!.rect).toEqual(slot.rect);
        expect(fills()[index]!.clip).toEqual(slot.rect);
        expect(draws.indexOf(slot)).toBeLessThan(draws.indexOf(fills()[index]!));
      }
    });
    expect(draws.filter(draw => draw.image === art.unlockCheck)).toHaveLength(current === 5 ? 1 : 0);
    expect(game.drawMasterpieceUnlockTarget).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(game.save)).toBe(saved);
    expect(JSON.stringify(game.masterpieceUnlockPresentation)).toBe(presentation);
    expect(game.host.storageSet).not.toHaveBeenCalled();
    expect(game.host.storageRead).not.toHaveBeenCalled();
    expect(ctx.save).toHaveBeenCalledTimes(ctx.restore.mock.calls.length);
    expect(ctx.fillStyle).toBe("initial-fill");
    expect(ctx.strokeStyle).toBe("initial-stroke");
  });

  it("keeps all slots visible while the next green segment animates fractionally", () => {
    const { render, slots, fills } = progressGame(2, { previous: 1, age: 0.32 + 0.3, reducedMotion: false });
    render();
    expect(slots()).toHaveLength(5);
    expect(fills()).toHaveLength(2);
    expect(fills()[0]!.clip!.width).toBe(68);
    // Halfway through the existing cubic easing: 1 - (1 - 0.5)^3 = 0.875.
    expect(fills()[1]!.clip!.width).toBeCloseTo(68 * 0.875, 8);
    expect(fills()[1]!.rect.width).toBe(68);
  });

  it.each([3, 7])("derives slot count and width from a non-five interval of %s", total => {
    const { render, slots, fills } = progressGame(2, { total });
    render();
    expect(slots()).toHaveLength(total);
    expect(fills()).toHaveLength(2);
    const width = (layout.track.width - 14 - 8 * (total - 1)) / total;
    slots().forEach((slot, index) => {
      expect(slot.rect.x).toBeCloseTo(layout.fill.x + index * (width + 8), 8);
      expect(slot.rect.width).toBeCloseTo(width, 8);
    });
    const last = slots().at(-1)!.rect;
    expect(last.x + last.width).toBeCloseTo(layout.track.x + layout.track.width - 7, 8);
  });

  it("does not invent slots or green progress when there is no next target", () => {
    const { game, art, draws, render, slots, fills } = progressGame(0, { total: 0, terminal: true });
    render();
    expect(slots()).toHaveLength(0);
    expect(fills()).toHaveLength(0);
    expect(draws.filter(draw => draw.image === art.unlockCheck)).toHaveLength(1);
    expect(game.label.mock.calls[0]![0]).toBe("全部名画已解锁");
    expect(draws.every(draw => Object.values(draw.rect).every(Number.isFinite))).toBe(true);
  });

  it.each(["dailyChallengeWin", "temporaryLevelTestSession", "noPresentation"])("omits campaign progress for %s", state => {
    const { game, render, draws } = progressGame(1);
    if (state === "noPresentation") game.masterpieceUnlockPresentation = undefined;
    else game[state] = {};
    render();
    expect(draws).toEqual([]);
  });
});
