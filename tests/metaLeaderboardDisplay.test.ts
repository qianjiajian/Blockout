import { describe, expect, it, vi } from "vitest";
import {
  buildMetaLeaderboard,
  metaLeaderboardDisplayEntries,
  META_LEADERBOARD_MODES,
  type MetaLeaderboardEntry,
  type MetaLeaderboardMode,
  type MetaLeaderboardSnapshot,
} from "../src/core/metaLeaderboard";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";

const GROUP_CREATED = Date.UTC(2026, 9, 9, 0);
const NOW = GROUP_CREATED + 4 * 3_600_000;
const playerInput = (stars: number) => ({
  highestLevel: Math.max(1, Math.ceil(stars / 3)),
  bestStars: Object.fromEntries(Array.from({ length: Math.ceil(stars / 3) }, (_, index) => [
    String(index + 1), Math.min(3, stars - index * 3),
  ])),
  playerId: "saved-player", playerName: "玩家", playerAvatar: 24, playerFrame: 18,
  weeklyStars: stars,
  nowMs: NOW, groupCreatedAtMs: GROUP_CREATED,
});

/** A source-supplied ranking with one authoritative player and 99 opponent rows. */
const rankedSnapshot = (playerRank: number): MetaLeaderboardSnapshot => {
  const player: MetaLeaderboardEntry = {
    id: "saved-player", name: "玩家", avatar: 24, frame: 18,
    totalStars: 201 - (playerRank - 1) * 2, rank: playerRank, isPlayer: true,
  };
  const entries = Array.from({ length: 99 }, (_, index): MetaLeaderboardEntry => ({
    id: `opponent-${index + 1}`, name: `对手${index + 1}`, avatar: index % 25, frame: 0,
    totalStars: 200 - index * 2, rank: index + 1 >= playerRank ? index + 2 : index + 1, isPlayer: false,
  }));
  return { mode: "world", source: "source-fixture", entries, player, totalPlayers: 100 };
};

const expectCompleteRanking = (snapshot: MetaLeaderboardSnapshot) => {
  const displayed = metaLeaderboardDisplayEntries(snapshot);
  expect(displayed).toHaveLength(100);
  expect(displayed.map(({ rank }) => rank)).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
  expect(new Set(displayed.map(({ id }) => id)).size).toBe(100);
  expect(displayed.filter(({ isPlayer }) => isPlayer)).toEqual([snapshot.player]);
  expect(displayed[snapshot.player.rank - 1]).toBe(snapshot.player);
  return displayed;
};

