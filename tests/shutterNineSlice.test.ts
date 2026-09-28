import { describe, expect, it } from 'vitest';
import { drawRevisedRegion } from '../src/game/revisedMechanismDrawing';
import { sampleRevisedRegionAnimation } from '../src/game/revisedRegionAnimation';
import { projectShutterVisualRect } from '../src/game/shutterVisualLayout';
import { SHUTTER_NINE_SLICE_PATHS, SHUTTER_NINE_SLICE_URLS,
  shutterFramePieces, shutterFrameScale, shutterEdgeUnderlap, SHUTTER_EDGE_SOURCE_RECTS,
  type ShutterNineSliceImages } from '../src/game/shutterNineSlice';
import { ACTIVE_REVISED_MECHANISM_ART_PATHS, REVISED_MECHANISM_ART_URLS } from '../src/game/revisedMechanismArt';
// @ts-ignore Build-time provenance verifier, not bundled game code.
import { verifyShutterNineSlice } from '../tools/import-shutter-nine-slice.mjs';

const corners = { topLeft: [86, 78], topRight: [80, 78], bottomLeft: [86, 84], bottomRight: [80, 84] };
const images = Object.fromEntries(Object.keys(SHUTTER_NINE_SLICE_URLS).map(part => [part, { part }])) as ShutterNineSliceImages;
const recording = () => {
  const draws: { args: unknown[]; alpha: number }[] = [];
  const stack: number[] = [], context: Record<string, unknown> = { globalAlpha: 0.8 };
  for (const op of ['beginPath', 'rect', 'clip', 'translate', 'scale', 'moveTo', 'lineTo', 'quadraticCurveTo',
    'closePath', 'fill', 'stroke', 'fillRect', 'strokeText', 'fillText']) context[op] = () => {};
  context.drawImage = (...args: unknown[]) => draws.push({ args, alpha: context.globalAlpha as number });
  context.save = () => stack.push(context.globalAlpha as number);
  context.restore = () => { context.globalAlpha = stack.pop(); };
  return { ctx: context as unknown as CanvasRenderingContext2D, draws, stack };
};

