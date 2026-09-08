import { LEVELS } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { Point, Side } from "../src/core/types";

const key = (x: number, y: number): string => `${x},${y}`;
const sides: Side[] = ["top", "right", "bottom", "left"];

const found: Record<string, unknown> = {};
for (const level of LEVELS) {
  const model = new PuzzleModel(level);
  for (const block of model.snapshot().blocks) {
    if (!model.isBlockActive(model.getBlock(block.id)!)) continue;
    const reached = new Set([key(block.x, block.y)]);
    const queue: Point[] = [[block.x, block.y]];
    for (let index = 0; index < queue.length; index += 1) {
      const [x, y] = queue[index];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Point[]) {
        const nx = x + dx;
        const ny = y + dy;
        if (reached.has(key(nx, ny)) || !model.canPlace(model.getBlock(block.id)!, nx, ny)) continue;
        reached.add(key(nx, ny));
        queue.push([nx, ny]);
      }
    }
    for (const [x, y] of queue) {
      const cells = model.blockCells(block, x, y);
      const minX = Math.min(...cells.map(([cellX]) => cellX));
      const maxX = Math.max(...cells.map(([cellX]) => cellX));
      const minY = Math.min(...cells.map(([, cellY]) => cellY));
      const maxY = Math.max(...cells.map(([, cellY]) => cellY));
      for (const side of sides) {
        const atEdge = side === "top" ? minY === 0 : side === "bottom" ? maxY === level.height - 1 : side === "left" ? minX === 0 : maxX === level.width - 1;
        if (!atEdge) continue;
        const gate = level.gates.find((candidate) => candidate.side === side && (
          side === "top" || side === "bottom"
            ? minX >= candidate.offset && maxX < candidate.offset + candidate.size
            : minY >= candidate.offset && maxY < candidate.offset + candidate.size
        ));
        const activeColor = block.layers[0] ?? block.color;
        const fixture = { levelId: level.id, blockId: block.id, from: [block.x, block.y], target: [x, y], side, blockColor: activeColor, gateColor: gate?.color };
        if (!found.wrongColor && gate && gate.color !== activeColor) found.wrongColor = fixture;
        if (!found.frozenGate && gate && gate.color === activeColor && (gate.frozen ?? 0) > 0) found.frozenGate = fixture;
        if (!found.noGate && !gate) found.noGate = fixture;
      }
    }
  }
}

console.log(JSON.stringify(found, null, 2));
if (!found.wrongColor || !found.frozenGate || !found.noGate) throw new Error("Missing an exit-feedback fixture");
