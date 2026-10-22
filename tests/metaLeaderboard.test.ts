import { describe, expect, it } from "vitest";
import {
  buildAllMetaLeaderboards,
  buildMetaLeaderboard,
  META_LEADERBOARD_AVATARS,
  META_LEADERBOARD_MAX_LEVEL,
  META_LEADERBOARD_MAX_STARS,
  META_LEADERBOARD_MODES,
  META_LEADERBOARD_BEIJING_HOUR_MS,
  beijingWeekStartMs,
  type MetaLeaderboardSource,
} from "../src/core/metaLeaderboard";

const completeProgress = (highestLevel: number) => ({
  highestLevel,
  bestStars: Object.fromEntries(Array.from({ length: highestLevel }, (_, index) => [String(index + 1), 3])),
  playerName: "Player",
  playerAvatar: 12,
  playerFrame: 7,
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
    expect(first.player).toMatchObject({ name: "Player", avatar: 12, frame: 7, totalStars: mode === "weekly" ? 0 : 126,
      lifetimeStars: 126, weeklyStars: 0, isPlayer: true });
    expect(first.player.rank).toBe(1);
    expect(new Set(first.entries.map((entry) => entry.id)).size).toBe(99);
    expect(META_LEADERBOARD_AVATARS).toEqual(Array.from({ length: 25 }, (_, index) => index));
    expect(first.entries.every((entry) => META_LEADERBOARD_AVATARS.includes(entry.avatar))).toBe(true);
    expect(new Set(first.entries.map((entry) => entry.avatar)).size).toBe(25);
    expect(first.entries.every((entry) => entry.frame === 0)).toBe(true);
    expect([...first.entries.map((entry) => entry.rank), first.player.rank].sort((a, b) => a - b))
      .toEqual(Array.from({ length: 100 }, (_, index) => index + 1));

    const changedAppearance = buildMetaLeaderboard(mode, { ...completeProgress(42), playerAvatar: 14, playerFrame: 8 });
    expect(changedAppearance.entries).toEqual(first.entries);
    expect(changedAppearance.player).toEqual({ ...first.player, avatar: 14, frame: 8 });
  });

  it("preserves player names and assigns stable profile avatars by identity", () => {
    const snapshot = buildMetaLeaderboard("world", completeProgress(1));

    const byId = new Map(snapshot.entries.map((entry) => [entry.id, entry]));
    expect([1, 2, 3, 4, 5, 6].map((index) => {
      const entry = byId.get(`meta-bot-${String(index).padStart(2, "0")}`)!;
      return { name: entry.name, avatar: entry.avatar, frame: entry.frame };
    })).toEqual([
      { name: "青禾", avatar: 0, frame: 0 },
      { name: "晴川里", avatar: 1, frame: 0 },
      { name: "桃子汽水", avatar: 2, frame: 0 },
      { name: "春风知我意", avatar: 3, frame: 0 },
      { name: "安然", avatar: 4, frame: 0 },
      { name: "风有信", avatar: 5, frame: 0 },
    ]);
  });

  it("localizes every opponent roster from the first device language without changing identity or ranking", () => {
    const epoch = Date.UTC(2026, 9, 5) - 8 * 3_600_000;
    const languages = ["zh-CN", "zh-TW", "en", "ja", "ko", "es", "pt", "fr", "de", "ru"] as const;
    const snapshots = languages.map((opponentLanguage) => buildMetaLeaderboard("world", {
      ...completeProgress(42), opponentLanguage, nowMs: epoch, groupCreatedAtMs: epoch,
    }));
    const reference = snapshots[0];
    const referenceIds = reference.entries.map((entry) => entry.id);
    const referenceProgress = reference.entries.map((entry) => ({ id: entry.id,
      totalStars: entry.totalStars, weeklyStars: entry.weeklyStars, lifetimeStars: entry.lifetimeStars,
      cleared: entry.cleared, rank: entry.rank }));

    for (const snapshot of snapshots) {
      expect(snapshot.entries).toHaveLength(99);
      expect(new Set(snapshot.entries.map((entry) => entry.name)).size).toBe(99);
      expect(snapshot.entries.map((entry) => entry.id)).toEqual(referenceIds);
      expect(snapshot.entries.map((entry) => ({ id: entry.id,
        totalStars: entry.totalStars, weeklyStars: entry.weeklyStars, lifetimeStars: entry.lifetimeStars,
        cleared: entry.cleared, rank: entry.rank }))).toEqual(referenceProgress);
      expect(snapshot.player).toMatchObject({ totalStars: reference.player.totalStars, rank: reference.player.rank });
    }

    // A localized roster is data-driven: switching the device language changes
    // all visible opponent names, while the deterministic identity and scores
    // remain shared across every locale.
    const namesByLanguage = snapshots.map((snapshot) => snapshot.entries.map((entry) => entry.name));
    expect(new Set(namesByLanguage.map((names) => JSON.stringify(names))).size).toBe(languages.length);
    const scriptByLanguage: Partial<Record<typeof languages[number], RegExp>> = {
      en: /[A-Za-z]/, es: /[A-Za-z]/, pt: /[A-Za-z]/, fr: /[A-Za-z]/, de: /[A-Za-z]/,
      ja: /[\u3040-\u30ff\u3400-\u9fff]/, ko: /[\uac00-\ud7af]/, ru: /[\u0400-\u04ff]/,
    };
    languages.forEach((language, index) => {
      const script = scriptByLanguage[language];
      if (script) expect(namesByLanguage[index].every((name) => script.test(name))).toBe(true);
    });
  });

  it("uses the same localized roster for weekly and province tabs", () => {
    const epoch = Date.UTC(2026, 9, 5) - 8 * 3_600_000;
    const input = { ...completeProgress(42), opponentLanguage: "en" as const, province: "44",
      groupCreatedAtMs: epoch, nowMs: epoch + 60 * 3_600_000, weeklyStars: 7 };
    const snapshots = buildAllMetaLeaderboards(input);
    for (const mode of ["weekly", "country"] as const) {
      expect(snapshots[mode].entries).toHaveLength(99);
      expect(new Set(snapshots[mode].entries.map((entry) => entry.name)).size).toBe(99);
      expect(snapshots[mode].entries.every((entry) => /[A-Za-z]/.test(entry.name))).toBe(true);
    }
  });

  it("gives every ranked bot a unique 2-to-5-character Chinese name", () => {
    const snapshot = buildMetaLeaderboard("world", completeProgress(1));
    const names = snapshot.entries.map((entry) => entry.name);
    const chineseLength = (name: string) => (name.match(/[\u3400-\u9fff]/g) ?? []).length;
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((name) => chineseLength(name) >= 2 && chineseLength(name) <= 5)).toBe(true);
    expect([1, 53, 99].map((index) => chineseLength(snapshot.entries.find((entry) => entry.id === `meta-bot-${String(index).padStart(2, "0")}`)!.name))).toEqual([2, 2, 4]);
    expect(names.some((name) => chineseLength(name) === 5)).toBe(true);
  });

  it("clamps hostile save values and sums only valid Lv1-Lv200 stars", () => {
    const low = buildMetaLeaderboard("world", {
      highestLevel: -999,
      bestStars: { "1": -9, "2": 3, "1.5": 3, nope: 3 },
      playerName: "   ",
      playerAvatar: "dragon",
      playerFrame: "8",
    }).player;
    const high = buildMetaLeaderboard("world", {
      highestLevel: 999,
      bestStars: { "1": 999, "2": "2", "100": 3, "101": 3, "200": 3, "201": 3, "-1": 3 },
      playerAvatar: 999,
      playerFrame: 99,
    }).player;

    expect(low).toMatchObject({ name: "Klip", avatar: 0, frame: 0, totalStars: 0 });
    expect(high).toMatchObject({ avatar: 24, frame: 18 });
    expect(high.totalStars).toBe(14);
    for (const invalid of [undefined, null, "panda", "4", NaN, Infinity, -7]) {
      expect(buildMetaLeaderboard("world", { highestLevel: 1, playerAvatar: invalid, playerFrame: invalid }).player)
        .toMatchObject({ avatar: 0, frame: 0 });
    }
    expect(buildMetaLeaderboard("world", { highestLevel: 1, playerAvatar: 6.9, playerFrame: 3.9 }).player)
      .toMatchObject({ avatar: 6, frame: 3 });
  });

  it("builds the three reference tabs from the same normalized player", () => {
    const snapshots = buildAllMetaLeaderboards(completeProgress(64));

    expect(Object.keys(snapshots)).toEqual(["weekly", "world", "country"]);
    expect(snapshots.weekly.player).toEqual({ ...snapshots.world.player, province: "11", totalStars: 0 });
    expect(snapshots.country.player).toEqual({ ...snapshots.world.player, province: "11" });
    expect(snapshots.world.player.province).toBeUndefined();
    expect(snapshots.weekly.entries).not.toEqual(snapshots.country.entries);
  });

  it("starts bots in low-star bands and advances them on Beijing-hour boundaries only", () => {
    const epoch = Date.UTC(2026, 0, 1, 0, 0, 0) - 8 * 3_600_000;
    const atStart = buildMetaLeaderboard("world", { ...completeProgress(1), nowMs: epoch, groupCreatedAtMs: epoch });
    const beforeHour = buildMetaLeaderboard("world", {
      ...completeProgress(1), nowMs: epoch + META_LEADERBOARD_BEIJING_HOUR_MS - 1, groupCreatedAtMs: epoch,
    });
    const afterDays = buildMetaLeaderboard("world", {
      ...completeProgress(1), nowMs: epoch + 24 * META_LEADERBOARD_BEIJING_HOUR_MS, groupCreatedAtMs: epoch,
    });
    expect(beforeHour.entries).toEqual(atStart.entries);
    expect(atStart.entries.map((entry) => entry.totalStars).every((stars) => stars >= 0)).toBe(true);
    expect(atStart.entries.filter((entry) => entry.totalStars <= 9)).toHaveLength(20);
    expect(atStart.entries.filter((entry) => entry.totalStars >= 10 && entry.totalStars <= 21)).toHaveLength(30);
    expect(atStart.entries.filter((entry) => entry.totalStars >= 22 && entry.totalStars <= 36)).toHaveLength(35);
    expect(atStart.entries.filter((entry) => entry.totalStars >= 37 && entry.totalStars <= 48)).toHaveLength(14);
    expect(afterDays.entries.some((entry) => entry.totalStars !== atStart.entries.find((old) => old.id === entry.id)!.totalStars)).toBe(true);
  });

  it("keeps bot identity and progress independent of the player's stars", () => {
    const epoch = Date.UTC(2026, 0, 1, 0, 0, 0) - 8 * 3_600_000;
    const low = buildMetaLeaderboard("world", {
      ...completeProgress(1), bestStars: { "1": 0 }, nowMs: epoch + 72 * 3_600_000, groupCreatedAtMs: epoch,
    });
    const high = buildMetaLeaderboard("world", {
      ...completeProgress(200), nowMs: epoch + 72 * 3_600_000, groupCreatedAtMs: epoch,
    });
    const bots = (snapshot: typeof low) => snapshot.entries.map(({ rank: _rank, ...entry }) => entry);
    expect(bots(low)).toEqual(bots(high));
    expect(low.player.totalStars).not.toBe(high.player.totalStars);
    expect(low.player.rank).not.toBe(high.player.rank);
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
            avatar: 3,
            frame: 4,
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
    expect(snapshot.entries[0]).toMatchObject({ name: "Mia", avatar: 3, frame: 4, totalStars: 299 });
    expect(snapshot.player).toMatchObject({ name: "Player", avatar: 12, frame: 7, totalStars: 9, rank: 2 });
  });

  it("reuses identical opponents between national, province, and weekly snapshots", () => {
    const epoch = Date.UTC(2026, 9, 5) - 8 * 3_600_000;
    const snapshots = buildAllMetaLeaderboards({ ...completeProgress(42), province: "44",
      groupCreatedAtMs: epoch, nowMs: epoch + 60 * 3_600_000, weeklyStars: 7 });
    const provincial = new Map(snapshots.country.entries.map((entry) => [entry.id, entry]));
    const overlapping = snapshots.world.entries.filter((entry) => entry.province === "44");
    expect(overlapping.some((entry) => entry.id.startsWith("meta-province-44-"))).toBe(true);
    for (const entry of overlapping) {
      expect(provincial.get(entry.id)).toEqual({ ...entry, rank: provincial.get(entry.id)!.rank });
    }
    for (const entry of snapshots.weekly.entries) {
      const original = provincial.get(entry.id)!;
      expect(entry).toEqual({ ...original, totalStars: original.weeklyStars, rank: entry.rank });
    }
    expect(snapshots.weekly.player.totalStars).toBe(7);
    expect(snapshots.world.player.totalStars).toBe(126);
    expect(snapshots.country.entries.every((entry) => entry.province === "44")).toBe(true);
    expect(new Set(snapshots.country.entries.map((entry) => entry.name)).size).toBe(99);
  });

  it("keeps all 34 province rosters complete, low-star, and independent of player scores", async () => {
    const { LEADERBOARD_PROVINCES } = await import("../src/core/rankingProvince");
    const epoch = Date.UTC(2026, 9, 5) - 8 * 3_600_000;
    const nationalByName = new Map(buildMetaLeaderboard("world", { ...completeProgress(1), nowMs: epoch, groupCreatedAtMs: epoch })
      .entries.map((entry) => [entry.name, entry.id]));
    for (const { code } of LEADERBOARD_PROVINCES) {
      const snapshot = buildMetaLeaderboard("country", { ...completeProgress(1), province: code,
        nowMs: epoch, groupCreatedAtMs: epoch });
      expect(snapshot.entries).toHaveLength(99);
      expect(new Set(snapshot.entries.map((entry) => entry.name)).size).toBe(99);
      expect(new Set(snapshot.entries.map((entry) => entry.id)).size).toBe(99);
      expect(snapshot.entries.every((entry) => entry.name.length >= 2 && entry.name.length <= 5)).toBe(true);
      for (const entry of snapshot.entries) if (nationalByName.has(entry.name)) expect(entry.id).toBe(nationalByName.get(entry.name));
      expect(snapshot.entries.filter((entry) => entry.totalStars <= 9)).toHaveLength(40);
      expect(snapshot.entries.filter((entry) => entry.totalStars >= 10 && entry.totalStars <= 21)).toHaveLength(35);
      expect(snapshot.entries.filter((entry) => entry.totalStars >= 22 && entry.totalStars <= 36)).toHaveLength(20);
      expect(snapshot.entries.filter((entry) => entry.totalStars >= 37 && entry.totalStars <= 48)).toHaveLength(4);
    }
  });

  it("keeps localized province rosters unique for every supported device language", async () => {
    const { LEADERBOARD_PROVINCES } = await import("../src/core/rankingProvince");
    const epoch = Date.UTC(2026, 9, 5) - 8 * 3_600_000;
    const languages = ["zh-CN", "zh-TW", "en", "ja", "ko", "es", "pt", "fr", "de", "ru"] as const;
    for (const opponentLanguage of languages) {
      for (const { code } of LEADERBOARD_PROVINCES) {
        const snapshot = buildMetaLeaderboard("country", { ...completeProgress(1), province: code,
          opponentLanguage, nowMs: epoch, groupCreatedAtMs: epoch });
        expect(new Set(snapshot.entries.map((entry) => entry.name)).size).toBe(99);
      }
    }
  });

  it("resets only weekly points at Monday midnight and supports a fair migration baseline", () => {
    const epoch = Date.UTC(2026, 8, 21) - 8 * 3_600_000;
    const monday = epoch + 21 * 24 * 3_600_000;
    expect(beijingWeekStartMs(monday - 1)).toBe(monday - 7 * 24 * 3_600_000);
    expect(beijingWeekStartMs(monday)).toBe(monday);
    const input = { ...completeProgress(60), province: "11", groupCreatedAtMs: epoch };
    const before = buildMetaLeaderboard("weekly", { ...input, nowMs: monday - 1 });
    const after = buildMetaLeaderboard("weekly", { ...input, nowMs: monday });
    expect(before.entries.some((entry) => entry.totalStars > 0)).toBe(true);
    expect(after.entries.every((entry) => entry.totalStars === 0)).toBe(true);
    for (const entry of after.entries) expect(entry.lifetimeStars).toBe(before.entries.find((old) => old.id === entry.id)!.lifetimeStars);
    const migrated = buildMetaLeaderboard("weekly", { ...input, nowMs: monday + 36 * 3_600_000,
      weekBaselineMs: monday + 36 * 3_600_000 });
    expect(migrated.entries.every((entry) => entry.totalStars === 0)).toBe(true);
    const later = buildMetaLeaderboard("weekly", { ...input, nowMs: monday + 60 * 3_600_000,
      weekBaselineMs: monday + 36 * 3_600_000 });
    expect(later.entries.some((entry) => entry.totalStars > 0)).toBe(true);
    for (const entry of later.entries) expect(entry.totalStars).toBe(entry.lifetimeStars! - migrated.entries.find((old) => old.id === entry.id)!.lifetimeStars!);
  });

  it("bounds centuries of progress at 200 clears and 600 stars without inventing weekly growth", () => {
    const epoch = Date.UTC(2026, 0, 1);
    const all = buildAllMetaLeaderboards({ ...completeProgress(200), province: "31", groupCreatedAtMs: epoch,
      nowMs: epoch + 100 * 365 * 24 * 3_600_000 });
    for (const snapshot of Object.values(all)) {
      expect(snapshot.entries.every((entry) => entry.cleared === 200 && entry.lifetimeStars === 600 && entry.weeklyStars === 0)).toBe(true);
      expect(snapshot.player.rank).toBe(1);
    }
  });
});
