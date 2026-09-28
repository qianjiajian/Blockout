import { describe, expect, it } from "vitest";
import { LEVELS, getLevel, getLevelStrict } from "../src/core/levels";

describe("200-level production campaign boundary", () => {
  it("publishes one continuous Lv1-Lv200 campaign", () => {
    expect(LEVELS).toHaveLength(200);
    expect(LEVELS.map((level) => level.id)).toEqual(
      Array.from({ length: 200 }, (_, index) => index + 1),
    );
  });

  it("accepts Lv200 and rejects ids beyond the production season", () => {
    expect(getLevelStrict(200).id).toBe(200);
    expect(getLevel(999).id).toBe(200);
    expect(() => getLevelStrict(0)).toThrow(RangeError);
    expect(() => getLevelStrict(201)).toThrow(RangeError);
  });
});