describe("mainline leaderboard display includes the ranked player", () => {
  it.each(META_LEADERBOARD_MODES)("puts the 120-star first-place player on the %s podium and list", (mode) => {
    const snapshot = buildMetaLeaderboard(mode, playerInput(120));
    expect(snapshot.player).toMatchObject({ rank: 1, totalStars: 120, name: "玩家", avatar: 24, frame: 18 });
    expect(snapshot.entries).toHaveLength(99);
    expect(snapshot.entries.some(({ isPlayer }) => isPlayer)).toBe(false);
    const displayed = expectCompleteRanking(snapshot);
    expect(displayed.slice(0, 3)).toEqual([snapshot.player, snapshot.entries[0], snapshot.entries[1]]);
    expect(displayed[1].totalStars).toBeLessThan(120);
  });

  it.each([2, 3, 50, 100])("inserts rank %i at the existing source position without changing anyone's rank", (rank) => {
    const snapshot = rankedSnapshot(rank);
    const before = structuredClone(snapshot);
    const displayed = expectCompleteRanking(snapshot);
    expect(displayed.filter(({ isPlayer }) => !isPlayer)).toEqual(snapshot.entries);
    expect(displayed.slice(0, 3).some(({ isPlayer }) => isPlayer)).toBe(rank <= 3);
    expect(snapshot).toEqual(before);
  });

  it.each(META_LEADERBOARD_MODES)("preserves player-first tie ordering from the %s source", (mode) => {
    const opponents = buildMetaLeaderboard(mode, playerInput(0));
    const topStars = opponents.entries[0].totalStars;
    const snapshot = buildMetaLeaderboard(mode, playerInput(topStars));
    expect(snapshot.player.rank).toBe(1);
    const displayed = expectCompleteRanking(snapshot);
    expect(displayed[0]).toBe(snapshot.player);
    expect(displayed[1]).toMatchObject({ totalStars: topStars, isPlayer: false, rank: 2 });
  });

  it("deduplicates provider-supplied copies in favor of the authoritative player", () => {
    const original = rankedSnapshot(2);
    const staleSameId = { ...original.player, isPlayer: false, rank: 99, totalStars: 0, name: "旧资料" };
    const stalePlayer = { ...original.player, id: "old-player-id", rank: 50, totalStars: 10 };
    const snapshot = { ...original, entries: [original.player, ...original.entries, staleSameId, stalePlayer] };
    const displayed = expectCompleteRanking(snapshot);
    expect(displayed[1]).toBe(original.player);
    expect(displayed).not.toContain(staleSameId);
    expect(displayed).not.toContain(stalePlayer);
    expect(snapshot.entries).toHaveLength(102);
  });

  it("sorts immutable source rows by their supplied ranks without recalculating scores", () => {
    const snapshot = rankedSnapshot(2);
    // An external ranking can have a different scoring policy. Its rank remains authoritative.
    const first = Object.freeze({ ...snapshot.entries[0], totalStars: 1 });
    const entries = Object.freeze([first, ...snapshot.entries.slice(1)].reverse().map((entry) => Object.freeze(entry)));
    const frozen = Object.freeze({ ...snapshot, entries, player: Object.freeze(snapshot.player) });
    const before = structuredClone(frozen);
    const displayed = expectCompleteRanking(frozen);
    expect(displayed[0]).toBe(first);
    expect(displayed[0].totalStars).toBeLessThan(displayed[1].totalStars);
    expect(frozen).toEqual(before);
    expect(frozen.entries).toBe(entries);
    expect(frozen.entries[0].rank).toBe(100);
  });

  it("retains a player-only source as one displayed row", () => {
    const snapshot = { ...rankedSnapshot(1), entries: [], totalPlayers: 1 };
    expect(metaLeaderboardDisplayEntries(snapshot)).toEqual([snapshot.player]);
  });
});

describe("actual game leaderboard scrolling", () => {
  it.each(META_LEADERBOARD_MODES)("uses all 100 ranked rows throughout the %s scroll range", (mode) => {
    const snapshot = buildMetaLeaderboard(mode, playerInput(120));
    const game = Object.create(ColorEscapeGame.prototype) as any;
    game.leaderboardMode = mode;
    game.leaderboardScrollOffsets = { weekly: 0, world: 0, country: 0 };
    game.leaderboardSnapshot = vi.fn((_mode: MetaLeaderboardMode = mode) => snapshot);
    game.safeOffsets = () => ({ top: 0, bottom: 0 });

    expect(game.leaderboardEntries(mode)).toEqual(metaLeaderboardDisplayEntries(snapshot));
    const top = game.leaderboardScrollView(mode);
    expect(top.totalEntries).toBe(100);
    expect(top.firstRank).toBe(1);
    expect(top.entries[0]).toBe(snapshot.player);
    expect(top.entries[0]).toMatchObject({ totalStars: 120, avatar: 24, frame: 18 });
    expect(top.canScrollDown).toBe(true);

    game.leaderboardScrollOffsets[mode] = Number.MAX_SAFE_INTEGER;
    const bottom = game.leaderboardScrollView(mode);
    expect(bottom.totalEntries).toBe(100);
    expect(bottom.lastRank).toBe(100);
    expect(bottom.entries.at(-1)).toBe(snapshot.entries.at(-1));
    expect(bottom.canScrollDown).toBe(false);
    expect(bottom.scrollOffset).toBe(bottom.maxScrollOffset);
    // The provider contract remains 99 opponents plus the separate fixed player row.
    expect(snapshot.entries).toHaveLength(99);
    expect(snapshot.player.rank).toBe(1);
  });
});
