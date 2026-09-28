import { describe, expect, it } from "vitest";
import {
  buildChapterLeaderboard,
  buildEfficiencyLeaderboard,
  buildProgressLeaderboard,
} from "../src/core/localLeaderboard";
import type { LevelSpec } from "../src/core/types";

const level = (id: number, parMoves = 10): LevelSpec => ({
  id,
  name: `Lv ${id}`,
  width: 2,
  height: 2,
  timeSeconds: 120,
  reward: 10,
  difficulty: "normal",
  parMoves,
  playable: [[0, 0], [1, 0], [0, 1], [1, 1]],
  blocked: [],
  gates: [],
  blocks: [{ id: `b${id}`, color: "red", x: 0, y: 0, shape: [[0, 0]] }],
});

describe("local leaderboard data", () => {
  it("keeps all chapters available after sorting", () => {
    const stars = Object.fromEntries(Array.from({ length: 100 }, (_, index) => [String(index + 1), index < 20 ? 3 : index < 57 ? 2 : 0]));
    const rewarded = Array.from({ length: 57 }, (_, index) => index + 1);
    const entries = buildChapterLeaderboard(100, stars, rewarded);

    expect(entries).toHaveLength(10);
    expect(new Set(entries.map(({ chapter }) => chapter))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    expect(entries[0]).toMatchObject({ chapter: 1, stars: 30, cleared: 10, total: 10 });
  });

  it("keeps every valid efficiency record instead of truncating at five", () => {
    const levels = Array.from({ length: 20 }, (_, index) => level(index + 1, 12));
    const records = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [String(index + 1), 8 + index]));
    const entries = buildEfficiencyLeaderboard({ ...records, bad: 4, "99": 3, "2.5": 7, "3": 0 }, levels);

    expect(entries).toHaveLength(19);
    expect(entries[0]).toMatchObject({ level: 1, moves: 8, par: 12, delta: -4 });
  });

  it("builds a newest-first progress history without inventing records", () => {
    const entries = buildProgressLeaderboard(
      100,
      6,
      { "1": 3, "4": 2, "6": 1 },
      { "4": 14, "6": 18 },
      [1, 2, 3, 4, 5],
    );

    expect(entries.map(({ level }) => level)).toEqual([5, 4, 3, 2, 1]);
    expect(entries.find(({ level }) => level === 4)).toEqual({ level: 4, stars: 2, moves: 14 });
    expect(entries.some(({ level }) => level === 6)).toBe(false);
  });
});
