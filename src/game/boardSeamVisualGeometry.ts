import { boardCellsSeparatedBySeam } from "../core/boardSeams";
import { portalBoundaryAnchor } from "../core/gatePortals";
import type { GatePortalSpec, LevelSpec, Point } from "../core/types";

export type BoardCompartmentGeometry = Readonly<Pick<
  LevelSpec,
  "width" | "height" | "playable" | "blocked" | "seams"
>>;

const pointKey = ([x, y]: Point): string => `${x},${y}`;

/**
 * Returns the playable chamber reachable from the supplied source cells
 * without crossing a physical board seam. Rendering uses this to prevent an
 * exiting sprite from reappearing in the playable chamber across a local
 * portal while preserving the legacy whole-board clip when no seam exists.
 */
export const connectedBoardCompartment = (
  board: BoardCompartmentGeometry,
  sourceCells: readonly Point[],
  exitPortal?: Readonly<GatePortalSpec>,
): Point[] => {
  const blocked = new Set((board.blocked ?? []).map(pointKey));
  const authoredPlayable = board.playable ?? Array.from({ length: board.width * board.height }, (_, index) => (
    [index % board.width, Math.floor(index / board.width)] as Point
  ));
  const [portalBoundaryX, portalBoundaryY] = exitPortal
    ? portalBoundaryAnchor(exitPortal)
    : [0, 0];
  const isOnPortalSourceSide = ([x, y]: Point): boolean => {
    if (!exitPortal) return true;
    if (exitPortal.side === "top") return y >= portalBoundaryY;
    if (exitPortal.side === "bottom") return y < portalBoundaryY;
    if (exitPortal.side === "left") return x >= portalBoundaryX;
    return x < portalBoundaryX;
  };
  const playable = new Map(authoredPlayable
    .filter((point) => !blocked.has(pointKey(point)))
    .filter(isOnPortalSourceSide)
    .map((point) => [pointKey(point), point] as const));
  const source = sourceCells.find((point) => playable.has(pointKey(point)));
  if (!source) return [...playable.values()].map(([x, y]) => [x, y] as Point);

  const visited = new Set<string>();
  const queue: Point[] = [[source[0], source[1]]];
  const result: Point[] = [];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const currentKey = pointKey(current);
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    result.push(current);
    const [x, y] = current;
    for (const next of [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]] as Point[]) {
      const nextKey = pointKey(next);
      if (visited.has(nextKey) || !playable.has(nextKey)) continue;
      if (boardCellsSeparatedBySeam(board, current, next)) continue;
      queue.push(next);
    }
  }
  return result;
};
