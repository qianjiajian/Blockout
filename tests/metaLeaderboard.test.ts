import { describe, expect, it } from "vitest";
import {
  buildAllMetaLeaderboards,
  buildMetaLeaderboard,
  META_LEADERBOARD_AVATARS,
  META_LEADERBOARD_MAX_LEVEL,
  META_LEADERBOARD_MAX_STARS,
  META_LEADERBOARD_MODES,
  META_LEADERBOARD_PLACEHOLDER_PLAYER_RANK,
  type MetaLeaderboardSource,
} from "../src/core/metaLeaderboard";

const completeProgress = (highestLevel: number) => ({
  highestLevel,
  bestStars: Object.fromEntries(Array.from({ length: highestLevel }, (_, index) => [String(index + 1), 3])),
  playerName: "Player",
  playerAvatar: "panda",
});

describe("meta leaderboard", () => {
  it("normalizes campaign progress through Lv200 and 600 stars", () => {
    expect(META_LEADERBOARD_MAX_LEVEL).toBe(200);
    expect(META_LEADERBOARD_MAX_STARS).toBe(600);
    expect(buildMetaLeaderboard("world", completeProgress(200)).player.totalStars).toBe(600);
  });

  it.each(META_LEADERBOARD_MODES)("builds a stable placeholder %s player ranking", (mode) => {
    const first = buildMetaLeaderboard(mode, completeProgress(42));
    const second = buildMetaLeaderboard(mode, completeProgress(42));

    expect(second).toEqual(first);
    expect(first.source).toBe("placeholder-v1");
    expect(first.totalPlayers).toBe(100);
    expect(first.entries).toHaveLength(99);
    expect(first.entries.some((entry) => entry.isPlayer)).toBe(false);
    expect(first.player).toMatchObject({
      rank: META_LEADERBOARD_PLACEHOLDER_PLAYER_RANK,
      name: "Player",
      avatar: "panda",
      totalStars: 126,
      isPlayer: true,
    });
    expect(new Set(first.entries.map((entry) => entry.id)).size).toBe(99);
    expect(first.entries.every((entry) => META_LEADERBOARD_AVATARS.includes(entry.avatar))).toBe(true);
    expect([...first.entries.map((entry) => entry.rank), first.player.rank].sort((a, b) => a - b))
      .toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
  });

  it("uses the reference player names and podium avatar order", () => {
    const snapshot = buildMetaLeaderboard("world", completeProgress(1));

    expect(snapshot.entries.slice(0, 6).map(({ rank, name, avatar }) => ({ rank, name, avatar }))).toEqual([
      { rank: 1, name: "Mia", avatar: "fox" },
      { rank: 2, name: "Hed", avatar: "raccoon" },
      { rank: 3, name: "Kai", avatar: "panda" },
      { rank: 4, name: "Hedgehog", avatar: "cat" },
      { rank: 5, name: "Popner", avatar: "rabbit" },
      { rank: 6, name: "Kliphaked", avatar: "cat" },
    ]);
  });

  it("clamps hostile save values and sums only valid Lv1-Lv200 stars", () => {
    const low = buildMetaLeaderboard("world", {
      highestLevel: -999,
      bestStars: { "1": -9, "2": 3, "1.5": 3, nope: 3 },
      playerName: "   ",
      playerAvatar: "dragon",
    }).player;
    const high = buildMetaLeaderboard("world", {
      highestLevel: 999,
      bestStars: { "1": 999, "2": "2", "100": 3, "101": 3, "200": 3, "201": 3, "-1": 3 },
    }).player;

    expect(low).toMatchObject({ name: "Klip", avatar: "cat", totalStars: 0 });
    expect(high.totalStars).toBe(14);
  });

  it("builds the three reference tabs from the same normalized player", () => {
    const snapshots = buildAllMetaLeaderboards(completeProgress(64));

    expect(Object.keys(snapshots)).toEqual(["weekly", "world", "country"]);
    expect(snapshots.weekly.player).toEqual(snapshots.world.player);
    expect(snapshots.country.player).toEqual(snapshots.world.player);
    expect(snapshots.weekly.entries).not.toEqual(snapshots.country.entries);
  });

  it("keeps a replaceable source interface for future official player data", () => {
    const source: MetaLeaderboardSource = {
      id: "official-cache",
      getSnapshot(mode, player) {
        return {
          mode,
          source: this.id,
          entries: [{
            id: "server-player",
            name: "Mia",
            avatar: "fox",
            totalStars: 299,
            isPlayer: false,
            rank: 1,
          }],
          player: { ...player, rank: 2, isPlayer: true },
          totalPlayers: 2,
        };
      },
    };

    const snapshot = buildMetaLeaderboard("country", completeProgress(3), source);
    expect(snapshot).toMatchObject({ mode: "country", source: "official-cache", totalPlayers: 2 });
    expect(snapshot.entries[0]).toMatchObject({ name: "Mia", totalStars: 299 });
    expect(snapshot.player).toMatchObject({ name: "Player", totalStars: 9, rank: 2 });
  });
});
