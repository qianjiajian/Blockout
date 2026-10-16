import { createHash } from 'node:crypto';

const sha = (text) => createHash('sha256').update(text).digest('hex');
const sorted = (items) => items.map((item) => JSON.stringify(item)).sort();
const points = (items) => [...items].sort(([ax, ay], [bx, by]) => ax - bx || ay - by);
const rectangle = (x, y, width, height) => Array.from({ length: width * height }, (_, i) => [x + i % width, y + Math.floor(i / width)]);

/** Dihedral equivalence is used only for duplicate detection, never to rotate game art. */
function transforms(width, height) {
  return Array.from({ length: 8 }, (_, index) => {
    const mirror = index >= 4;
    const turns = index % 4;
    const transform = ([px, py]) => {
      let x = mirror ? width - 1 - px : px;
      let y = py;
      let w = width, h = height;
      for (let turn = 0; turn < turns; turn += 1) {
        [x, y] = [h - 1 - y, x];
        [w, h] = [h, w];
      }
      return [x, y];
    };
    return { transform, size: turns % 2 ? [height, width] : [width, height] };
  });
}

function seamEdges(level) {
  return (level.seams ?? []).flatMap((seam) => Array.from({ length: seam.size }, (_, i) => {
    const tangent = seam.start + i;
    return seam.orientation === 'horizontal'
      ? [[tangent, seam.offset - 1], [tangent, seam.offset]]
      : [[seam.offset - 1, tangent], [seam.offset, tangent]];
  }));
}

function canonical(level, includePartitions) {
  if (!Number.isSafeInteger(level.width) || !Number.isSafeInteger(level.height) || level.width < 1 || level.height < 1) {
    throw new Error('Invalid board dimensions');
  }
  const cells = level.playable ?? rectangle(0, 0, level.width, level.height);
  return transforms(level.width, level.height).map(({ transform, size }) => {
    const project = (list) => points(list.map(transform));
    const outline = {
      size,
      playable: project(cells),
      blocked: project(level.blocked ?? []),
      seams: sorted(seamEdges(level).map(project)),
    };
    if (!includePartitions) return JSON.stringify(outline);
    const queued = new Set((level.generators ?? []).flatMap((machine) => machine.queueBlockIds));
    // Deliberately omit colour, labels, counters and gate shifts. A different
    // counter or exit is not a replacement for an independently arranged board.
    // Block IDs/order and all eight whole-board symmetries are also ignored.
    return JSON.stringify({
      ...outline,
      blocks: sorted(level.blocks.map((block) => ({
        cells: project(block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy])),
        cohort: queued.has(block.id) ? 'queue' : block.shutterId ? 'hidden' : 'opening',
      }))),
      covers: sorted((level.shutters ?? []).map((cover) => project(rectangle(cover.x, cover.y, cover.width, cover.height)))),
      spawns: project((level.generators ?? []).map((machine) => machine.spawn)),
    });
  }).sort()[0];
}

export const boardBaselineKey = (level) => canonical(level, false);
export const independentPartitionKey = (level) => canonical(level, true);
export const boardBaselineSha256 = (level) => sha(boardBaselineKey(level));
export const independentPartitionSha256 = (level) => sha(independentPartitionKey(level));

export function auditIndependentLayouts(records) {
  const byPartition = new Map();
  const rows = records.map(({ formalId, level, sourceLevel }) => {
    const partitionSha256 = independentPartitionSha256(level);
    const group = byPartition.get(partitionSha256) ?? [];
    group.push(formalId);
    byPartition.set(partitionSha256, group);
    return {
      formalId, partitionSha256,
      boardBaselineSha256: boardBaselineSha256(level),
      sourceBoardBaselineSha256: sourceLevel ? boardBaselineSha256(sourceLevel) : null,
      retainsSourceBoard: sourceLevel ? boardBaselineKey(level) === boardBaselineKey(sourceLevel) : null,
      rearrangedSource: sourceLevel ? independentPartitionKey(level) !== independentPartitionKey(sourceLevel) : null,
    };
  });
  const duplicates = [...byPartition].filter(([, ids]) => ids.length > 1)
    .map(([partitionSha256, formalIds]) => ({ partitionSha256, formalIds }));
  return { rows, duplicates, uniquePartitions: byPartition.size, allIndependent: duplicates.length === 0 };
}
