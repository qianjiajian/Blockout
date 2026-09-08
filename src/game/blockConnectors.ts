import type { Point } from "../core/types";
import type { QuarterTurn } from "./boardRim";

export interface BlockConnectorPlacement {
  x: number;
  y: number;
  quarterTurns: QuarterTurn;
}

export const buildBlockConnectorLayout = (cells: readonly Point[]): BlockConnectorPlacement[] => {
  const occupied = new Set(cells.map(([x, y]) => `${x},${y}`));
  const connectors: BlockConnectorPlacement[] = [];
  for (const [x, y] of cells) {
    if (occupied.has(`${x + 1},${y}`)) connectors.push({ x: x + 1, y: y + 0.5, quarterTurns: 1 });
    if (occupied.has(`${x},${y + 1}`)) connectors.push({ x: x + 0.5, y: y + 1, quarterTurns: 0 });
  }
  return connectors;
};
