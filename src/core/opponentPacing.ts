/** Shared opponent personalities; each mode chooses its own progress bands. */
export type OpponentType = "casual" | "steady" | "active" | "expert";

export const OPPONENT_PERIOD_HOURS: Readonly<Record<OpponentType, readonly [number, number, number, number]>> = {
  casual: [12, 14, 16, 18],
  steady: [6, 8, 10, 12],
  active: [3, 5, 7, 9],
  expert: [2, 4, 6, 8],
};

export function opponentTypeForIndex(index: number, rosterSize: number): OpponentType {
  if (!Number.isSafeInteger(rosterSize) || rosterSize <= 0 || !Number.isSafeInteger(index)
    || index < 0 || index >= rosterSize) throw Error("Invalid opponent roster index");
  return index < Math.ceil(rosterSize * 0.4) ? "casual"
    : index < Math.ceil(rosterSize * 0.75) ? "steady"
    : index < Math.ceil(rosterSize * 0.95) ? "active" : "expert";
}
