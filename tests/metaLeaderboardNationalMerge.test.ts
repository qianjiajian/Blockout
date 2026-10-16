import { describe, expect, it } from "vitest";
import { buildMetaLeaderboard, type MetaLeaderboardEntry } from "../src/core/metaLeaderboard";
import { LEADERBOARD_PROVINCES } from "../src/core/rankingProvince";

const DAY_MS = 86_400_000;
const epoch = Date.UTC(2026, 9, 5) - 8 * 3_600_000;
const progress = (stars: number) => ({
  highestLevel: 200,
  bestStars: Object.fromEntries(Array.from({ length: 200 }, (_, index) => [
    String(index + 1), Math.min(3, Math.max(0, stars - index * 3)),
  ])),
  playerId: "merge-test-player",
  playerName: "Player",
  playerAvatar: 12,
  playerFrame: 7,
});
const withoutRank = ({ rank: _rank, ...entry }: MetaLeaderboardEntry) => entry;

describe("national ranking includes eligible provincial identities", () => {
  it.each([0, 1, 30, 400, 36_500])("keeps all 34 provinces consistent after %i days", (days) => {
    const input = { ...progress(46), groupCreatedAtMs: epoch, nowMs: epoch + days * DAY_MS, weeklyStars: 7 };
    // Without an assigned province this is the unchanged national base pool.
    const original = buildMetaLeaderboard("world", input);
    for (const { code } of LEADERBOARD_PROVINCES) {
      const regionalInput = { ...input, province: code };
      const country = buildMetaLeaderboard("country", regionalInput);
      const weekly = buildMetaLeaderboard("weekly", regionalInput);
      const world = buildMetaLeaderboard("world", regionalInput);
      const candidates = new Map([...original.entries, ...country.entries].map((entry) => [entry.id, entry]));
      const selected = new Map(world.entries.map((entry) => [entry.id, entry]));
      const local = new Map(country.entries.map((entry) => [entry.id, entry]));
      const tail = world.entries[world.entries.length - 1];

      expect([195, 196]).toContain(candidates.size);
      expect(world.totalPlayers).toBe(100);
      expect(world.entries).toHaveLength(99);
      expect(selected.size).toBe(99);
      expect(new Set(world.entries.map((entry) => entry.name)).size).toBe(99);
      expect([...world.entries.map((entry) => entry.rank), world.player.rank].sort((a, b) => a - b))
        .toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
      expect(country.player.rank).toBeLessThanOrEqual(world.player.rank);
      expect(withoutRank(country.player)).toEqual(withoutRank(world.player));

      for (const entry of world.entries) {
        const source = candidates.get(entry.id);
        expect(source).toBeDefined();
        expect(withoutRank(entry)).toEqual(withoutRank(source!));
        if (local.has(entry.id)) {
          expect(local.get(entry.id)!.rank).toBeLessThanOrEqual(entry.rank);
        }
      }
      for (const entry of candidates.values()) {
        if (selected.has(entry.id)) continue;
        // An omitted identity must not outrank any selected opponent, including
        // the exact tie order at the final available slot.
        expect(entry.totalStars).toBeLessThanOrEqual(tail.totalStars);
        if (entry.totalStars === tail.totalStars) expect(entry.id > tail.id).toBe(true);
      }
      for (const entry of weekly.entries) {
        const cumulative = local.get(entry.id)!;
        expect(withoutRank(entry)).toEqual({ ...withoutRank(cumulative), totalStars: cumulative.weeklyStars });
      }
      expect(weekly.entries.map((entry) => entry.id).sort()).toEqual([...local.keys()].sort());
    }
  });

  it("shows a strong local-only provincial leader in the national ranking", () => {
    const input = { ...progress(20), province: "44", groupCreatedAtMs: epoch, nowMs: epoch };
    const country = buildMetaLeaderboard("country", input);
    const world = buildMetaLeaderboard("world", input);
    const localLeader = country.entries.find((entry) => entry.id.startsWith("meta-province-44-"))!;
    expect(localLeader.totalStars).toBeGreaterThanOrEqual(37);
    const nationalEntry = world.entries.find((entry) => entry.id === localLeader.id);
    expect(nationalEntry).toBeDefined();
    expect(withoutRank(nationalEntry!)).toEqual(withoutRank(localLeader));
    expect(nationalEntry!.rank).toBeGreaterThanOrEqual(localLeader.rank);
  });

  it("does not use Beijing or other provincial additions until the province is valid", () => {
    const input = { ...progress(46), groupCreatedAtMs: epoch, nowMs: epoch + DAY_MS };
    const original = buildMetaLeaderboard("world", input);
    expect(original.entries.every((entry) => entry.id.startsWith("meta-bot-"))).toBe(true);
    for (const province of [undefined, "", "unknown", "99", "999", "广东省广州市"]) {
      const snapshot = buildMetaLeaderboard("world", { ...input, province });
      expect(snapshot).toEqual(original);
      expect(snapshot.player.province).toBeUndefined();
    }
    const assigned = buildMetaLeaderboard("world", { ...input, province: "11" });
    expect(assigned.player.province).toBe("11");
    expect(assigned.entries.some((entry) => entry.id.startsWith("meta-province-11-"))).toBe(true);
  });

  it("selects the same 99 opponents for every player score and keeps player ties first", () => {
    for (const { code } of LEADERBOARD_PROVINCES) {
      const clock = { province: code, groupCreatedAtMs: epoch, nowMs: epoch + 30 * DAY_MS };
      const low = buildMetaLeaderboard("world", { ...progress(0), ...clock });
      let previousRank = low.player.rank;
      for (const stars of [0, 3, 17, 46, 126, 600]) {
        const input = { ...progress(stars), ...clock };
        const world = buildMetaLeaderboard("world", input);
        const country = buildMetaLeaderboard("country", input);
        expect(world.entries.map(withoutRank)).toEqual(low.entries.map(withoutRank));
        expect(world.player.rank).toBeLessThanOrEqual(previousRank);
        expect(country.player.rank).toBeLessThanOrEqual(world.player.rank);
        previousRank = world.player.rank;
      }
      const tiedStars = low.entries[49].totalStars;
      const tied = buildMetaLeaderboard("world", { ...progress(tiedStars), ...clock });
      expect(tied.player.rank).toBe(1 + tied.entries.filter((entry) => entry.totalStars > tiedStars).length);
      for (const entry of tied.entries.filter((entry) => entry.totalStars === tiedStars)) {
        expect(tied.player.rank).toBeLessThan(entry.rank);
      }
    }
  });

  it("retains the stable cutoff at 600 stars without forcing all provincial ties into 100 rows", () => {
    const input = { ...progress(600), province: "44", groupCreatedAtMs: epoch,
      nowMs: epoch + 36_500 * DAY_MS };
    const country = buildMetaLeaderboard("country", input);
    const world = buildMetaLeaderboard("world", input);
    expect(world.entries).toHaveLength(99);
    expect(world.player.rank).toBe(1);
    expect(world.entries.every((entry) => entry.totalStars === 600)).toBe(true);
    expect(world.entries.map((entry) => entry.id)).toEqual(Array.from({ length: 99 }, (_, index) =>
      `meta-bot-${String(index + 1).padStart(2, "0")}`));
    expect(country.entries.some((entry) => entry.id.startsWith("meta-province-44-"))).toBe(true);
    expect(world.entries.some((entry) => entry.id.startsWith("meta-province-44-"))).toBe(false);
    expect(buildMetaLeaderboard("world", input)).toEqual(world);
  });
});
