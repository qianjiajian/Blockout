// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  applyCompetitorLateExitStructuralBatchH,
  COMPETITOR_LATE_EXIT_LV122_SOURCE_ADJACENCY_CONFLICTS,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_BLOCKERS,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_CERTIFIED_LEVEL_IDS,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_MOUTH_AUDITS,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_REQUESTED_LEVEL_IDS,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_USES_STAGING_FALLBACK,
  COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_VERSION,
} from "../src/core/competitorLateExitStructuralBatchH";
import type { LevelSpec } from "../src/core/types";

interface TruthLevel {
  readonly level: number;
  readonly board: {
    readonly rows: number | null;
    readonly cols: number | null;
    readonly source_playable_mask: readonly string[] | null;
    readonly source_mask_status: string;
  };
  readonly composition: {
    readonly opening_piece_count: number;
    readonly opening_shape_histogram_status: string;
    readonly source_full_piece_count: number | null;
    readonly visible_piece_anchors: unknown;
  };
  readonly mechanisms: {
    readonly covers: readonly {
      readonly x: number | null;
      readonly y: number | null;
      readonly w: number | null;
      readonly h: number | null;
      readonly hidden_batch_piece_count: number | null;
    }[];
    readonly generators: readonly {
      readonly queue: unknown;
      readonly trigger: unknown;
    }[];
  };
}

const truth = JSON.parse(readFileSync(new URL(
  "../deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
  import.meta.url,
), "utf8")) as { readonly levels: readonly TruthLevel[] };
const truthById = new Map(truth.levels.map((entry) => [entry.level, entry]));
const report = JSON.parse(readFileSync(new URL(
  "../playtest-results/experiments/competitor-late-exit-structural-batch-h-2026-09-21/report.json",
  import.meta.url,
), "utf8")) as {
  readonly schemaVersion: string;
  readonly requestedLevelIds: readonly number[];
  readonly certifiedLevelIds: readonly number[];
  readonly usesStagingFallback: boolean;
  readonly blockers: readonly { readonly levelId: number }[];
};

const fixture: LevelSpec = {
  id: 107,
  name: "batch-h identity fixture",
  difficulty: "normal",
  timeSeconds: 60,
  reward: 1,
  width: 1,
  height: 1,
  gates: [],
  blocks: [],
};

describe("competitor late exit structural batch H", () => {
  it("keeps the seven-level batch evidence-only with no staging fallback", () => {
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_VERSION)
      .toBe("competitor-late-exit-structural-batch-h-r1");
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_REQUESTED_LEVEL_IDS)
      .toEqual([107, 109, 111, 116, 119, 121, 122]);
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_CERTIFIED_LEVEL_IDS).toEqual([]);
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_USES_STAGING_FALLBACK).toBe(false);
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_BLOCKERS.map(({ levelId }) => levelId))
      .toEqual([107, 109, 111, 116, 119, 121, 122]);
    expect(COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_BLOCKERS
      .every(({ evidence, detail }) => evidence.length >= 4 && detail.length > 120)).toBe(true);
    expect(applyCompetitorLateExitStructuralBatchH(fixture)).toBe(fixture);
    expect(report).toMatchObject({
      schemaVersion: COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_VERSION,
      requestedLevelIds: [...COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_REQUESTED_LEVEL_IDS],
      certifiedLevelIds: [],
      usesStagingFallback: false,
    });
    expect(report.blockers.map(({ levelId }) => levelId))
      .toEqual([...COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_REQUESTED_LEVEL_IDS]);
  });

  it("retains the seven Lv116 video-resolved mouths without inventing logical spans", () => {
    const audit = COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_MOUTH_AUDITS
      .find(({ levelId }) => levelId === 116)!;
    expect(audit.mouths.map(({ color, frozen }) => [color, frozen])).toEqual([
      ["red", null],
      ["green", 7],
      ["orange", 6],
      ["cyan", 8],
      ["blue", 4],
      ["purple", 20],
      ["green", 18],
    ]);
    expect(audit.mouths.every(({ offset, size }) => offset === null && size === null)).toBe(true);
    expect(audit.mouths.filter(({ frozen }) => frozen !== null)
      .map(({ firstClearFrameSecond }) => firstClearFrameSecond)).toEqual([515, 515, 520, 510, 590, 590]);
  });

  it("retains the complete Lv122 video-resolved exit colours and spans", () => {
    const audit = COMPETITOR_LATE_EXIT_STRUCTURAL_BATCH_H_MOUTH_AUDITS
      .find(({ levelId }) => levelId === 122)!;
    expect(audit.mouths.map(({ side, color, frozen, offset, size }) => ({
      side, color, frozen, offset, size,
    }))).toEqual([
      { side: "bottom", color: "pink", frozen: null, offset: 1, size: 1 },
      { side: "bottom", color: "blue", frozen: null, offset: 4, size: 1 },
      { side: "top", color: "green", frozen: 15, offset: 2, size: 2 },
      { side: "left", color: "yellow", frozen: 17, offset: 2, size: 1 },
      { side: "left", color: "orange", frozen: 11, offset: 3, size: 2 },
      { side: "right", color: "red", frozen: 17, offset: 2, size: 1 },
      { side: "right", color: "cyan", frozen: 11, offset: 3, size: 2 },
    ]);
  });

  it("records both source-visible Lv122 adjacency conflicts", () => {
    expect(COMPETITOR_LATE_EXIT_LV122_SOURCE_ADJACENCY_CONFLICTS).toEqual([
      {
        color: "green",
        leftDescription: "head H2 at row 2, columns 2-3",
        rightDescription: "head single at row 3, column 3",
        touchingCells: [[3, 2], [3, 3]],
      },
      {
        color: "pink",
        leftDescription: "head single at row 3, column 4",
        rightDescription: "head single at row 4, column 4",
        touchingCells: [[4, 3], [4, 4]],
      },
    ]);
  });

  it("does not promote truth fields that remain source-incomplete", () => {
    for (const id of [107, 109, 111, 119]) {
      const entry = truthById.get(id)!;
      expect(entry.board.rows).toBeNull();
      expect(entry.board.cols).toBeNull();
      expect(entry.composition.source_full_piece_count).toBeNull();
      expect(entry.composition.visible_piece_anchors).toBeNull();
    }
    expect(truthById.get(109)!.mechanisms.covers
      .every(({ x, y, w, h, hidden_batch_piece_count }) => (
        x === null && y === null && w === null && h === null && hidden_batch_piece_count === null
      ))).toBe(true);
    expect(truthById.get(116)!.composition.visible_piece_anchors).toBeNull();
    expect(truthById.get(116)!.mechanisms.generators
      .every(({ queue, trigger }) => queue === "unclear" && trigger === "unclear")).toBe(true);
    expect(truthById.get(121)!.composition.source_full_piece_count).toBeNull();
  });

  it("keeps the Lv122 mask labelled as opening reconstruction, not dynamic topology", () => {
    const entry = truthById.get(122)!;
    expect(entry.board.source_mask_status).toBe("exact_or_reconstructed_from_opening");
    expect(entry.board.source_playable_mask).toEqual([
      "######", "######", "######", "######", "######",
      "..##..", "..##..", ".#..#.", ".#..#.", ".#..#.", ".#..#.",
    ]);
    expect(entry.composition.opening_piece_count).toBe(29);
    expect(entry.composition.opening_shape_histogram_status).toBe("exact");
    expect(entry.composition.visible_piece_anchors).toBeNull();
  });
});
