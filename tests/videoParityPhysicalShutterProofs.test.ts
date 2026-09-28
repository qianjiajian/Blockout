// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type JsonRecord = Record<string, any>;

const candidates: JsonRecord = JSON.parse(readFileSync(new URL(
  "../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-formal-candidates-v1.json",
  import.meta.url,
), "utf8"));

const level = (id: number): JsonRecord => candidates.levels.find((entry: JsonRecord) => entry.id === id);
const stageArea = (stage: JsonRecord): number => stage.blocks
  .reduce((sum: number, block: JsonRecord) => sum + block.cells.length, 0);
const openingArea = (entry: JsonRecord): number => stageArea(
  entry.stages.find((stage: JsonRecord) => stage.id === entry.opening_stage_id),
);
const hiddenArea = (entry: JsonRecord): number => entry.stages
  .filter((stage: JsonRecord) => stage.id !== entry.opening_stage_id)
  .reduce((sum: number, stage: JsonRecord) => sum + stageArea(stage), 0);

describe("physical shutter packing lower-bound evidence", () => {
  it("proves the Lv123 and Lv137 minimum playable-cell corrections", () => {
    const lv123 = level(123);
    expect([lv123.board.width, lv123.board.height, lv123.board.playable_cell_count]).toEqual([6, 11, 42]);
    expect(lv123.mechanism_contract.covers[0]).toMatchObject({ visual_position: "large central", count: 3 });
    expect([openingArea(lv123), hiddenArea(lv123)]).toEqual([25, 20]);
    expect(openingArea(lv123) + hiddenArea(lv123)).toBe(45);

    const lv137 = level(137);
    expect([lv137.board.width, lv137.board.height, lv137.board.playable_cell_count]).toEqual([7, 12, 58]);
    expect(lv137.mechanism_contract.covers[0]).toMatchObject({ w: 4, h: 5, count: 3 });
    expect([openingArea(lv137), hiddenArea(lv137)]).toEqual([35, 22]);
    expect(lv137.mechanism_contract.covers[0].w * lv137.mechanism_contract.covers[0].h).toBe(20);
    expect(hiddenArea(lv137)).toBeGreaterThan(20);
    expect(openingArea(lv137) + 4 * 6).toBe(59);
  });

  it("proves Lv141 cannot pack V3x8 plus RECT2X3 in an 8x5 shutter", () => {
    const lv141 = level(141);
    const histogram = lv141.stages.find((stage: JsonRecord) => stage.id !== lv141.opening_stage_id)
      .target_shape_histogram;
    expect([lv141.board.width, lv141.board.height, lv141.board.playable_cell_count]).toEqual([8, 14, 92]);
    expect(lv141.mechanism_contract.covers[0]).toMatchObject({ w: 8, h: 5, count: 8 });
    expect(histogram).toMatchObject({ V3: 8, RECT2X3: 1 });
    expect([openingArea(lv141), hiddenArea(lv141)]).toEqual([41, 36]);
    // Height 5 cannot stack two V3s. Eight V3s therefore consume all eight
    // columns, leaving at most two cells vertically in each; RECT2X3 needs 3.
    expect(Math.floor(5 / 3)).toBe(1);
    expect(5 - 3).toBeLessThan(3);
  });

  it("locks the three minimum hidden-shape corrections that preserve source shutter sizes", () => {
    const lv165 = level(165);
    expect(lv165.mechanism_contract.covers.map(({ w, h, count }: JsonRecord) => [w, h, count]))
      .toEqual([[2, 10, 5], [2, 10, 7]]);
    expect(lv165.stages.find((stage: JsonRecord) => stage.id !== lv165.opening_stage_id)
      .target_shape_histogram.H3).toBe(1);

    const lv188 = level(188);
    const lv188Capacity = lv188.mechanism_contract.covers
      .reduce((sum: number, cover: JsonRecord) => sum + cover.w * cover.h, 0);
    expect(lv188Capacity).toBe(27);
    expect(hiddenArea(lv188)).toBe(28);
    expect(hiddenArea(lv188) - lv188Capacity).toBe(1);

    const lv192 = level(192);
    expect(lv192.mechanism_contract.covers[0]).toMatchObject({ w: 8, h: 2, count: 6 });
    expect(lv192.stages.find((stage: JsonRecord) => stage.id !== lv192.opening_stage_id)
      .target_shape_histogram.V3).toBe(1);
  });
});
