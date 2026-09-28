// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PuzzleModel, validateLevel } from "../src/core/PuzzleModel";
import { solveLevelForValidation } from "../src/core/levelSolver";
import { VIDEO_PARITY_LEVELS_101_TO_200 } from "../src/core/videoParityLevels101To200.generated";

type JsonRecord = Record<string, any>;
const readJson = (path: string): JsonRecord => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const candidate = readJson("deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-formal-candidates-v1.json");
const audit = readJson("deliverables/level-generation-blueprint/blockout-lv101-lv200-runtime-projection-v1-audit.json");
const lv105Stage2Manifest = readJson("playtest-results/experiments/recolor-exit-block-repair-lv103-109/stage2-patch-manifest.json");
const lv105IndependentVerification = readJson("playtest-results/experiments/recolor-exit-block-repair-lv103-109/stage2-lv105-manifest-verification.json");
const lv117RepairManifest = readJson("playtest-results/experiments/recolor-exit-geometry-repair-lv113-123/patch-manifest.json");
const lv117RepairEvidence = readJson("playtest-results/experiments/recolor-exit-geometry-repair-lv113-123/lv117-candidate.json");
const lv124RepairManifest = readJson("playtest-results/experiments/recolor-exit-geometry-repair-lv124-133/patch-manifest.json");
const lv124RepairReport = readJson("playtest-results/experiments/recolor-exit-geometry-repair-lv124-133/final-report.json");
const lv124RepairEvidence = readJson("playtest-results/experiments/recolor-exit-geometry-repair-lv124-133/lv124-candidate.json");
const highExitRepairManifest = readJson("playtest-results/experiments/high-exit-reduction-lv101-134-r1/patch-manifest.json");
const highExitRepairReport = readJson("playtest-results/experiments/high-exit-reduction-lv101-134-r1/final-report.json");
const overlapRepairManifest = readJson("playtest-results/experiments/overlap-high-exit-repair-lv128-193-r1/patch-manifest.json");
const overlapRepairReport = readJson("playtest-results/experiments/overlap-high-exit-repair-lv128-193-r1/final-report.json");
const lv107RepairEvidence = readJson("playtest-results/experiments/unique-exit-repair/lv107-minimal-geometry-colour-r1.json");
const apertureRepairManifest = readJson("playtest-results/experiments/aperture-duplicate-cluster-lv103-lv116-r1/patch-manifest.json");
const apertureRepairReport = readJson("playtest-results/experiments/aperture-duplicate-cluster-lv103-lv116-r1/final-report.json");
const lv103ApertureEvidence = readJson("playtest-results/experiments/aperture-duplicate-cluster-lv103-lv116-r1/lv103-shutter20-to15-progressive-gates-a-20000.json");
const lv116ApertureEvidence = readJson("playtest-results/experiments/aperture-duplicate-cluster-lv103-lv116-r1/lv116-manual-progressive-gates-a-20000.json");
const physicalShutterRecertification = readJson("playtest-results/experiments/physical-shutter-runtime-recertification-2026-09-20/manifest.json");
const physicalShutterRecertificationById = new Map<number, JsonRecord>(physicalShutterRecertification.levels.map(
  (record: JsonRecord) => [record.level_id, record] as [number, JsonRecord],
));
const physicalShutterRecertificationEvidencePath = "playtest-results/experiments/physical-shutter-runtime-recertification-2026-09-20/manifest.json";
const physicalShutterRecertificationEvidenceSha256 = "95FF4D6C00E448714FF4AD17333DB30C61C8CFF8C3C71B5FBF5E83BFD528CFBA";
const candidateById = new Map<number, JsonRecord>(candidate.levels.map(
  (level: JsonRecord) => [level.id, level] as [number, JsonRecord],
));
const auditById = new Map<number, JsonRecord>(audit.levels.map(
  (level: JsonRecord) => [Number(level.level_id.slice(2)), level] as [number, JsonRecord],
));
const runtimeRepairById = new Map<number, JsonRecord>((audit.solver_verified_runtime_repairs ?? []).map(
  (repair: JsonRecord) => [Number(repair.level_id.slice(2)), repair] as [number, JsonRecord],
));
const solverRepairLevelIds = [103, 105, 106, 107, 108, 112, 114, 115, 116, 117, 124, 127, 130, 150, 152, 156, 158, 187, 193];
const positiveInteger = (value: unknown): value is number => Number.isInteger(value) && Number(value) > 0;
const sortedNumbers = (values: number[]): number[] => [...values].sort((left, right) => left - right);
const sortedPoints = (values: Array<readonly [number, number]>): Array<readonly [number, number]> => [...values]
  .sort(([leftX, leftY], [rightX, rightY]) => leftY - rightY || leftX - rightX);
const blockShapeKey = (shape: readonly (readonly [number, number])[]): string => [...shape]
  .map(([x, y]) => `${x},${y}`).sort().join(";");
const shapeHistogram = (blocks: Array<{ shape: readonly (readonly [number, number])[] }>): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const block of blocks) {
    const key = blockShapeKey(block.shape);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
};
const physicalShapeKeyById: Record<string, string> = {
  H3: "0,0;1,0;2,0",
  V3: "0,0;0,1;0,2",
  SINGLE: "0,0",
};
const exitRecords = (level: JsonRecord): JsonRecord[] => {
  const exits = level.mechanism_contract.directional_exits ?? {};
  return ["ordinary", "frozen", "star"].flatMap((kind) => Array.isArray(exits[kind]) ? exits[kind] : []);
};
const frozenValue = (record: JsonRecord): number | null => [
  record.frozen_value, record.value, record.frozen?.value, record.frozen,
].find(positiveInteger) ?? null;
const expectPatchedFields = (value: JsonRecord, target: JsonRecord): void => {
  for (const [field, expected] of Object.entries(target)) {
    if (expected === null) expect(value[field], `${field} must be deleted`).toBeUndefined();
    else expect(value[field], field).toEqual(expected);
  }
};
const expectPhysicalShutterRecertification = (repair: JsonRecord, levelId: number): JsonRecord => {
  const record = physicalShutterRecertificationById.get(levelId)!;
  expect(record, `Lv${levelId} recertification record`).toBeTruthy();
  expect(repair).toMatchObject({
    candidate_id: record.candidate_id,
    source_semantic_sha256: record.source_semantic_sha256,
    target_semantic_sha256: record.repair_target_semantic_sha256,
    generated_source_semantic_sha256: record.source_semantic_sha256,
    generated_target_semantic_sha256: record.repair_target_semantic_sha256,
    evidence: physicalShutterRecertificationEvidencePath,
    evidence_sha256: physicalShutterRecertificationEvidenceSha256,
    verification: {
      max_states: record.solver.max_states,
      explored_states: record.solver.explored_states,
      minimum_drags: record.solver.minimum_drags,
      clear_load: record.solver.clear_load,
      reposition_overhead: record.solver.reposition_overhead,
      grid_steps: record.solver.grid_steps,
      turns: record.solver.turns,
    },
    puzzle_model_replay: {
      attempted: true,
      complete: true,
      finalMoves: record.solver.minimum_drags,
      remainingBlocks: 0,
      remainingQueuedBlocks: 0,
    },
    physical_shutter_recertification: {
      manifest: physicalShutterRecertificationEvidencePath,
      manifest_sha256: physicalShutterRecertificationEvidenceSha256,
      final_level_semantic_sha256: record.final_level_semantic_sha256,
    },
  });
  expect(repair.route).toEqual(record.solver.route);
  return record;
};

