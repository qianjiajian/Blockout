import { describe, expect, it } from "vitest";
import {
  LEVELS,
  LEVELS_BEFORE_LEVEL66_93_97_REPAIR,
  LEVELS_BEFORE_LEVEL72_REPAIR,
} from "../src/core/levels";

const blockById = (level: (typeof LEVELS)[number], id: string) => {
  const block = level.blocks.find((candidate) => candidate.id === id);
  if (!block) throw new Error(`missing ${id}`);
  return block;
};

describe("Level 72 deadlock repair", () => {
  it("applies only the two authorized outer-color changes", () => {
    const before = LEVELS_BEFORE_LEVEL66_93_97_REPAIR.find((level) => level.id === 72)!;
    const after = LEVELS_BEFORE_LEVEL72_REPAIR.find((level) => level.id === 72)!;
    expect(LEVELS.find((level) => level.id === 72)).toBe(after);

    expect(blockById(before, "r147-72-o4").color).toBe("red");
    expect(blockById(after, "r147-72-o4").color).toBe("yellow");
    expect(blockById(before, "r147-72-h2").color).toBe("orange");
    expect(blockById(after, "r147-72-h2").color).toBe("cyan");
    for (const [id, color] of [["r147-72-o4", "yellow"], ["r147-72-h2", "cyan"]] as const) {
      const layers = blockById(after, id).layers;
      if (layers) expect(layers[0]).toBe(color);
    }

    const changed = after.blocks.filter((block, index) => {
      const source = before.blocks[index]!;
      return JSON.stringify(block) !== JSON.stringify(source);
    });
    expect(changed.map((block) => block.id).sort()).toEqual(["r147-72-h2", "r147-72-o4"]);
    expect({ ...after, blocks: undefined }).toEqual({ ...before, blocks: undefined });
  });

  it("does not alter any other final level", () => {
    for (const [index, level] of LEVELS_BEFORE_LEVEL66_93_97_REPAIR.entries()) {
      if (level.id === 72) continue;
      expect(LEVELS_BEFORE_LEVEL72_REPAIR[index]).toBe(level);
      expect(LEVELS[index]).toBe(level);
    }
  });
});
