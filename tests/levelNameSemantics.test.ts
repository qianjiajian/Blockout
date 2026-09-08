import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";
import type { LevelSpec } from "../src/core/types";

type MechanicRule = {
  label: string;
  pattern: RegExp;
  present: (level: LevelSpec) => boolean;
};

const rules: MechanicRule[] = [
  {
    label: "卷帘",
    pattern: /卷帘|帘/,
    present: (level) => level.shutters?.some((shutter) => shutter.skin !== "generator") ?? false,
  },
  {
    label: "生成器",
    pattern: /生成/,
    present: (level) => level.shutters?.some((shutter) => shutter.skin === "generator") ?? false,
  },
  {
    label: "升降台",
    pattern: /升降/,
    present: (level) => Boolean(level.elevators?.length),
  },
  {
    label: "传送带",
    pattern: /传送/,
    present: (level) => Boolean(level.conveyors?.length),
  },
  {
    label: "星标",
    pattern: /星标/,
    present: (level) => level.blocks.some((block) => block.star) || level.gates.some((gate) => gate.star),
  },
  {
    label: "多层外壳",
    pattern: /外壳|壳后|双色|多层|三层|双层/,
    present: (level) => level.blocks.some((block) => (block.layers?.length ?? 1) > 1),
  },
];

describe("player-facing level-name semantics", () => {
  it.each(rules)("only promises $label when that mechanic exists", ({ pattern, present }) => {
    const mismatches = LEVELS.filter((level) => pattern.test(level.name) && !present(level));
    expect(mismatches.map((level) => `Lv${level.id} ${level.name}`)).toEqual([]);
  });

  it("names every mechanic-introduction stage after the mechanic it teaches", () => {
    const expected = new Map<number, RegExp>([
      [6, /冰块/],
      [7, /冰门/],
      [8, /外壳/],
      [35, /生成/],
      [50, /升降/],
      [70, /传送/],
      [100, /星标/],
    ]);
    expect([...expected].map(([id, pattern]) => ({
      id,
      name: LEVELS[id - 1].name,
      matches: pattern.test(LEVELS[id - 1].name),
    }))).toEqual([...expected].map(([id]) => ({
      id,
      name: LEVELS[id - 1].name,
      matches: true,
    })));
  });
});
