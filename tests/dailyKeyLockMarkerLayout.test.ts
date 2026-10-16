import { describe, expect, it, vi } from "vitest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { dailyKeyLockMarkerAnchor, dailyKeyLockMarkerLayout } from "../src/game/dailyKeyLockMarkerLayout";
import type { BlockCell } from "../src/game/blockBadge";

const concave: BlockCell[] = [[2, 1], [3, 1], [4, 1], [2, 2]];
const board = { innerX: 30, innerY: 100, cell: 48 };
const contains = (outer: { x: number; y: number; width: number; height: number }, inner: typeof outer) => {
  expect(inner.x).toBeGreaterThanOrEqual(outer.x - 1e-8);
  expect(inner.y).toBeGreaterThanOrEqual(outer.y - 1e-8);
  expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width + 1e-8);
  expect(inner.y + inner.height).toBeLessThanOrEqual(outer.y + outer.height + 1e-8);
};

const fixture = (daily = false, win = false) => {
  const image = { naturalWidth: 66, naturalHeight: 84, width: 66, height: 84 };
  const key = { id: "key", x: 0, y: 0, shape: [[0, 0]], color: "red", keyId: "g" };
  const lock = { id: "lock", x: 2, y: 1, shape: [[0, 0], [1, 0], [2, 0], [0, 1]], color: "blue", lockedBy: "g", lockCount: 2 };
  const ctx = Object.fromEntries(["save", "restore", "beginPath", "rect", "clip", "drawImage"].map(k => [k, vi.fn()]));
  const game: any = Object.assign(Object.create(ColorEscapeGame.prototype), {
    art: { videoParity: { keyTokens: { purple: image }, chainLocks: { purple: image } } },
    model: { level: { blocks: [key, lock] } }, ctx, revisedTransitions: [], save: { reducedMotion: false },
    dailyChallengeRunInfo: () => daily ? {} : undefined, dailyChallengeWin: win ? {} : undefined,
    boardLayout: () => board, label: vi.fn(),
  });
  return { game, ctx, key, lock, image };
};

describe("daily key/lock marker containment", () => {
  it("keeps full bitmap/count bounds inside a real cell at small and large scales", () => {
    for (const cell of [14, 24, 48, 80]) for (const cells of [concave, [[0, 0]] as BlockCell[], [[0, 0], [1, 0], [1, 1]] as BlockCell[]]) {
      for (const ratio of [0.2, 66 / 84, 1, 4]) for (const kind of ["key", "lock"] as const) {
        const l = dailyKeyLockMarkerLayout(cells, { ...board, cell }, kind, ratio);
        expect(cells.some(([x, y]) => x === l.cell[0] && y === l.cell[1])).toBe(true);
        contains(l.clip, l.image);
        contains(l.clip, { x: l.count.x - (l.count.maxWidth + l.count.strokeWidth) / 2,
          y: l.count.y - (l.count.size + l.count.strokeWidth) / 2,
          width: l.count.maxWidth + l.count.strokeWidth, height: l.count.size + l.count.strokeWidth });
        expect(l.anchor).toEqual(dailyKeyLockMarkerAnchor(cells, { ...board, cell }));
      }
    }
  });

  it("fixes the actual L4 concavity without altering legacy mainline/league positions", () => {
    for (const [daily, win] of [[false, false], [true, false], [false, true]]) {
      const { game, ctx, lock } = fixture(daily, win);
      game.drawBlockMechanicMarkers(lock, concave, board);
      const [, x, y, width, height] = ctx.drawImage.mock.calls[0];
      if (daily || win) {
        const l = dailyKeyLockMarkerLayout(concave, board, "lock", 66 / 84);
        expect([x, y, width, height]).toEqual([l.image.x, l.image.y, l.image.width, l.image.height]);
        expect(ctx.clip).toHaveBeenCalledOnce();
        expect(game.label.mock.calls[0][9]).toBe(l.count.maxWidth);
      } else {
        expect(x + width / 2).toBe(board.innerX + 3.5 * board.cell);
        expect(y + height / 2).toBeCloseTo(board.innerY + 1.88 * board.cell);
        expect(ctx.clip).not.toHaveBeenCalled();
        expect(game.label.mock.calls[0][3]).toBe(Math.max(16, board.cell * 0.34));
      }
    }
  });

  it("shares daily drawing anchors with both actual key-flight endpoints", () => {
    for (const daily of [false, true]) {
      const { game, key, lock } = fixture(daily);
      const base = { mechanismRules: "revised-2026-09-27-v1.5", shutters: [], flipDoors: [] };
      game.captureRevisedMechanicTransitions({ ...base, blocks: [key, lock] }, { ...base, blocks: [{ ...lock, lockCount: 1 }] });
      const transition = game.revisedTransitions[0];
      if (daily) {
        expect(transition.source).toEqual(dailyKeyLockMarkerAnchor([[0, 0]], board));
        expect(transition.target).toEqual(dailyKeyLockMarkerLayout(concave, board, "lock", 66 / 84).anchor);
      } else {
        expect(transition.source.x).toBe(board.innerX + 0.5 * board.cell);
        expect(transition.source.y).toBeCloseTo(board.innerY + 0.38 * board.cell);
        expect(transition.target.x).toBe(board.innerX + 3.5 * board.cell);
        expect(transition.target.y).toBeCloseTo(board.innerY + 1.88 * board.cell);
      }
    }
  });

  it("clips multi-digit labels and bitmap shadows together in daily mode", () => {
    const { game, ctx, lock } = fixture(true);
    game.drawBlockMechanicMarkers({ ...lock, lockCount: 12345 }, concave, { ...board, cell: 18 });
    expect(game.label.mock.calls[0][0]).toBe("12345");
    expect(game.label.mock.calls[0][9]).toBe(18 * 0.66);
    expect(ctx.clip.mock.invocationCallOrder[0]).toBeLessThan(ctx.drawImage.mock.invocationCallOrder[0]);
    expect(ctx.restore.mock.invocationCallOrder.at(-1)).toBeGreaterThan(game.label.mock.invocationCallOrder[0]);
  });
});
