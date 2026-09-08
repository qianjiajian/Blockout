import { describe, expect, it } from "vitest";
import {
  buildChapterLeaderboard,
  buildEfficiencyLeaderboard,
  paginateLeaderboard,
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

describe("local leaderboard pagination", () => {
  it("keeps all chapters available after sorting", () => {
    const stars = Object.fromEntries(Array.from({ length: 100 }, (_, index) => [String(index + 1), index < 20 ? 3 : index < 57 ? 2 : 0]));
    const rewarded = Array.from({ length: 57 }, (_, index) => index + 1);
    const entries = buildChapterLeaderboard(100, stars, rewarded);

    expect(entries).toHaveLength(10);
    expect(new Set(entries.map(({ chapter }) => chapter))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    expect(entries[0]).toMatchObject({ chapter: 1, stars: 30, cleared: 10, total: 10 });
    expect(paginateLeaderboard(entries, 0)).toMatchObject({ page: 0, pageCount: 2, totalEntries: 10, firstRank: 1, canGoBack: false, canGoForward: true });
    expect(paginateLeaderboard(entries, 1)).toMatchObject({ page: 1, pageCount: 2, totalEntries: 10, firstRank: 6, canGoBack: true, canGoForward: false });
  });

  it("keeps every valid efficiency record instead of truncating at five", () => {
    const levels = Array.from({ length: 20 }, (_, index) => level(index + 1, 12));
    const records = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [String(index + 1), 8 + index]));
    const entries = buildEfficiencyLeaderboard({ ...records, bad: 4, "99": 3, "2.5": 7, "3": 0 }, levels);

    expect(entries).toHaveLength(19);
    expect(entries[0]).toMatchObject({ level: 1, moves: 8, par: 12, delta: -4 });
    const secondPage = paginateLeaderboard(entries, 1);
    expect(secondPage).toMatchObject({ page: 1, pageCount: 4, totalEntries: 19, firstRank: 6, canGoBack: true, canGoForward: true });
    expect(secondPage.entries).toHaveLength(5);
  });

  it("clamps stale pages and handles an empty board", () => {
    expect(paginateLeaderboard([1, 2, 3], 99)).toMatchObject({ page: 0, pageCount: 1, firstRank: 1, canGoBack: false, canGoForward: false });
    expect(paginateLeaderboard([], -4)).toEqual({
      entries: [],
      page: 0,
      pageCount: 1,
      totalEntries: 0,
      firstRank: 1,
      canGoBack: false,
      canGoForward: false,
    });
  });
});