describe('user supplied shutter nine-slice', () => {
  it('retains all nine original PNG bytes, dimensions and RGBA; reference screenshot is excluded', async () => {
    expect(await verifyShutterNineSlice()).toEqual({ entries: 9, bytes: 120127, exactOriginals: true });
    expect(SHUTTER_NINE_SLICE_PATHS).toHaveLength(9);
    expect(ACTIVE_REVISED_MECHANISM_ART_PATHS).toHaveLength(71);
    expect(new Set(ACTIVE_REVISED_MECHANISM_ART_PATHS).size).toBe(71);
    expect(ACTIVE_REVISED_MECHANISM_ART_PATHS).not.toContain(REVISED_MECHANISM_ART_URLS.shutterStrip);
  });

  it('reconstructs the exact corner/edge registration in the reference', () => {
    const pieces = shutterFramePieces({ x: 310, y: 418, width: 295, height: 292 }, 1);
    expect(pieces.map(p => [p.part, p.x, p.y, p.width, p.height])).toEqual([
      ['top', 394, 418, 133, 21], ['bottom', 394, 688, 133, 22],
      ['left', 310, 495, 20, 135], ['right', 584, 494, 21, 134],
      ['topLeft', 310, 418, 86, 78], ['topRight', 525, 418, 80, 78],
      ['bottomLeft', 310, 626, 86, 84], ['bottomRight', 525, 626, 80, 84],
    ]);
  });

  it.each([24, 32, 48, 64, 80])('fixes corner sizes and edge thickness for every curtain at cell=%i', cell => {
    const scale = shutterFrameScale(cell), board = { innerX: 20, innerY: 150, cell };
    for (const [w, h] of [[1, 1], [1, 8], [8, 1], [3, 3], [5, 3], [2, 9], [9, 9]]) {
      const rect = projectShutterVisualRect(0, 0, w, h, board), pieces = shutterFramePieces(rect, scale);
      expect(pieces).toHaveLength(8);
      for (const p of pieces) {
        expect(p.x).toBeGreaterThanOrEqual(rect.x - 1e-8);
        expect(p.y).toBeGreaterThanOrEqual(rect.y - 1e-8);
        expect(p.x + p.width).toBeLessThanOrEqual(rect.x + rect.width + 1e-8);
        expect(p.y + p.height).toBeLessThanOrEqual(rect.y + rect.height + 1e-8);
        expect(p.width).toBeGreaterThan(0); expect(p.height).toBeGreaterThan(0);
        const corner = corners[p.part as keyof typeof corners];
        if (corner) { expect(p.width).toBe(corner[0] * scale); expect(p.height).toBe(corner[1] * scale); }
      }
      expect(pieces[0].height).toBe(21 * scale); expect(pieces[1].height).toBe(22 * scale);
      expect(pieces[2].width).toBe(20 * scale); expect(pieces[3].width).toBe(21 * scale);
      // Overlap at all eight joints, including the smallest one-cell curtain.
      const [top, bottom, left, right, tl, tr, bl, br] = pieces;
      expect(top.x).toBeLessThan(tl.x + tl.width); expect(top.x + top.width).toBeGreaterThan(tr.x);
      expect(bottom.x).toBeLessThan(bl.x + bl.width); expect(bottom.x + bottom.width).toBeGreaterThan(br.x);
      expect(left.y).toBeLessThan(tl.y + tl.height); expect(left.y + left.height).toBeGreaterThan(bl.y);
      expect(right.y).toBeLessThan(tr.y + tr.height); expect(right.y + right.height).toBeGreaterThan(br.y);
    }
  });

  it('does not silently squash corners to fit invalid or too-small boxes', () => {
    for (const s of [0, -1, NaN, Infinity]) expect(shutterFramePieces({ x: 0, y: 0, width: 200, height: 200 }, s)).toEqual([]);
    expect(shutterFramePieces({ x: 0, y: 0, width: 165, height: 200 }, 1)).toEqual([]);
    expect(shutterFramePieces({ x: 0, y: 0, width: 200, height: 161 }, 1)).toEqual([]);
    expect(shutterFrameScale(NaN)).toBe(0);
  });

  it('draws panel first, straight edges second and four intact corner images last', () => {
    const log = recording(), rect = { x: 10, y: 20, width: 295, height: 292 };
    drawRevisedRegion(log.ctx, rect, 'shutter', { shutter: images, shutterScale: 1 }, undefined, 6);
    expect(log.draws).toHaveLength(9);
    expect(log.draws[0].args).toEqual([images.panel, 10, 20, 295, 292]);
    for (const [i, p] of shutterFramePieces(rect, 1).entries()) {
      if (p.part in corners) expect(log.draws[i + 1].args).toEqual([images[p.part], p.x, p.y, p.width, p.height]);
      else {
        const source = SHUTTER_EDGE_SOURCE_RECTS[p.part as keyof typeof SHUTTER_EDGE_SOURCE_RECTS];
        const horizontal = p.part === 'top' || p.part === 'bottom', overlap = shutterEdgeUnderlap(1);
        expect(log.draws[i + 1].args).toEqual([images[p.part], source.x, source.y, source.width, source.height,
          p.x - (horizontal ? overlap : 0), p.y - (horizontal ? 0 : overlap),
          p.width + (horizontal ? overlap * 2 : 0), p.height + (horizontal ? 0 : overlap * 2)]);
      }
    }
    expect(log.ctx.globalAlpha).toBe(0.8); expect(log.stack).toHaveLength(0);
  });

  it('excludes cut-face alpha and supplies a clean sampling guard without cropping thickness', () => {
    expect(SHUTTER_EDGE_SOURCE_RECTS).toEqual({
      top: { x: 2, y: 0, width: 129, height: 21 }, bottom: { x: 2, y: 0, width: 129, height: 22 },
      left: { x: 0, y: 2, width: 20, height: 131 }, right: { x: 0, y: 2, width: 21, height: 130 },
    });
    expect(shutterEdgeUnderlap(0.3)).toBe(2);
    expect(shutterEdgeUnderlap(0.01)).toBe(0.24);
    for (const cell of [24, 32, 64, 80]) {
      const scale = shutterFrameScale(cell), size = cell - 2 * Math.max(2, cell * 0.035);
      const log = recording();
      drawRevisedRegion(log.ctx, { x: 0, y: 0, width: size, height: size }, 'shutter', { shutter: images, shutterScale: scale }, undefined, 6);
      for (const { args } of log.draws.slice(1, 5)) {
        const [x, y, w, h] = args.slice(-4) as number[];
        expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0);
        expect(x + w).toBeLessThanOrEqual(size + 1e-8); expect(y + h).toBeLessThanOrEqual(size + 1e-8);
      }
    }
  });

  it('opening translates only the panel, not its size or any corner; fully open draws nothing', () => {
    const rect = { x: 10, y: 20, width: 295, height: 292 }, closed = recording(), middle = recording(), open = recording();
    drawRevisedRegion(closed.ctx, rect, 'shutter', { shutter: images, shutterScale: 1 }, undefined, 6);
    const sample = { ...sampleRevisedRegionAnimation('shutter', 0), openProgress: 0.5, counterScale: 0 };
    drawRevisedRegion(middle.ctx, rect, 'shutter', { shutter: images, shutterScale: 1 }, sample, 0);
    expect(middle.draws[0].args).toEqual([images.panel, 10, 20 - 146, 295, 292]);
    expect(middle.draws.slice(1)).toEqual(closed.draws.slice(1));
    drawRevisedRegion(open.ctx, rect, 'shutter', { shutter: images, shutterScale: 1 }, sampleRevisedRegionAnimation('shutter', 1), 0);
    expect(open.draws).toEqual([]); expect(middle.stack).toHaveLength(0);
  });
});
