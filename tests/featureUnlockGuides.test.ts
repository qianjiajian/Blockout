import { describe, expect, it } from "vitest";
import {
  acknowledgeFeatureGuide, GUIDED_FEATURE_IDS, queueFeatureUnlockGuides, sanitizeFeatureGuideProgress,
  type FeatureGuideProgress, type GuidedFeatureId,
} from "../src/core/featureUnlockGuides";
import { FEATURE_UNLOCKS } from "../src/core/featureUnlocks";
import { GAME_LANGUAGES, TRANSLATIONS, translate, type TranslationKey } from "../src/game/localization";

const progress = (highestLevel: number, rewardedLevels: readonly number[] = []) => ({ highestLevel, rewardedLevels });
const empty = (): FeatureGuideProgress => ({ version: 1, pending: [], seen: [] });
const thresholds: Array<[GuidedFeatureId, number]> = [
  ["leaderboard", 6], ["supply", 8], ["levels", 10], ["dailyChallenge", 15], ["league", 20],
];

describe("persisted feature unlock guide queue", () => {
  it("includes exactly the five guided features in unlock order", () => {
    expect(GUIDED_FEATURE_IDS).toEqual(thresholds.map(([id]) => id));
    for (const [id, level] of thresholds) expect(FEATURE_UNLOCKS[id]).toEqual({ completedLevel: level, guide: true });
    expect(Object.isFrozen(GUIDED_FEATURE_IDS)).toBe(true);
  });

  it.each(thresholds)("queues %s only after clearing level %i, not upon reaching it", (id, level) => {
    expect(queueFeatureUnlockGuides(empty(), progress(level - 1), progress(level)).pending).toEqual([]);
    expect(queueFeatureUnlockGuides(empty(), progress(level), progress(level + 1)).pending).toEqual([id]);
    expect(queueFeatureUnlockGuides(empty(), progress(level), progress(level, [level])).pending).toEqual([id]);
    expect(queueFeatureUnlockGuides(empty(), progress(level + 1), progress(level + 1)).pending).toEqual([]);
  });

  it.each(thresholds)("migrates old progress before the new %s clear, preserving that new guide", (id, level) => {
    const state = queueFeatureUnlockGuides(undefined, progress(level), progress(level + 1));
    expect(state.pending).toEqual([id]);
    expect(state.seen).toEqual(thresholds.filter(([, threshold]) => threshold < level).map(([feature]) => feature));
  });

  it.each([
    undefined, null, false, 7, "old", [], {}, { version: 2, pending: [], seen: [] },
    { version: 1, pending: [] }, { version: 1, pending: "league", seen: [] },
    { version: 1, pending: [], seen: null },
  ])("migrates absent or invalid ledgers without replaying old unlocks (%j)", raw => {
    expect(sanitizeFeatureGuideProgress(raw, progress(16))).toEqual({
      version: 1, pending: [], seen: ["leaderboard", "supply", "levels", "dailyChallenge"],
    });
    expect(sanitizeFeatureGuideProgress(raw, progress(1))).toEqual(empty());
    expect(sanitizeFeatureGuideProgress(raw, progress(200)).seen).toEqual(GUIDED_FEATURE_IDS);
  });

  it("honors explicit completed-level records during old-save migration", () => {
    expect(sanitizeFeatureGuideProgress(undefined, progress(1, [20, 6, 15]))).toEqual({
      version: 1, pending: [], seen: ["leaderboard", "dailyChallenge", "league"],
    });
  });

  it("keeps a valid explicit empty ledger empty instead of treating it as an old save", () => {
    expect(sanitizeFeatureGuideProgress(empty(), progress(200))).toEqual(empty());
  });

  it("filters unsupported entries, sorts, deduplicates and gives seen precedence", () => {
    const raw = { version: 1,
      pending: ["league", "dailyTasks", "levels", "supply", "leaderboard", "supply", "achievements", null],
      seen: ["dailyChallenge", "supply", "dailyTasks", "dailyChallenge", 3],
    };
    expect(sanitizeFeatureGuideProgress(raw, progress(21))).toEqual({
      version: 1, pending: ["leaderboard", "levels", "league"], seen: ["supply", "dailyChallenge"],
    });
    expect(sanitizeFeatureGuideProgress(raw, progress(12)).pending).toEqual(["leaderboard", "levels"]);
    expect(sanitizeFeatureGuideProgress(raw, progress(1))).toEqual({
      version: 1, pending: [], seen: ["supply", "dailyChallenge"],
    });
  });

  it("queues multiple genuine crossings in threshold order, preserves old work and never guides tasks or achievements", () => {
    const state = { version: 1 as const, pending: ["leaderboard" as const], seen: [] };
    const result = queueFeatureUnlockGuides(state, progress(7), progress(21));
    expect(result.pending).toEqual(GUIDED_FEATURE_IDS);
    expect(queueFeatureUnlockGuides(empty(), progress(5), progress(6))).toEqual(empty());
    expect(queueFeatureUnlockGuides(result, progress(7), progress(21))).toEqual(result);
  });

  it("does not requeue an acknowledged feature even if imported progress goes backward", () => {
    const state = { version: 1 as const, pending: [], seen: ["league" as const] };
    expect(queueFeatureUnlockGuides(state, progress(20), progress(21))).toEqual(state);
  });

  it("acknowledges only the selected pending item and remains idempotent", () => {
    const state = { version: 1 as const, pending: [...GUIDED_FEATURE_IDS], seen: [] };
    const result = acknowledgeFeatureGuide(state, "levels");
    expect(result).toEqual({
      version: 1, pending: ["leaderboard", "supply", "dailyChallenge", "league"], seen: ["levels"],
    });
    expect(acknowledgeFeatureGuide(result, "levels")).toEqual(result);
    expect(acknowledgeFeatureGuide(empty(), "league")).toEqual(empty());
    expect(acknowledgeFeatureGuide(state, "dailyTasks" as GuidedFeatureId)).toEqual(state);
  });

  it("does not mutate frozen inputs, reward history or share output lists", () => {
    const state: FeatureGuideProgress = { version: 1, pending: ["leaderboard"], seen: [] };
    Object.freeze(state.pending); Object.freeze(state.seen); Object.freeze(state);
    const before = Object.freeze(progress(8, Object.freeze([6])));
    const after = Object.freeze(progress(9, Object.freeze([6, 8])));
    const normalized = sanitizeFeatureGuideProgress(state, before);
    const queued = queueFeatureUnlockGuides(state, before, after);
    const acknowledged = acknowledgeFeatureGuide(state, "leaderboard");
    for (const result of [normalized, queued, acknowledged]) {
      expect(result).not.toBe(state);
      expect(result.pending).not.toBe(state.pending);
      expect(result.seen).not.toBe(state.seen);
    }
    expect(queued.pending).toEqual(["leaderboard", "supply"]);
    queued.pending.length = 0;
    expect(state).toEqual({ version: 1, pending: ["leaderboard"], seen: [] });
    expect(before.rewardedLevels).toEqual([6]);
    expect(after.rewardedLevels).toEqual([6, 8]);
  });
});

