import { describe, expect, it } from "vitest";
// @ts-expect-error Node types are excluded from the app build.
import { createHash } from "node:crypto";
import { FORMAL_DAILY_300_ENTRIES, FORMAL_DAILY_300_REVISION } from "../src/core/formalDailyChallenge300Data";
import { createFormalDaily300Registry } from "../src/core/dailyChallengeFormal300";
import { mechanismsUsedByDailyLevel } from "../src/core/dailyChallenge";
import { LEVELS } from "../src/core/levels";

const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object" ? Object.fromEntries(Object.entries(value)
    .filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([k, v]) => [k, canonical(v)])) : value;
const sha = (value: unknown): string => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");

describe("admitted production daily300 data integrity", () => {
  it("binds every actually admitted object, with no full-catalog requirement or legacy count", () => {
    expect(sha(FORMAL_DAILY_300_ENTRIES)).toBe(FORMAL_DAILY_300_REVISION);
    const registry = createFormalDaily300Registry(FORMAL_DAILY_300_REVISION, FORMAL_DAILY_300_ENTRIES, {
      sourceLevelExists: (id) => LEVELS.some((level) => level.id === id), mechanismsUsedByLevel: mechanismsUsedByDailyLevel,
    });
    expect(registry.count).toBe(FORMAL_DAILY_300_ENTRIES.length);
    for (const entry of FORMAL_DAILY_300_ENTRIES) {
      expect(sha(entry.level)).toBe(entry.layoutSha256);
      expect(entry.proof.levelSha256).toBe(entry.layoutSha256);
      expect(entry.acceptance.levelSha256).toBe(entry.layoutSha256);
      const a = registry.assignments(entry.stageKey, entry.difficulty).find((a) => a.id === entry.formalId)!;
      expect(a.catalogKind).toBe("formal300");
      expect(registry.resolve(a)?.level).toEqual(entry.level);
    }
  });
});
