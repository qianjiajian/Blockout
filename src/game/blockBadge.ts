export type BlockCell = readonly [number, number];

const neighborCount = (cell: BlockCell, occupied: Set<string>): number => {
  const [x, y] = cell;
  return [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]
    .filter(([nextX, nextY]) => occupied.has(`${nextX},${nextY}`)).length;
};

// Keep one accessibility symbol per connected block. The cell nearest the
// group centroid wins; connectivity, then top/left order, resolve ties so the
// result remains stable for bars, rectangles, and concave shapes.
export const chooseBlockBadgeCell = (cells: readonly BlockCell[]): BlockCell => {
  if (cells.length === 0) throw new Error("A block badge requires at least one cell");
  const centerX = cells.reduce((sum, [x]) => sum + x, 0) / cells.length;
  const centerY = cells.reduce((sum, [, y]) => sum + y, 0) / cells.length;
  const occupied = new Set(cells.map(([x, y]) => `${x},${y}`));
  return [...cells].sort((left, right) => {
    const leftDistance = (left[0] - centerX) ** 2 + (left[1] - centerY) ** 2;
    const rightDistance = (right[0] - centerX) ** 2 + (right[1] - centerY) ** 2;
    if (leftDistance !== rightDistance) return leftDistance - rightDistance;
    const degreeDifference = neighborCount(right, occupied) - neighborCount(left, occupied);
    if (degreeDifference !== 0) return degreeDifference;
    return left[1] - right[1] || left[0] - right[0];
  })[0];
};