describe("feature guide player copy", () => {
  it.each(GAME_LANGUAGES)("provides all guide labels and feature descriptions in %s", language => {
    const keys = ["featureGuide.title", "featureGuide.look", "featureGuide.later", "featureGuide.tap", "featureGuide.saveFailed",
      ...GUIDED_FEATURE_IDS.flatMap(id => [`featureGuide.${id}.name`, `featureGuide.${id}.description`]),
    ] as TranslationKey[];
    for (const key of keys) expect(TRANSLATIONS[language][key]?.trim(), `${language}:${key}`).toBeTruthy();
    expect(translate(language, "featureGuide.tap", { feature: "Fixture Feature" })).toContain("Fixture Feature");
    expect(translate(language, "featureGuide.tap", { feature: "Fixture Feature" })).not.toContain("{feature}");
  });

  it("uses the approved Chinese actions and keeps tasks and achievements out of the guide copy", () => {
    expect(translate("zh-CN", "featureGuide.title")).toBe("新功能解锁");
    expect(translate("zh-CN", "featureGuide.look")).toBe("去看看");
    expect(translate("zh-CN", "featureGuide.later")).toBe("稍后");
    expect(translate("zh-CN", "featureGuide.tap", { feature: "排行" })).toBe("点击这里，进入排行");
    expect(Object.keys(TRANSLATIONS["zh-CN"]).filter(key => key.startsWith("featureGuide."))).toHaveLength(15);
  });
});
