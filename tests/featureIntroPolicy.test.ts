import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import { MECHANISM_GUIDE } from "../src/core/mechanismCatalog";
import {
  FEATURE_INTRO_POLICY,
  getScheduledFeatureIntro,
  type FeatureIntroKind,
} from "../src/game/featureIntroPolicy";

const EXPECTED = [
  ["color-exit", 1, false, undefined],
  ["irregular-block", 5, false, undefined],
  ["frozen-exit", 6, true, "ice-door"],
  ["irregular-board", 8, false, undefined],
  ["numeric-ice", 10, true, "ice-block"],
  ["multilayer-shell", 15, true, "layer"],
  ["shutter", 20, true, "shutter"],
  ["generator", 35, true, "generator"],
  ["axis-block", 50, true, "arrow-block"],
  ["key-lock", 60, true, "key-lock"],
  ["layered-lift", 65, true, "lift"],
  ["star", 100, true, "star"],
  ["bomb", 120, true, "bomb"],
  ["flip-door", 150, true, "flip-door"],
  ["colored-grid", 200, true, "colored-grid"],
] as const;

describe("workbook-controlled feature introduction policy", () => {
  it("contains exactly the supplied 15 mechanisms, with 12 enabled and 3 disabled", () => {
    expect(FEATURE_INTRO_POLICY.map(({ id, unlockLevel, showUnlockPopup, kind }) => (
      [id, unlockLevel, showUnlockPopup, kind]
    ))).toEqual(EXPECTED);
    expect(FEATURE_INTRO_POLICY.filter(({ showUnlockPopup }) => showUnlockPopup)).toHaveLength(12);
    expect(FEATURE_INTRO_POLICY.filter(({ showUnlockPopup }) => !showUnlockPopup)).toHaveLength(3);
    expect(new Set(FEATURE_INTRO_POLICY.map(({ id }) => id)).size).toBe(15);
    expect(new Set(FEATURE_INTRO_POLICY.map(({ unlockLevel }) => unlockLevel)).size).toBe(15);
    for (const entry of FEATURE_INTRO_POLICY) {
      if (!entry.showUnlockPopup) expect(entry).not.toHaveProperty("kind");
    }
  });

  it.each(EXPECTED)("schedules %s only at level %i when enabled", (id, levelId, enabled, kind) => {
    const intro = getScheduledFeatureIntro(levelId);
    if (!enabled) {
      expect(intro).toBeUndefined();
      return;
    }
    const guide = MECHANISM_GUIDE.find((entry) => entry.id === id)!;
    expect(intro).toEqual({
      kind,
      mechanismId: id,
      title: guide.title,
      description: guide.effect,
    });
  });

  it("emits exactly 12 introduction nodes across all 200 levels, without catch-up popups", () => {
    const scheduled = Array.from({ length: 200 }, (_, i) => i + 1)
      .filter((levelId) => getScheduledFeatureIntro(levelId) !== undefined);
    expect(scheduled).toEqual([6, 10, 15, 20, 35, 50, 60, 65, 100, 120, 150, 200]);
  });

  it("uses the workbook's level60 key-lock schedule without rewriting guide level59", () => {
    expect(MECHANISM_GUIDE.find(({ id }) => id === "key-lock")!.unlockLevel).toBe(59);
    expect(getScheduledFeatureIntro(59)).toBeUndefined();
    expect(getScheduledFeatureIntro(60)?.kind).toBe("key-lock");
    expect(getScheduledFeatureIntro(61)).toBeUndefined();
  });

  it("preserves existing kind names so existing seen-intro keys can still suppress repeats", () => {
    const oldSeen: FeatureIntroKind[] = [
      "ice-door", "ice-block", "layer", "shutter", "generator", "arrow-block", "key-lock", "lift", "star",
    ];
    const scheduledKinds = FEATURE_INTRO_POLICY.flatMap((entry) => entry.showUnlockPopup ? [entry.kind] : []);
    expect(scheduledKinds.filter((kind) => !oldSeen.includes(kind))).toEqual(["bomb", "flip-door", "colored-grid"]);
  });

  it.each([0, -1, 201, 6.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER])(
    "rejects invalid level ID %s without clamping or rounding", (levelId) => {
      expect(getScheduledFeatureIntro(levelId)).toBeUndefined();
    },
  );

  it("does not mutate campaign objects, feature metadata or guide data", () => {
    const originalLevels = [...LEVELS];
    const serializedLevels = JSON.stringify(LEVELS);
    const serializedGuide = JSON.stringify(MECHANISM_GUIDE);
    for (const level of LEVELS) getScheduledFeatureIntro(level.id);
    const returned = getScheduledFeatureIntro(60)!;
    returned.title = "caller-local change";
    returned.description = "caller-local change";
    expect(getScheduledFeatureIntro(60)?.title).not.toBe(returned.title);
    expect(JSON.stringify(LEVELS)).toBe(serializedLevels);
    expect(JSON.stringify(MECHANISM_GUIDE)).toBe(serializedGuide);
    for (const [i, level] of LEVELS.entries()) expect(level).toBe(originalLevels[i]);
  });
});