describe("Lv101-Lv200 runtime structural projection", () => {
  it("is a deterministic contiguous 100-level independent export", () => {
    expect(VIDEO_PARITY_LEVELS_101_TO_200.map((level) => level.id)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 101),
    );
    expect(audit.solver_run).toBe(false);
    expect(audit.summary.level_count).toBe(100);
    expect(audit.summary.source_missing_level_ids).toEqual(["Lv190", "Lv191"]);
    expect(audit.summary.solver_verified_runtime_repair_level_ids).toEqual(
      solverRepairLevelIds.map((levelId) => `Lv${levelId}`),
    );
  });

  it("passes the production LevelSpec validator for every level", () => {
    for (const level of VIDEO_PARITY_LEVELS_101_TO_200) {
      expect(() => validateLevel(level), `Lv${level.id}`).not.toThrow();
    }
  });

  it("binds every physical-shutter repair drift to fresh solver and PuzzleModel evidence", () => {
    expect(physicalShutterRecertification).toMatchObject({
      schema_version: "blockout-physical-shutter-runtime-recertification-v1",
      contract: {
        solver: "solveLevelForValidation",
        initial_max_states: 20_000,
        replay: "PuzzleModel authoritative transaction replay",
        normal_builder_sha_gates_bypassed: false,
        evidence_refresh_input_was_explicit: true,
        preserves_formal_physical_shutter_footprints_and_cohorts: true,
      },
      recertified_level_ids: [103, 105, 106, 112, 114, 115, 116, 117, 127, 130, 152, 156, 158],
      level_count: 13,
    });
    for (const levelId of physicalShutterRecertification.recertified_level_ids) {
      const repair = runtimeRepairById.get(levelId)!;
      const record = expectPhysicalShutterRecertification(repair, levelId);
      expect(record).toMatchObject({
        solver: {
          max_states: 20_000,
          termination: "solved",
          solved: true,
          static_unsat_reasons: [],
          unsupported_reasons: [],
        },
        puzzle_model_replay: {
          complete: true,
          replayed_drags: record.solver.minimum_drags,
          final_moves: record.solver.minimum_drags,
          remaining_blocks: 0,
          queued_blocks: 0,
        },
      });
    }
  });

  it("binds Lv103/Lv116 to the SHA-locked aperture, colour and replay certificates", () => {
    expect(apertureRepairManifest).toMatchObject({
      mode: "experiment-only; no formal source modified",
      opening_visibility_semantics: "exclude generator queue and positive-count block.shutterId payload; retain shutter.triggerBlockIds",
      constraints: {
        unique_gate_and_flip_door_colors: true,
        maximum_opening_same_color_component_size: 2,
        preserve_board_block_shapes_count_positions_mechanism_entities_and_all_frozen_numbers: true,
        require_distinct_colors_inside_each_two_layer_block: true,
      },
    });
    expect(apertureRepairManifest.candidates.map((record: JsonRecord) => record.level_id)).toEqual([103, 116]);
    expect(apertureRepairReport.candidates).toEqual(apertureRepairManifest.candidates);

    const expected = {
      103: {
        evidence: lv103ApertureEvidence,
        candidate: "lv103-shutter20-to15-progressive-gates-a",
        source: "5CA0A164FDB2C9AB34807690386093DD3E2790A2632513AD8D83E51B84924F5B",
        target: "FC36C2DF7851C2FDC8BB4423C8F280219DD0F2940A265D4EF1E08CDC13369C01",
        evidenceSha: "4CC5DADB37390194DFC2E08B51075B747986DD908626A2B9201DF5C692AD1559",
        states: 26, drags: 20, clearLoad: 19, overhead: 1, steps: 78, turns: 10,
      },
      116: {
        evidence: lv116ApertureEvidence,
        candidate: "lv116-manual-progressive-gates-a",
        source: "AD1702A023807D4AE6F6745B30E99064E362AF75738F218F106D9A242B597A7A",
        target: "19BD93527313CCA18E7024DD3C6A5B8C59B98D0C7162A31EDB10C0D966F26162",
        evidenceSha: "C88A742C92E5355D90608736C06DB26015B71A57F12B6D3C7721D4EB72730755",
        states: 24, drags: 23, clearLoad: 22, overhead: 1, steps: 110, turns: 19,
      },
    } as const;

    for (const levelId of [103, 116] as const) {
      const level = VIDEO_PARITY_LEVELS_101_TO_200.find((entry) => entry.id === levelId)!;
      const repair = runtimeRepairById.get(levelId)!;
      const contract = expected[levelId];
      expect(contract.evidence).toMatchObject({
        level_id: levelId,
        candidate_id: contract.candidate,
        source_semantic_sha256: contract.source,
        target_semantic_sha256: contract.target,
        validation: "pass",
        unique_exit_colors_pass: true,
        opening_same_color_component_max: 2,
        two_layer_colors_distinct: true,
        static_unsat_reasons: [],
        unsupported_reasons: [],
        solver: {
          max_states: 20_000, termination: "solved", solved: true,
          explored_states: contract.states, minimum_drags: contract.drags,
          clear_load: contract.clearLoad, reposition_overhead: contract.overhead,
          grid_steps: contract.steps, turns: contract.turns,
        },
        replay: {
          attempted: true, complete: true, final_moves: contract.drags,
          remaining_blocks: 0, remaining_queued_blocks: 0,
        },
      });
      expectPhysicalShutterRecertification(repair, levelId);
      expect(repair).toMatchObject({
        maximum_opening_same_color_component_size: 2,
        integration_manifest: {
          path: "playtest-results/experiments/aperture-duplicate-cluster-lv103-lv116-r1/patch-manifest.json",
          sha256: "E48898871B5587EF89898627E5A53280F436B6400AD67F1E104BC0B5CCC7E938",
          report: {
            path: "playtest-results/experiments/aperture-duplicate-cluster-lv103-lv116-r1/final-report.json",
            sha256: "0FFC8FA5384B77A32EEB471777F4BED0F0A551D8D59624722B9850DDE1248B43",
          },
        },
        legacy_evidence: {
          evidence_sha256: contract.evidenceSha,
          verification: {
            explored_states: contract.states,
            minimum_drags: contract.drags,
            clear_load: contract.clearLoad,
            reposition_overhead: contract.overhead,
            grid_steps: contract.steps,
            turns: contract.turns,
          },
        },
      });
      expect(Object.values(repair.preservation_contract)).toEqual(Array(8).fill(true));
      expect(repair.legacy_evidence.route).toEqual(contract.evidence.solver.route);
      expect(new Set([...level.gates, ...(level.flipDoors ?? [])].map(({ color }) => color)).size)
        .toBe([...level.gates, ...(level.flipDoors ?? [])].length);
    }

    const level103 = VIDEO_PARITY_LEVELS_101_TO_200.find((entry) => entry.id === 103)!;
    const repair103 = runtimeRepairById.get(103)!;
    expect(level103.shutters?.find(({ id }) => id === "lv103-cover-02")?.count).toBe(15);
    expect(repair103.shutter_updates).toEqual({
      "lv103-cover-02": { source: { count: 20 }, target: { count: 15 } },
    });
    expect(repair103.minimal_counter_relaxation).toMatchObject({
      entity_id: "lv103-cover-02", field: "count", source_value: 20, target_value: 15,
      changed_counter_count: 1, absolute_delta: 5, mathematical_upper_bound_before_unlock: 15,
    });
    expect(repair103.minimal_counter_relaxation.proof).toContain("at most 15 counter decrements");
  });

  it("binds Lv107 to the minimal four-position/four-colour solver certificate", () => {
    const level = VIDEO_PARITY_LEVELS_101_TO_200.find((entry) => entry.id === 107)!;
    const repair = runtimeRepairById.get(107)!;
    expect(lv107RepairEvidence).toMatchObject({
      schema: "blockout-lv107-minimal-geometry-colour-repair-r1",
      formal_level_data_modified: false,
      candidate_id: "lv107-minimal-four-position-four-colour-aperture-repair",
      source_semantic_sha256: "2D1A4E3BA2936C290D5E338CFABB179DB0E546DD26B3EBAC076697466518D9D8",
      candidate_sha256: "F75E66E60CBB97A0F9E2D7249D7CBFE6BA87AAF25F509C92A3A5C198CF559669",
      opening_same_color_component_max: 2,
      solver: {
        max_states: 120_000, order_variant: "original", termination: "solved", solved: true,
        explored_states: 46, minimum_drags: 22, clear_load: 18, reposition_overhead: 4,
        grid_steps: 65, turns: 7, static_unsat_reasons: [], unsupported_reasons: [],
      },
      replay: { ok: true, complete: true, moves: 22, remaining: 0, remaining_queued: 0 },
    });
    expect(repair).toMatchObject({
      candidate_id: lv107RepairEvidence.candidate_id,
      source_semantic_sha256: lv107RepairEvidence.source_semantic_sha256,
      target_semantic_sha256: lv107RepairEvidence.candidate_sha256,
      generated_source_semantic_sha256: lv107RepairEvidence.source_semantic_sha256,
      generated_target_semantic_sha256: lv107RepairEvidence.candidate_sha256,
      evidence_sha256: "DACBDA97F95358B44CFDA6B4CDF3397CDD762794E43121721E70846E38B944F5",
      verification: {
        max_states: 120_000, explored_states: 46, minimum_drags: 22, clear_load: 18,
        reposition_overhead: 4, grid_steps: 65, turns: 7,
      },
      puzzle_model_replay: {
        attempted: true, complete: true, finalMoves: 22, remainingBlocks: 0, remainingQueuedBlocks: 0,
      },
      maximum_opening_same_color_component_size: 2,
    });
    expect(Object.values(repair.preservation_contract)).toEqual(Array(8).fill(true));
    expect(repair.route).toEqual(lv107RepairEvidence.drags);
    expect(level.gates.map(({ color }) => color)).toEqual(["pink", "cyan", "yellow", "purple", "orange", "green"]);
    expect(level.gates.map(({ frozen }) => frozen ?? null)).toEqual([null, 3, 4, 12, 9, 8]);
    expect(level.shutters).toEqual([expect.objectContaining({ x: 0, y: 0, width: 2, height: 2, count: 7 })]);
  });

  it("binds Lv108/Lv112 to the SHA-locked eight-exit solver and replay certificates", () => {
    expect(highExitRepairManifest.scope).toEqual([101, 108, 111, 112, 134]);
    expect(highExitRepairManifest.accepted_candidates.map((entry: JsonRecord) => entry.level_id)).toEqual([108, 112]);
    expect(highExitRepairManifest.not_accepted.map((entry: JsonRecord) => entry.level_id)).toEqual([101, 111, 134]);
    expect(highExitRepairReport.summary).toMatchObject({
      accepted_for_formal_integration: [108, 112],
      exact_exhaustion_no_solution: [101],
      inconclusive_max_states: [111],
      static_contract_blocked: [134],
    });

    const expected = {
      108: {
        source: "F1AE54E02706BE2F638496B3C46421C0DF30747DA0E1BFF22AC015154E84590B",
        target: "B9A18B2D93FBDB6DCEE849CA083A1F3AD3E2E3BE330AD353FF66ED684404A219",
        evidence: "7373C632272E741487B313E40556B2D611E01718B9AC6BECA5AE80160134A760",
        states: 569, clearLoad: 15, overhead: 5, gridSteps: 87, turns: 19,
      },
      112: {
        source: "3BDE26D07BA762C0A49947BAA37C612C76381BDC995E9EF975BF9933F5124DEC",
        target: "1DAFF6FB1611A549C2BAA9CE2FE18DD1E32B1796ACE4DE02D37E37DBDE0EE0A4",
        evidence: "ACA37A2C872186BBD82C3C7F5F1818139AEB41398B2CFE0D6112C8B7DBDACCFE",
        states: 35, clearLoad: 18, overhead: 2, gridSteps: 79, turns: 6,
      },
    } as const;
    for (const levelId of [108, 112] as const) {
      const level = VIDEO_PARITY_LEVELS_101_TO_200.find((entry) => entry.id === levelId)!;
      const repair = runtimeRepairById.get(levelId)!;
      const manifestRecord = highExitRepairManifest.accepted_candidates.find(
        (entry: JsonRecord) => entry.level_id === levelId,
      )!;
      if (physicalShutterRecertificationById.has(levelId)) {
        expectPhysicalShutterRecertification(repair, levelId);
        expect(repair.legacy_evidence).toMatchObject({
          evidence_sha256: expected[levelId].evidence,
          verification: {
            explored_states: expected[levelId].states,
            minimum_drags: 20,
            clear_load: expected[levelId].clearLoad,
            reposition_overhead: expected[levelId].overhead,
            grid_steps: expected[levelId].gridSteps,
            turns: expected[levelId].turns,
          },
          route: manifestRecord.solver.route,
        });
      } else {
        expect(repair).toMatchObject({
          candidate_id: `lv${levelId}-high-exit-reduction-to-eight`,
          source_semantic_sha256: expected[levelId].source,
          target_semantic_sha256: expected[levelId].target,
          generated_source_semantic_sha256: expected[levelId].source,
          generated_target_semantic_sha256: expected[levelId].target,
          evidence_sha256: expected[levelId].evidence,
          verification: {
            max_states: 2_000,
            explored_states: expected[levelId].states,
            minimum_drags: 20,
            clear_load: expected[levelId].clearLoad,
            reposition_overhead: expected[levelId].overhead,
            grid_steps: expected[levelId].gridSteps,
            turns: expected[levelId].turns,
          },
          puzzle_model_replay: {
            attempted: true, complete: true, finalMoves: 20, remainingBlocks: 0, remainingQueuedBlocks: 0,
          },
        });
        expect(repair.route).toEqual(manifestRecord.solver.route);
      }
      expect(repair).toMatchObject({
        candidate_id: `lv${levelId}-high-exit-reduction-to-eight`,
        source_exit_count: manifestRecord.source_exit_count,
        target_exit_count: 8,
        maximum_opening_same_color_component_size: 2,
      });
      expect(Object.values(repair.preservation_contract)).toEqual(Array(8).fill(true));
      const exits = [...level.gates, ...(level.flipDoors ?? [])];
      expect(exits).toHaveLength(8);
      expect(new Set(exits.map((exit) => exit.color)).size).toBe(8);
      for (const removedId of manifestRecord.patch.removed_exit_ids) {
        expect(exits.some((exit) => exit.id === removedId), removedId).toBe(false);
      }
      for (const edit of manifestRecord.patch.exit_edits) {
        const exit = exits.find((candidate) => candidate.id === edit.id)! as unknown as JsonRecord;
        expectPatchedFields(exit, Object.fromEntries(Object.entries(edit.changes)
          .map(([field, change]: [string, any]) => [field, change.to])));
      }
      for (const edit of manifestRecord.patch.block_edits) {
        const block = level.blocks.find((candidate) => candidate.id === edit.id)! as unknown as JsonRecord;
        expectPatchedFields(block, Object.fromEntries(Object.entries(edit.changes)
          .map(([field, change]: [string, any]) => [field, change.to])));
      }
    }
  });

  it("binds Lv187/Lv193 to the SHA-locked overlap and aperture repair certificates", () => {
    expect(overlapRepairManifest.scope).toEqual([128, 155, 173, 187, 193]);
    expect(overlapRepairManifest.accepted_candidates.map((entry: JsonRecord) => entry.level_id)).toEqual([187, 193]);
    expect(overlapRepairManifest.not_accepted.map((entry: JsonRecord) => entry.level_id)).toEqual([128, 155, 173]);
    expect(overlapRepairReport.summary).toMatchObject({
      accepted_for_formal_integration: [187, 193],
      inconclusive_max_states: [128, 155, 173],
      exact_exhaustion_no_solution: [],
    });

    const expected = {
      187: {
        source: "B9392582AC8D661D67FB612FCEBF30AE3657A653A80A37AE294FD60D8E0ABD28",
        target: "CD0D928BA42316517461C0F471FB93BE2A25A6EF7CB3810A008565BCB3782BA7",
        evidence: "9B12F9B70648B43BD51CE42FB1135F01C3773B0F308F9F941F9642B04C9FB4B2",
        exits: 6, maxStates: 20_000, states: 27, drags: 22, clearLoad: 21, overhead: 1, gridSteps: 85, turns: 16,
      },
      193: {
        source: "11742943B06CA12E234E49DA0C0B67D58E2FA90170D2FEDC978A16A9E9E3236E",
        target: "D5C5D2464A747B28C5D1F3AA76D701B852B9C000BC05A608B30B5D5E40E884AC",
        evidence: "F4652E7A67BF1A4A659676ED792CC6736E392D4580149E03B7C15D9A68F577B5",
        exits: 7, maxStates: 2_000, states: 20, drags: 16, clearLoad: 15, overhead: 1, gridSteps: 51, turns: 8,
      },
    } as const;
    for (const levelId of [187, 193] as const) {
      const level = VIDEO_PARITY_LEVELS_101_TO_200.find((entry) => entry.id === levelId)!;
      const repair = runtimeRepairById.get(levelId)!;
      const manifestRecord = overlapRepairManifest.accepted_candidates.find(
        (entry: JsonRecord) => entry.level_id === levelId,
      )!;
      expect(repair).toMatchObject({
        candidate_id: `lv${levelId}-overlap-wide-corridors`,
        source_exit_count: expected[levelId].exits,
        target_exit_count: expected[levelId].exits,
        source_semantic_sha256: expected[levelId].source,
        target_semantic_sha256: expected[levelId].target,
        generated_source_semantic_sha256: expected[levelId].source,
        generated_target_semantic_sha256: expected[levelId].target,
        evidence_sha256: expected[levelId].evidence,
        maximum_opening_same_color_component_size: 2,
        verification: {
          max_states: expected[levelId].maxStates,
          explored_states: expected[levelId].states,
          minimum_drags: expected[levelId].drags,
          clear_load: expected[levelId].clearLoad,
          reposition_overhead: expected[levelId].overhead,
          grid_steps: expected[levelId].gridSteps,
          turns: expected[levelId].turns,
        },
        puzzle_model_replay: {
          attempted: true, complete: true, finalMoves: expected[levelId].drags,
          remainingBlocks: 0, remainingQueuedBlocks: 0,
        },
        integration_manifest: {
          path: "playtest-results/experiments/overlap-high-exit-repair-lv128-193-r1/patch-manifest.json",
          sha256: "BAA750BB7B39FE9646B58151AD62B34CCC1E2F250BF281778CA04E307911E1A4",
          expected_sha256: "BAA750BB7B39FE9646B58151AD62B34CCC1E2F250BF281778CA04E307911E1A4",
          report: {
            path: "playtest-results/experiments/overlap-high-exit-repair-lv128-193-r1/final-report.json",
            sha256: "0915896B4CDFCBF87F0FB9601486BBFBA68D4067F8230ABFDFE9BF0DC5ECA917",
            expected_sha256: "0915896B4CDFCBF87F0FB9601486BBFBA68D4067F8230ABFDFE9BF0DC5ECA917",
          },
        },
      });
      expect(Object.values(repair.preservation_contract)).toEqual(Array(8).fill(true));
      expect(repair.route).toEqual(manifestRecord.solver.route);
      const exits = [...level.gates, ...(level.flipDoors ?? [])];
      expect(exits).toHaveLength(expected[levelId].exits);
      expect(new Set(exits.map((exit) => exit.color)).size).toBe(exits.length);
      for (const edit of manifestRecord.patch.exit_edits) {
        const exit = exits.find((candidate) => candidate.id === edit.id)! as unknown as JsonRecord;
        expectPatchedFields(exit, Object.fromEntries(Object.entries(edit.changes)
          .map(([field, change]: [string, any]) => [field, change.to])));
      }
      for (const edit of manifestRecord.patch.block_edits) {
        const block = level.blocks.find((candidate) => candidate.id === edit.id)! as unknown as JsonRecord;
        expectPatchedFields(block, Object.fromEntries(Object.entries(edit.changes)
          .map(([field, change]: [string, any]) => [field, change.to])));
      }
    }
  });

  it("binds Lv105 atomically to the accepted stage2 manifest and independent replay certificate", () => {
    const level = VIDEO_PARITY_LEVELS_101_TO_200.find((entry) => entry.id === 105)!;
    const repair = runtimeRepairById.get(105)!;
    const manifestRecord = lv105Stage2Manifest.levels.find((entry: JsonRecord) => entry.level_id === 105)!;
    expect(lv105Stage2Manifest.summary.accepted_experimental_candidates).toEqual([105]);
    expect(lv105Stage2Manifest.levels.filter((entry: JsonRecord) => entry.accepted_for_formal_integration)
      .map((entry: JsonRecord) => entry.level_id)).toEqual([105]);
    expect(manifestRecord.accepted_for_formal_integration).toBe(true);
    expect(repair.candidate_id).toBe("lv105-second-g1-offset-4-size-2");
    expect(repair.integration_manifest).toEqual({
      path: "playtest-results/experiments/recolor-exit-block-repair-lv103-109/stage2-patch-manifest.json",
      sha256: "CC7079ACCA3E3863767141626EA3CC9A8802A4465747355087CAFEACEEB137F6",
      expected_sha256: "CC7079ACCA3E3863767141626EA3CC9A8802A4465747355087CAFEACEEB137F6",
      source_semantic_sha256: "5176D6F5F8387E586CE41D3648B299283EE23D9F63EBD0D8E25E12D4DA0607B4",
      target_semantic_sha256: "C84834A692B3783FEA2DF1C7D678A1E8FE8269DBB2FD077BD8756515AC0D11DC",
      independent_verification: {
        path: "playtest-results/experiments/recolor-exit-block-repair-lv103-109/stage2-lv105-manifest-verification.json",
        sha256: "622344DAF81B00EB64FA5433A9B83DD6F25C638DAAFDB054068B312B3B91FEA9",
      },
    });
    expect(repair.generated_source_semantic_sha256).toBe(repair.source_semantic_sha256);
    expect(repair.generated_target_semantic_sha256).toBe(repair.target_semantic_sha256);
    expect(Object.values(repair.preservation_contract)).toEqual(Array(8).fill(true));
    expectPhysicalShutterRecertification(repair, 105);
    expect(repair.legacy_evidence.verification).toMatchObject({
      max_states: 20_000,
      minimum_drags: 19,
      clear_load: 15,
      reposition_overhead: 4,
      explored_states: 113,
      grid_steps: 84,
      turns: 14,
    });
    expect(lv105IndependentVerification).toMatchObject({
      level_id: 105,
      source_assertions: "pass",
      validate_level: "pass",
      unique_exit_colors: "pass",
      target_semantic_sha256: repair.integration_manifest.target_semantic_sha256,
      solver: { termination: "solved", solved: true, explored_states: 113, minimum_drags: 19 },
      puzzle_model_replay: { complete: true, final_moves: 19, remaining_blocks: 0, remaining_queued_blocks: 0 },
    });

    const gateById = new Map([...level.gates, ...(level.flipDoors ?? [])].map((gate) => [gate.id, gate]));
    expect(gateById.get("lv105-gate-01")).toMatchObject({ side: "bottom", offset: 4, size: 2, color: "purple" });
    expect(gateById.get("lv105-gate-02")?.color).toBe("cyan");
    expect(gateById.get("lv105-gate-08")?.size).toBe(2);
    const blockById = new Map(level.blocks.map((block) => [block.id, block]));
    expect(blockById.get("lv105-opening-b02")?.color).toBe("pink");
    expect(blockById.get("lv105-opening-b04")?.color).toBe("purple");
    expect(blockById.get("lv105-opening-b05")?.color).toBe("purple");
    expect(blockById.get("lv105-pooled-hidden-b01")?.color).toBe("cyan");
    expect(blockById.get("lv105-pooled-hidden-b10")?.color).toBe("cyan");
  });

  it("binds Lv117 atomically to the SHA-locked two-aperture solver certificate", () => {
    const level = VIDEO_PARITY_LEVELS_101_TO_200.find((entry) => entry.id === 117)!;
    const repair = runtimeRepairById.get(117)!;
    const manifestRecord = lv117RepairManifest.levels.find((entry: JsonRecord) => entry.level_id === 117)!;
    expect(lv117RepairManifest.accepted_level_ids).toEqual([117]);
    expect(manifestRecord.accepted_for_formal_integration).toBe(true);
    expectPhysicalShutterRecertification(repair, 117);
    expect(repair).toMatchObject({
      candidate_id: "lv117-two-size2-linked-recolor",
      integration_manifest: {
        path: "playtest-results/experiments/recolor-exit-geometry-repair-lv113-123/patch-manifest.json",
        sha256: "5755C896DD80D9C0F2E135D004D58E79D1F9AA901DB0F0712435D75ECF9B1DBA",
        expected_sha256: "5755C896DD80D9C0F2E135D004D58E79D1F9AA901DB0F0712435D75ECF9B1DBA",
      },
      maximum_opening_same_color_component_size: 2,
      legacy_evidence: {
        evidence: "playtest-results/experiments/recolor-exit-geometry-repair-lv113-123/lv117-candidate.json",
        evidence_sha256: "07487C959522A1DB3FB3E7247ABDC845D9F9699CC9A033A945891CD872572F6F",
        verification: {
          max_states: 2_000,
          explored_states: 1_687,
          minimum_drags: 29,
          clear_load: 22,
          reposition_overhead: 7,
          grid_steps: 119,
          turns: 15,
        },
      },
    });
    expect(Object.values(repair.preservation_contract)).toEqual(Array(8).fill(true));
    expect(repair.legacy_evidence.route).toEqual(lv117RepairEvidence.solver.route);
    expect(repair.legacy_evidence.puzzle_model_replay).toMatchObject({
      attempted: true, complete: true, finalMoves: 29, remainingBlocks: 0, remainingQueuedBlocks: 0,
    });

    const exitById = new Map([...level.gates, ...(level.flipDoors ?? [])].map((exit) => [exit.id, exit]));
    expect(exitById.get("lv117-gate-04")).toMatchObject({ side: "top", offset: 0, size: 2, color: "red" });
    expect(exitById.get("lv117-gate-06")).toMatchObject({ side: "left", offset: 2, size: 2, color: "purple" });
    expect(level.blocks.find(({ id }) => id === "lv117-opening-b15")?.color).toBe("yellow");
    const exitColors = [...exitById.values()].map((exit) => exit.color);
    expect(new Set(exitColors).size).toBe(exitColors.length);
    for (const edit of manifestRecord.patch.block_edits) {
      const block = level.blocks.find((candidate) => candidate.id === edit.id)! as unknown as JsonRecord;
      const legacyTarget = Object.fromEntries(Object.entries(edit.changes)
        .map(([field, change]: [string, any]) => [field, change.to]));
      expectPatchedFields(
        block,
        repair.physical_shutter_recertification_updates?.block_updates?.[edit.id]?.target ?? legacyTarget,
      );
    }
  });

  it("binds Lv124 atomically to the SHA-locked aperture and linked-recolor certificate", () => {
    const level = VIDEO_PARITY_LEVELS_101_TO_200.find((entry) => entry.id === 124)!;
    const repair = runtimeRepairById.get(124)!;
    const manifestRecord = lv124RepairManifest.accepted_candidates.find(
      (entry: JsonRecord) => entry.level_id === 124,
    )!;
    expect(lv124RepairManifest.accepted_candidates.map((entry: JsonRecord) => entry.level_id)).toEqual([124]);
    expect(lv124RepairManifest.not_accepted.map((entry: JsonRecord) => entry.level_id)).toEqual([128, 129, 131, 133]);
    expect(lv124RepairReport.summary.accepted_for_formal_integration).toEqual([124]);
    expect(lv124RepairReport.accepted_candidates[0]).toEqual(manifestRecord);
    expect(repair).toMatchObject({
      candidate_id: "lv124-two-aperture-linked-recolor",
      evidence: "playtest-results/experiments/recolor-exit-geometry-repair-lv124-133/lv124-candidate.json",
      evidence_sha256: "80A360F8DC65D70B9135A74AAF1FA7FEE5DCF67968E6C840F50BDB7575C07193",
      source_semantic_sha256: "0B6E7EA73C8C166FA23B058AB3A8C36871E7A537866C41CBE38B97EF27415D8E",
      target_semantic_sha256: "40B69F0B40BED11B569DD094F675873BB0BBC89D14CA5FB2ACBB5A2DEB44145B",
      generated_source_semantic_sha256: "0B6E7EA73C8C166FA23B058AB3A8C36871E7A537866C41CBE38B97EF27415D8E",
      generated_target_semantic_sha256: "40B69F0B40BED11B569DD094F675873BB0BBC89D14CA5FB2ACBB5A2DEB44145B",
      verification: {
        max_states: 2_000,
        explored_states: 256,
        minimum_drags: 38,
        clear_load: 26,
        reposition_overhead: 12,
        grid_steps: 161,
        turns: 32,
      },
      integration_manifest: {
        path: "playtest-results/experiments/recolor-exit-geometry-repair-lv124-133/patch-manifest.json",
        sha256: "E06DBD2EB412E4D89DDF3CF17CD1FFADD9F3FD3E29196E11638CFEFBF1EDCEE5",
        expected_sha256: "E06DBD2EB412E4D89DDF3CF17CD1FFADD9F3FD3E29196E11638CFEFBF1EDCEE5",
        report: {
          path: "playtest-results/experiments/recolor-exit-geometry-repair-lv124-133/final-report.json",
          sha256: "4A55190D6D9ED202362D60E5B491D0BD15E20733E56C2F9E495205F737C19202",
          expected_sha256: "4A55190D6D9ED202362D60E5B491D0BD15E20733E56C2F9E495205F737C19202",
        },
      },
      maximum_opening_same_color_component_size: 2,
    });
    expect(Object.values(repair.preservation_contract)).toEqual(Array(8).fill(true));
    expect(repair.route).toEqual(lv124RepairEvidence.solver.route);
    expect(repair.puzzle_model_replay).toMatchObject({
      attempted: true, complete: true, finalMoves: 38, remainingBlocks: 0, remainingQueuedBlocks: 0,
    });

    const exitById = new Map([...level.gates, ...(level.flipDoors ?? [])].map((exit) => [exit.id, exit]));
    expect(exitById.get("lv124-gate-01")).toMatchObject({ side: "right", offset: 2, size: 3, color: "orange" });
    expect(exitById.get("lv124-gate-02")).toMatchObject({ side: "bottom", offset: 0, size: 3, color: "purple" });
    expect(exitById.get("lv124-gate-04")).toMatchObject({ side: "top", offset: 1, size: 1, color: "cyan", frozen: 14 });
    expect(new Set([...exitById.values()].map((exit) => exit.color)).size).toBe(exitById.size);
    for (const edit of manifestRecord.patch.block_edits) {
      const block = level.blocks.find((candidate) => candidate.id === edit.id)! as unknown as JsonRecord;
      expectPatchedFields(block, Object.fromEntries(Object.entries(edit.changes)
        .map(([field, change]: [string, any]) => [field, change.to])));
    }
  });

  it("keeps the verified Lv125 gate repair solvable in the formal campaign", () => {
    const level = VIDEO_PARITY_LEVELS_101_TO_200.find((entry) => entry.id === 125)!;
    expect(level.gates.find((gate) => gate.id === "lv125-gate-02")?.color).toBe("cyan");
    expect(level.gates.find((gate) => gate.id === "lv125-gate-04")?.color).toBe("red");
    expect(level.gates.find((gate) => gate.id === "lv125-gate-07")?.color).toBe("blue");
    const exitColors = [
      ...level.gates.map((gate) => gate.color),
      ...(level.flipDoors ?? []).map((door) => door.color),
    ];
    expect(new Set(exitColors).size, "Lv125 gates + flipDoors must use unique colors").toBe(exitColors.length);
    const result = solveLevelForValidation(level, 120_000);
    expect(result.staticUnsatReasons).toEqual([]);
    expect(result.termination).toBe("solved");
    expect(result.minimumDrags).toBe(28);

    const model = new PuzzleModel(level);
    for (const drag of result.drags) {
      model.beginAction();
      for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
      if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
      expect(model.commitAction()).toBe(true);
    }
    expect(model.snapshot().complete).toBe(true);
  });

  it("binds Lv150 to the SHA-verified minimal carrier and one-counter repair", () => {
    const level = VIDEO_PARITY_LEVELS_101_TO_200.find((entry) => entry.id === 150)!;
    const repair = runtimeRepairById.get(150)!;
    expect(repair).toMatchObject({
      candidate_id: "lv150-minimal-carrier-counter-repair",
      evidence: "playtest-results/experiments/unique-exit-repair/auto-recolor-solver-batch-lv10-lv11-lv150-r1.json",
      evidence_sha256: "675E36DE4C2C491916F42308742B786192C1C5215B7D434E0EE58F26ABD79B97",
      source_semantic_sha256: "D064CF5C59C98A6A57365A5527F69591B4C44DCDA80E01BE75E2096E4E8158A9",
      target_semantic_sha256: "7DFECD2E8BED19D2F887B78F8E146DD8EF66096A7657F7B5564443F337301004",
      generated_source_semantic_sha256: "D064CF5C59C98A6A57365A5527F69591B4C44DCDA80E01BE75E2096E4E8158A9",
      generated_target_semantic_sha256: "7DFECD2E8BED19D2F887B78F8E146DD8EF66096A7657F7B5564443F337301004",
      verification: { explored_states: 6_121, minimum_drags: 21, clear_load: 14, reposition_overhead: 7 },
      minimal_counter_relaxation: {
        entity_id: "lv150-gate-01", field: "frozen", source_value: 7, target_value: 6,
        changed_counter_count: 1, absolute_delta: 1,
      },
      maximum_opening_same_color_component_size: 1,
    });
    expect(Object.values(repair.preservation_contract)).toEqual(Array(8).fill(true));
    expect(level.gates.find(({ id }) => id === "lv150-gate-01")).toMatchObject({ color: "cyan", frozen: 6 });
    expect(level.gates.find(({ id }) => id === "lv150-gate-02")).toMatchObject({ color: "pink", frozen: 7 });
    expect(level.blocks.find(({ id }) => id === "lv150-opening-b12")?.color).toBe("yellow");
  });

  it("keeps all documented runtime repairs unique, replayable and solver-complete", () => {
    for (const levelId of solverRepairLevelIds) {
      const level = VIDEO_PARITY_LEVELS_101_TO_200.find((entry) => entry.id === levelId)!;
      const repair = runtimeRepairById.get(levelId)!;
      const exits = [...level.gates, ...(level.flipDoors ?? [])];
      if (repair.playable_update) {
        const adjustment = repair.post_repair_generator_rim_adjustment;
        const expectedPlayable = new Map<string, readonly [number, number]>(repair.playable_update.target.map(
          ([x, y]: readonly [number, number]) => [`${x},${y}`, [x, y] as const],
        ));
        for (const key of adjustment?.removed ?? []) expectedPlayable.delete(key);
        for (const key of adjustment?.added ?? []) {
          const [x, y] = key.split(",").map(Number);
          expectedPlayable.set(key, [x!, y!] as const);
        }
        expect(sortedPoints(level.playable ?? [])).toEqual(sortedPoints([...expectedPlayable.values()]));
      }
      expect(exits).toHaveLength(repair.target_exit_count);
      expect(new Set(exits.map((exit) => exit.color)).size, `Lv${levelId} unique exits`).toBe(exits.length);
      for (const removedId of repair.remove_exit_ids) {
        expect(exits.some((exit) => exit.id === removedId), `Lv${levelId}/${removedId} removed`).toBe(false);
      }
      for (const [exitId, patch] of Object.entries(repair.exit_updates) as Array<[string, JsonRecord]>) {
        const exit = exits.find((candidate) => candidate.id === exitId)! as unknown as JsonRecord;
        expectPatchedFields(exit, patch.target);
      }
      for (const [blockId, patch] of Object.entries(repair.block_updates) as Array<[string, JsonRecord]>) {
        const block = level.blocks.find((candidate) => candidate.id === blockId)! as unknown as JsonRecord;
        expectPatchedFields(
          block,
          repair.physical_shutter_recertification_updates?.block_updates?.[blockId]?.target ?? patch.target,
        );
      }
      for (const [generatorId, patch] of Object.entries(repair.generator_updates ?? {}) as Array<[string, JsonRecord]>) {
        const generator = level.generators?.find((candidate) => candidate.id === generatorId)! as unknown as JsonRecord;
        expectPatchedFields(generator, patch.target);
      }
      for (const [shutterId, patch] of Object.entries(repair.shutter_updates ?? {}) as Array<[string, JsonRecord]>) {
        const shutter = level.shutters?.find((candidate) => candidate.id === shutterId)! as unknown as JsonRecord;
        expectPatchedFields(shutter, patch.target);
      }
      expect(repair.maximum_opening_same_color_component_size).toBeLessThanOrEqual(2);
      expect(() => validateLevel(level)).not.toThrow();

      const result = solveLevelForValidation(level, 20_000);
      expect(result).toMatchObject({
        solved: true,
        termination: "solved",
        minimumDrags: repair.verification.minimum_drags,
        clearLoad: repair.verification.clear_load,
        repositionOverhead: repair.verification.reposition_overhead,
        exploredStates: repair.verification.explored_states,
        unsupportedReasons: [],
        staticUnsatReasons: [],
      });
      const model = new PuzzleModel(level);
      const replayRoute = Array.isArray(repair.route) ? repair.route : result.drags;
      if (Array.isArray(repair.route)) expect(result.drags).toEqual(repair.route);
      for (const drag of replayRoute) {
        model.beginAction();
        for (const [x, y] of drag.path) expect(model.moveBlockStep(drag.blockId, x, y)).toBe(true);
        if (drag.exitSide) expect(model.tryExit(drag.blockId, drag.exitSide).ok).toBe(true);
        expect(model.commitAction()).toBe(true);
      }
      expect(model.snapshot()).toMatchObject({ complete: true, moves: repair.verification.minimum_drags });
      if (repair.puzzle_model_replay) expect(repair.puzzle_model_replay).toMatchObject({
        attempted: true,
        complete: true,
        finalMoves: repair.verification.minimum_drags,
        remainingBlocks: 0,
        remainingQueuedBlocks: 0,
      });
    }
  }, 60_000);

  it("preserves rows, columns, playable count, time, block count and every shape", () => {
    for (const level of VIDEO_PARITY_LEVELS_101_TO_200) {
      const sourceLevel = candidateById.get(level.id)!;
      const sourceBlocks = sourceLevel.stages.flatMap((stage: JsonRecord) => stage.blocks);
      const runtimeRepair = runtimeRepairById.get(level.id);
      expect(level.width, `Lv${level.id} cols`).toBe(sourceLevel.board.width);
      expect(level.height, `Lv${level.id} rows`).toBe(sourceLevel.board.height);
      expect(level.playable?.length, `Lv${level.id} playable cells`).toBe(
        auditById.get(level.id)?.mask.runtime_playable_cell_count,
      );
      expect(level.timeSeconds, `Lv${level.id} time`).toBe(sourceLevel.time_seconds);
      expect(level.blocks.length, `Lv${level.id} block count`).toBe(sourceBlocks.length);
      const shapeAdjustments = auditById.get(level.id)?.invariants.shape_adjustments ?? [];
      if (!shapeAdjustments.length) {
        expect(shapeHistogram(level.blocks), `Lv${level.id} shape histogram`).toEqual(shapeHistogram(sourceBlocks));
      } else {
        expect(auditById.get(level.id)?.invariants.shape_histogram_preserved).toBe(false);
        const adjustmentByBlockId = new Map<string, JsonRecord>((shapeAdjustments as JsonRecord[]).map(
          (adjustment: JsonRecord) => [adjustment.block_id, adjustment],
        ));
        const sourceById = new Map<string, JsonRecord>(sourceBlocks.map(
          (block: JsonRecord) => [block.id, block],
        ));
        for (const block of level.blocks) {
          const adjustment = adjustmentByBlockId.get(block.id);
          const expectedShapeKey = adjustment
            ? physicalShapeKeyById[adjustment.value]
            : blockShapeKey(sourceById.get(block.id)!.shape);
          expect(blockShapeKey(block.shape), `${block.id} documented physical shape`).toBe(expectedShapeKey);
        }
      }
      const runtimeById = new Map(level.blocks.map((block) => [block.id, block]));
      for (const sourceBlock of sourceBlocks.filter((block: JsonRecord) => ["L5", "T6"].includes(block.shape_id))) {
        const expectedColor = sourceBlock.shape_id === "L5" ? "green" : "yellow";
        const runtimeBlock = runtimeById.get(sourceBlock.id);
        expect(runtimeBlock?.layers?.[0] ?? runtimeBlock?.color, `${sourceBlock.id} formal whole-piece color`).toBe(expectedColor);
      }
    }
  });

  it("preserves supported mechanism multiplicity and numeric values outside documented solver repairs", () => {
    for (const level of VIDEO_PARITY_LEVELS_101_TO_200) {
      const sourceLevel = candidateById.get(level.id)!;
      const bindings = sourceLevel.mechanism_bindings as JsonRecord[];
      const levelAudit = auditById.get(level.id)!;
      const bound = (kind: string) => bindings.filter((entry) => entry.kind === kind && entry.block_id);
      const runtimeById = new Map(level.blocks.map((block) => [block.id, block]));
      const sourceExits = exitRecords(sourceLevel);
      const runtimeRepair = runtimeRepairById.get(level.id);
      const combinedExits = [...level.gates, ...(level.flipDoors ?? [])];
      if (runtimeRepair) {
        expect(combinedExits.length, `Lv${level.id} repaired exit count`).toBe(runtimeRepair.target_exit_count);
        expect(levelAudit.solver_verified_runtime_repair).toEqual(runtimeRepair);
        expect(new Set(combinedExits.map((gate) => gate.color)).size).toBe(combinedExits.length);
      } else {
        expect(level.gates.length, `Lv${level.id} directional exit count`).toBe(sourceExits.length);
        sourceExits.forEach((record, index) => {
          const gate = level.gates[index];
          if (["top", "right", "bottom", "left"].includes(record.side) && gate.side !== record.side) {
            expect(levelAudit.gates[index].field_evidence.side).toBe("design_fill_source_side_capacity_conflict");
          }
          if (positiveInteger(record.size)) expect(gate.size).toBe(record.size);
          if (Number.isInteger(record.offset) && gate.offset !== record.offset) {
            expect(levelAudit.gates[index].field_evidence.offset).toBe("design_fill_source_offset_conflict");
          }
          const color = record.color ?? record.color_class;
          if (["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"].includes(color)) {
            expect(gate.color).toBe(color);
          }
        });
      }
      expect(sortedNumbers((runtimeRepair ? combinedExits : level.gates).map((gate) => gate.frozen).filter(positiveInteger)), `Lv${level.id} frozen exits`).toEqual(
        runtimeRepair
          ? runtimeRepair.target_frozen_exit_values
          : sortedNumbers(sourceExits.map(frozenValue).filter(positiveInteger)),
      );
      expect(level.flipDoors?.length ?? 0, `Lv${level.id} flip doors`).toBe(
        Array.isArray(sourceLevel.mechanism_contract.flip_doors) ? sourceLevel.mechanism_contract.flip_doors.length : 0,
      );
      expect(level.coloredGrids?.length ?? 0, `Lv${level.id} colored grids`).toBe(
        Array.isArray(sourceLevel.mechanism_contract.colored_grid) ? sourceLevel.mechanism_contract.colored_grid.length : 0,
      );
      for (const binding of bound("numeric_ice")) {
        const repairedFrozen = runtimeRepair?.block_updates?.[binding.block_id]?.target?.frozen;
        if (repairedFrozen === null) {
          expect(runtimeById.get(binding.block_id)?.frozen, `${binding.block_id} repaired numeric ice`).toBeUndefined();
        } else {
          expect(runtimeById.get(binding.block_id)?.frozen, `${binding.block_id} numeric ice`).toBe(
            repairedFrozen ?? [binding.source_item?.value, binding.source_item?.count].find(positiveInteger) ?? 1,
          );
        }
      }
      for (const binding of bound("shell")) {
        expect(runtimeById.get(binding.block_id)?.layers?.length, `${binding.block_id} shell`).toBe(2);
        expect(new Set(runtimeById.get(binding.block_id)?.layers).size, `${binding.block_id} distinct shell`).toBe(2);
      }
      for (const binding of bound("axis_block")) expect(runtimeById.get(binding.block_id)?.movementAxis).toBeTruthy();
      for (const binding of bound("star_block")) expect(runtimeById.get(binding.block_id)?.star).toBe(true);
      for (const binding of bound("key_block")) expect(runtimeById.get(binding.block_id)?.keyId).toBeTruthy();
      for (const binding of bound("lock_block")) {
        const block = runtimeById.get(binding.block_id);
        expect(block?.lockedBy, `${binding.block_id} lockedBy`).toBeTruthy();
        expect(block?.lockCount, `${binding.block_id} lock count`).toBe(
          positiveInteger(binding.source_item?.lock_count) ? binding.source_item.lock_count : 1,
        );
      }
      for (const binding of bound("bomb")) {
        expect(runtimeById.get(binding.block_id)?.timedBombSeconds, `${binding.block_id} bomb value`).toBe(binding.source_item.value);
      }
      for (const binding of bound("circular_double_arrow_marked_block")) {
        expect(runtimeById.get(binding.block_id)?.rotationBadge, `${binding.block_id} marker`).toBe(true);
      }
      expect(level.bombFailurePolicy, `Lv${level.id} must not infer bomb failure`).toBeUndefined();
      const sourceFlipDoors = Array.isArray(sourceLevel.mechanism_contract.flip_doors)
        ? sourceLevel.mechanism_contract.flip_doors : [];
      if (!runtimeRepair) sourceFlipDoors.forEach((door: JsonRecord, index: number) => {
        const runtimeDoor = level.flipDoors?.[index];
        const gateAudit = levelAudit.gates[sourceExits.length + index];
        if (runtimeDoor?.side !== door.side) expect(gateAudit.field_evidence.side).toBe("design_fill_source_side_capacity_conflict");
        if (positiveInteger(door.size)) expect(runtimeDoor?.size).toBe(door.size);
        if (Number.isInteger(door.offset) && runtimeDoor?.offset !== door.offset) {
          expect(gateAudit.field_evidence.offset).toBe("design_fill_source_offset_conflict");
        }
        expect(runtimeDoor?.initiallyOpen).toBe(door.initial_state === "open");
      });
      const sourceColoredGrids = Array.isArray(sourceLevel.mechanism_contract.colored_grid)
        ? sourceLevel.mechanism_contract.colored_grid : [];
      sourceColoredGrids.forEach((grid: JsonRecord, index: number) => {
        expect(level.coloredGrids?.[index]?.color).toBe(grid.color);
        expect(level.coloredGrids?.[index]?.cells.length).toBe(grid.cells.length);
      });
      const sourceCoverCounts = sourceLevel.stage_events
        .filter((event: JsonRecord) => event.event_type === "cover_clear")
        .flatMap((event: JsonRecord) => event.producers)
        .map((producer: JsonRecord) => producer.trigger_count)
        .filter(positiveInteger);
      const expectedCoverCounts = [...sourceCoverCounts];
      for (const patch of Object.values(runtimeRepair?.shutter_updates ?? {}) as JsonRecord[]) {
        const sourceIndex = expectedCoverCounts.indexOf(patch.source.count);
        expect(sourceIndex, `Lv${level.id} declared shutter source counter`).toBeGreaterThanOrEqual(0);
        expectedCoverCounts[sourceIndex] = patch.target.count;
      }
      expect(sortedNumbers((level.shutters ?? []).map((shutter) => shutter.count)), `Lv${level.id} cover counters`).toEqual(
        sortedNumbers(expectedCoverCounts),
      );
      const sourceQueueCounts = sourceLevel.stage_events
        .filter((event: JsonRecord) => event.event_type === "generator_queue")
        .map((event: JsonRecord) => event.known_count);
      expect((level.generators ?? []).map((generator) => generator.queueBlockIds.length), `Lv${level.id} queues`).toEqual(sourceQueueCounts);
    }
  });

  it("records every mask, gate, cover, pooled-stage and generator design fill", () => {
    expect(audit.summary.unsupported_runtime_mechanism_level_ids).toEqual([]);
    for (const level of VIDEO_PARITY_LEVELS_101_TO_200) {
      const evidence = auditById.get(level.id)!;
      expect(evidence.solver_run).toBe(false);
      expect(evidence.mask.runtime_playable_cell_count).toBe(level.playable?.length);
      if (evidence.mask.status !== "source_mask_preserved") {
        expect(evidence.mask.added_for_gate_boundaries.length).toBeGreaterThan(0);
        if (evidence.mask.status === "solver_verified_runtime_repair") {
          expect(evidence.mask.removed_to_preserve_count.length)
            .toBe(evidence.mask.added_for_gate_boundaries.length);
        } else {
          expect(evidence.mask.added_for_gate_boundaries.length - evidence.mask.removed_to_preserve_count.length)
            .toBe(evidence.mask.runtime_playable_cell_count - evidence.mask.source_playable_cell_count);
        }
      }
      for (const gate of evidence.gates) {
        expect(gate.field_evidence.side).toBeTruthy();
        expect(gate.field_evidence.offset).toBeTruthy();
        expect(gate.field_evidence.size).toBeTruthy();
        expect(gate.field_evidence.color).toBeTruthy();
      }
      for (const cover of evidence.covers) {
        expect(cover.region_provenance).toBeTruthy();
        expect(cover.counter_value).toBeGreaterThan(0);
        if (cover.runtime_skin === "staging") expect(cover.downgrade_reason).toBeTruthy();
      }
      const pooledBlocks = evidence.design_fill_evidence.filter((entry: JsonRecord) => entry.kind === "pooled_hidden_assignment");
      for (const item of pooledBlocks) expect(item.value).toMatch(/^lv\d+-cover-/);
      for (const generator of evidence.generators) {
        expect(generator.field_evidence.spawn).toBe("design_fill_common_shape_compatible_anchor");
        expect(generator.queue_block_ids.length).toBeGreaterThan(0);
      }
    }
  });
});
