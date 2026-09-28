import { describe, expect, it } from "vitest";
import {
  auditRevisedCandidate, isRevisedIrregularShape,
  type RevisedCandidateSourceContract, type RevisedExitInventory, type RevisedMechanismInventory,
} from "../src/core/revisedCandidateAudit";
import type { BlockSpec, LevelSpec, Point } from "../src/core/types";

const rectangle = (width = 5, height = 5): Point[] => Array.from({ length: height }, (_, y) => (
  Array.from({ length: width }, (_, x): Point => [x, y])
)).flat();
const piece = (id: string, x: number, y: number, color: BlockSpec["color"] = "red", extra: Partial<BlockSpec> = {}): BlockSpec => ({ id, x, y, color, shape: [[0, 0]], ...extra });
const exit = (width = 1, extra: Partial<RevisedExitInventory> = {}): RevisedExitInventory => ({ kind: "ordinary", width, frozen: 0, star: false, ...extra });
// This source fixture is written independently, never synthesized from the
// candidate measurement. Every absent mechanism is explicitly recorded.
const inventory = (extra: Partial<RevisedMechanismInventory> = {}): RevisedMechanismInventory => ({
  generatorQueueLengths: [], axisHorizontalBlocks: 0, axisVerticalBlocks: 0,
  keyGroups: [], starBlocks: 0, flipDoorInitialOpen: [], coloredGridCellCounts: [],
  bombSeconds: [], shutterClearCounts: [], shutterHiddenBatchCounts: [], liftCount: 0, liftHiddenBatchCounts: [], numericIceValues: [], shellBlocks: 0,
  exits: [exit()], ...extra,
});
const source = (extra: Partial<RevisedCandidateSourceContract> = {}): RevisedCandidateSourceContract => ({
  referenceId: "independent-fixture-source", sha256: "a".repeat(64), seed: "fixture-seed-17",
  width: 5, height: 5, openingBlockCount: 1, fullBlockCount: 1, mechanisms: inventory(),
  originalMask: rectangle().filter(([x, y]) => x !== 0 || y !== 0), ...extra,
});
const candidate = (extra: Partial<LevelSpec> = {}): LevelSpec => ({
  id: 99401, name: "isolated candidate audit", width: 5, height: 5, timeSeconds: 90, reward: 0,
  difficulty: "normal", mechanismRules: "revised-2026-09-21-v1.2",
  playable: rectangle().filter(([x, y]) => y !== 0 || (x !== 0 && x !== 4)),
  gates: [{ id: "red-exit", side: "left", offset: 2, size: 1, color: "red" }],
  blocks: [piece("red", 0, 2)], ...extra,
});
const issueCodes = (input: LevelSpec, truth: unknown = source()) => auditRevisedCandidate(input, truth).issues.map(({ code }) => code);

describe("v1.2 candidate audit is necessary static evidence, not a release certificate", () => {
  it("passes an evidenced static fixture without mutating candidate or source, and always withholds release approval", () => {
    const input = candidate(), truth = source();
    const before = structuredClone({ input, truth });
    const result = auditRevisedCandidate(input, truth);
    expect(result.issues).toEqual([]);
    expect(result).toMatchObject({ staticPassed: true, releaseApproved: false, ruleVersion: "1.2.1",
      sourceSha256: truth.sha256, seed: truth.seed, measurements: { openingBlockCount: 1, fullBlockCount: 1 } });
    expect(result.outstandingGates).toContain("minimum-nonclear-drag-proof");
    expect({ input, truth }).toEqual(before);
  });

  it("rejects missing or unknown source fields rather than inferring a quota from the candidate", () => {
    const missing = auditRevisedCandidate(candidate(), {});
    expect(missing.staticPassed).toBe(false);
    expect(missing.issues.map(({ code }) => code)).toEqual(expect.arrayContaining([
      "missing-source-reference", "missing-source-hash", "missing-seed", "missing-source-number",
      "incomplete-source-inventory", "originality-unverified",
    ]));
    const truth = source() as unknown as Record<string, unknown>;
    truth.openingBlockCount = "unknown";
    (truth.mechanisms as Record<string, unknown>).bombSeconds = undefined;
    expect(issueCodes(candidate(), truth)).toContain("incomplete-source-inventory");
    expect(issueCodes(candidate(), truth)).toContain("missing-source-number");
  });

  it("requires the v1.2 profile and explicit source inventory zeroes", () => {
    expect(issueCodes(candidate({ mechanismRules: "revised-2026-09-21" }))).toContain("wrong-rule-profile");
    expect(issueCodes(candidate({ mechanismRules: "revised-2026-09-21-v1.1" }))).toContain("wrong-rule-profile");
    const truth = source();
    delete (truth.mechanisms as Partial<RevisedMechanismInventory>).liftCount;
    expect(issueCodes(candidate(), truth)).toContain("incomplete-source-inventory");
  });

  it("compares all inventory key values, not only presence or total count", () => {
    const input = candidate({ blocks: [piece("red", 0, 2, "red", { timedBombSeconds: 15 })] });
    const truth = source({ mechanisms: inventory({ bombSeconds: [25] }) });
    expect(auditRevisedCandidate(input, truth).issues).toContainEqual(expect.objectContaining({
      category: "mechanism", code: "source-mechanism-mismatch", message: expect.stringContaining("bombSeconds"),
    }));
  });

  it("counts an initially empty generator's automatically dispatched cargo in the stable opening", () => {
    const input = candidate({
      gates: [{ id: "red-exit", side: "bottom", offset: 2, size: 1, color: "red" }],
      generators: [{ id: "machine", side: "top", offset: 2, spawn: [2, 0], queueBlockIds: ["cargo"] }],
      blocks: [piece("cargo", 2, 0)],
    });
    const truth = source({ mechanisms: inventory({ generatorQueueLengths: [1] }) });
    const result = auditRevisedCandidate(input, truth);
    expect(result.issues).toEqual([]);
    expect(result.measurements.openingBlockIds).toEqual(["cargo"]);
    expect(issueCodes(input, { ...truth, openingBlockCount: 0 })).toContain("opening-count-mismatch");
  });

  it("counts automatically revealed lift ice, while still-hidden shutter ice belongs only to the full count", () => {
    const lift = candidate({
      shutters: [{ id: "lift", skin: "lift", x: 2, y: 2, width: 1, height: 1, count: 1 }],
      blocks: [piece("ice", 2, 2, "red", { shutterId: "lift", frozen: 6 })],
    });
    const result = auditRevisedCandidate(lift, source({ mechanisms: inventory({ liftCount: 1, liftHiddenBatchCounts: [1], numericIceValues: [6] }) }));
    expect(result.issues).toEqual([]);
    expect(result.measurements.openingBlockIds).toEqual(["ice"]);
    const cover = candidate({
      gates: [{ id: "red-exit", side: "left", offset: 1, size: 3, color: "red" }],
      shutters: [{ id: "cover", x: 2, y: 2, width: 1, height: 1, count: 1 }],
      blocks: [piece("opening", 0, 1), piece("ice", 2, 2, "red", { shutterId: "cover", frozen: 6 })],
    });
    const covered = auditRevisedCandidate(cover, source({ fullBlockCount: 2,
      mechanisms: inventory({ shutterClearCounts: [1], shutterHiddenBatchCounts: [1], numericIceValues: [6], exits: [exit(3)] }) }));
    expect(covered.issues).toEqual([]);
    expect(covered.measurements).toMatchObject({ fullBlockCount: 2, openingBlockCount: 1, openingBlockIds: ["opening"] });
  });

  it("counts a shell and its core as one full piece, and rejects floor/shell combinations via model construction", () => {
    const input = candidate({ gates: [
      { id: "red-exit", side: "left", offset: 2, size: 1, color: "red" },
      { id: "blue-exit", side: "bottom", offset: 0, size: 1, color: "blue" },
    ], blocks: [piece("shell", 0, 2, "red", { layers: ["red", "blue"] })] });
    const truth = source({ mechanisms: inventory({ shellBlocks: 1, exits: [exit(), exit()] }) });
    expect(auditRevisedCandidate(input, truth)).toMatchObject({ staticPassed: true, measurements: { fullBlockCount: 1 } });
    input.coloredGrids = [{ id: "floor", color: "red", cells: [[4, 4]] }];
    expect(auditRevisedCandidate(input, truth).issues).toContainEqual(expect.objectContaining({
      code: "invalid-runtime-level", message: expect.stringContaining("colored-grid-shell"),
    }));
  });

  it("recognizes translated full rectangles as regular shapes", () => {
    expect(isRevisedIrregularShape([[3, -1], [4, -1], [3, 0], [4, 0]])).toBe(false);
    expect(isRevisedIrregularShape([[0, 0], [0, 1], [1, 1]])).toBe(true);
  });

  it("rejects opening-only irregular excess even if hidden regular cargo keeps the full ratio below 30%", () => {
    const input = candidate({
      gates: [
        { id: "red", side: "left", offset: 1, size: 2, color: "red" },
        { id: "blue", side: "bottom", offset: 0, size: 1, color: "blue" },
        { id: "green", side: "bottom", offset: 1, size: 1, color: "green" },
        { id: "yellow", side: "bottom", offset: 2, size: 1, color: "yellow" },
      ],
      shutters: [{ id: "cover", x: 3, y: 0, width: 1, height: 3, count: 1 }],
      blocks: [piece("ell", 0, 1, "red", { shape: [[0, 0], [0, 1], [1, 1]] }),
        ...(["blue", "green", "yellow"] as const).map((color, y) => piece(`hidden-${y}`, 3, y, color, { shutterId: "cover" }))],
    });
    const truth = source({ fullBlockCount: 4, mechanisms: inventory({ shutterClearCounts: [1], shutterHiddenBatchCounts: [3], exits: [exit(2), exit(), exit(), exit()] }) });
    const result = auditRevisedCandidate(input, truth);
    expect(result.issues.map(({ code }) => code)).toEqual(["opening-irregular-ratio"]);
    expect(result.measurements).toMatchObject({ fullIrregularRatio: 0.25, openingIrregularRatio: 1 });
  });

  it("rejects full-only irregular excess even when every opening piece is regular", () => {
    const input = candidate({ width: 6, height: 6,
      playable: rectangle(6, 6).filter(([x, y]) => y !== 5 || (x !== 0 && x !== 5)),
      gates: [
        { id: "exit-red", side: "top", offset: 0, size: 1, color: "red" },
        { id: "exit-blue", side: "top", offset: 2, size: 1, color: "blue" },
        { id: "exit-green", side: "top", offset: 4, size: 1, color: "green" },
        { id: "exit-yellow", side: "right", offset: 2, size: 1, color: "yellow" },
        { id: "exit-purple", side: "left", offset: 3, size: 2, color: "purple" },
        { id: "exit-orange", side: "bottom", offset: 2, size: 2, color: "orange" },
      ],
      shutters: [{ id: "cover", x: 0, y: 3, width: 4, height: 2, count: 1 }],
      blocks: [piece("red", 0, 0), piece("blue", 2, 0, "blue"), piece("green", 4, 0, "green"), piece("yellow", 5, 2, "yellow"),
        piece("purple", 0, 3, "purple", { shutterId: "cover", shape: [[0, 0], [0, 1], [1, 1]] }),
        piece("orange", 2, 3, "orange", { shutterId: "cover", shape: [[0, 0], [0, 1], [1, 1]] })],
    });
    const truth = source({ width: 6, height: 6, openingBlockCount: 4, fullBlockCount: 6,
      originalMask: rectangle(6, 6).filter(([x, y]) => x !== 0 || y !== 5),
      mechanisms: inventory({ shutterClearCounts: [1], shutterHiddenBatchCounts: [2], exits: [exit(), exit(), exit(), exit(), exit(2), exit(2)] }) });
    const result = auditRevisedCandidate(input, truth);
    expect(result.issues.map(({ code }) => code)).toEqual(["full-irregular-ratio"]);
    expect(result.measurements.openingIrregularRatio).toBe(0);
  });

  it("enforces dimensions and the actual effective floor bounding box", () => {
    expect(issueCodes(candidate(), source({ width: 6 }))).toContain("source-board-dimensions");
    const input = candidate({ playable: rectangle().filter(([x]) => x < 4) });
    expect(issueCodes(input)).toContain("floor-bounding-box");
  });

  it("accepts one symmetry axis, but rejects asymmetric boards, disconnected floor and enclosed holes", () => {
    const symmetric = candidate({ playable: rectangle().filter(([x, y]) => y !== 0 || (x !== 0 && x !== 4)) });
    expect(auditRevisedCandidate(symmetric, source()).staticPassed).toBe(true);
    expect(issueCodes(candidate({ playable: rectangle().filter(([x, y]) => x !== 0 || y !== 0) }))).toContain("asymmetric-board");
    expect(issueCodes(candidate({ playable: rectangle().filter(([x]) => x !== 2) }))).toContain("disconnected-board");
    expect(issueCodes(candidate({ blocked: [[2, 2]] }))).toContain("internal-board-void");
  });

  it("includes physical seams when auditing connectivity", () => {
    const input = candidate({ seams: [{ orientation: "vertical", offset: 2, start: 0, size: 5 }] });
    expect(issueCodes(input)).toContain("disconnected-board");
  });

  it("blocks unproven originality, identical source masks and equivalent reflections or quarter-turns", () => {
    expect(issueCodes(candidate(), source({ originalMask: undefined }))).toContain("originality-unverified");
    expect(issueCodes(candidate(), source({ originalMask: candidate().playable }))).toContain("source-mask-reused");
    const copied = candidate({ playable: rectangle().filter(([x, y]) => x !== 4 || y !== 0) });
    expect(issueCodes(copied)).toContain("source-mask-reused");
    const turnedSource = rectangle().filter(([x, y]) => !(x === 0 && y < 2));
    const turned = candidate({ playable: turnedSource.map(([x, y]) => [4 - y, x] as Point) });
    expect(issueCodes(turned, source({ originalMask: turnedSource }))).toContain("source-mask-reused");
  });

  it("counts and reserves every physical portal, including repeated colours within one logical gate", () => {
    const input = candidate({ gates: [{ id: "exit-red", side: "left", offset: 1, size: 1, color: "red",
      portals: [{ side: "left", origin: [0, 1], size: 1 }, { side: "left", origin: [0, 2], size: 1 }] }] });
    const truth = source({ mechanisms: inventory({ exits: [exit(), exit()] }) });
    const result = auditRevisedCandidate(input, truth);
    expect(result.measurements.mechanisms.exits).toHaveLength(2);
    expect(result.issues.map(({ code }) => code)).toEqual(["repeated-exit-colour"]);
    expect(issueCodes(input)).toContain("source-mechanism-mismatch");
  });

  it("combines fixed and closed flip exits for colour uniqueness", () => {
    const input = candidate({ flipDoors: [{ id: "flip", side: "right", offset: 2, size: 1, color: "red", initiallyOpen: false }] });
    expect(issueCodes(input, source({ mechanisms: inventory({ flipDoorInitialOpen: [false], exits: [exit(), exit(1, { kind: "flip" })] }) })))
      .toEqual(["repeated-exit-colour"]);
  });

  it("permits exactly one ordinary/star colour pair backed by a matching star block", () => {
    const input = candidate({ blocks: [piece("red-star", 0, 2, "red", { star: true })], gates: [
      ...candidate().gates, { id: "red-star-mouth", color: "red", side: "bottom", offset: 0, size: 1, star: true },
    ] });
    const truth = source({ mechanisms: inventory({ starBlocks: 1, exits: [exit(), exit(1, { star: true })] }) });
    expect(auditRevisedCandidate(input, truth).issues).toEqual([]);
    input.blocks[0].star = false;
    expect(issueCodes(input, source({ mechanisms: inventory({ exits: [exit(), exit(1, { star: true })] }) })))
      .toContain("repeated-exit-colour");
  });

  it("does not use an unrelated star, second star mouth or extra ordinary mouth to evade duplicate checks", () => {
    const base = candidate({ blocks: [piece("red-star", 0, 2, "red", { star: true })], gates: [
      ...candidate().gates, { id: "red-star-mouth", color: "red", side: "bottom", offset: 0, size: 1, star: true },
    ] });
    for (const star of [false, true]) {
      const extra = structuredClone(base);
      extra.gates.push({ id: "extra", color: "red", side: "right", offset: 2, size: 1, star });
      expect(issueCodes(extra)).toContain("repeated-exit-colour");
    }
    base.blocks[0].color = "blue";
    expect(issueCodes(base)).toContain("repeated-exit-colour");
    base.blocks[0].color = "red";
    base.gates[1].portals = [{ side: "bottom", origin: [0, 4], size: 1 }, { side: "bottom", origin: [1, 4], size: 1 }];
    expect(issueCodes(base)).toContain("repeated-exit-colour");
  });

  it("includes a genuinely hidden star in the colour-pair prerequisite", () => {
    const input = candidate({
      gates: [...candidate().gates, { id: "red-star", color: "red", side: "bottom", offset: 2, size: 1, star: true }],
      shutters: [{ id: "cover", x: 2, y: 2, width: 1, height: 1, count: 1 }],
      blocks: [piece("opening", 0, 2), piece("hidden-star", 2, 2, "red", { shutterId: "cover", star: true })],
    });
    const truth = source({ fullBlockCount: 2, mechanisms: inventory({ starBlocks: 1, shutterClearCounts: [1],
      shutterHiddenBatchCounts: [1], exits: [exit(), exit(1, { star: true })] }) });
    expect(auditRevisedCandidate(input, truth).issues).toEqual([]);
  });

  it("uses source exit widths as reference rather than forbidding original compatible geometry", () => {
    const input = candidate({ gates: [{ id: "red-exit", color: "red", side: "left", offset: 1, size: 3 }] });
    expect(auditRevisedCandidate(input, source()).issues).toEqual([]);
    const noWidth = source({ mechanisms: inventory({ exits: [{ kind: "ordinary", frozen: 0, star: false }] }) });
    expect(auditRevisedCandidate(input, noWidth).issues).toEqual([]);
  });

  it("applies the approved Lv26 ordinary-exit redesign only to an identified Lv26 source, retaining frozen values", () => {
    const input = candidate({ id: 26, gates: [...candidate().gates,
      { id: "ice5", color: "blue", side: "bottom", offset: 0, size: 1, frozen: 5 },
      { id: "ice9", color: "green", side: "bottom", offset: 1, size: 1, frozen: 9 },
      { id: "ice14", color: "yellow", side: "bottom", offset: 2, size: 1, frozen: 14 },
    ] });
    const truth = source({ levelId: 26, mechanisms: inventory({ exits: [
      ...Array.from({ length: 8 }, () => exit()), ...[5, 9, 14].map((frozen) => exit(1, { frozen })),
    ] }) });
    const unchanged = structuredClone(truth);
    expect(auditRevisedCandidate(input, truth).issues).toEqual([]);
    expect(truth).toEqual(unchanged);
    expect(issueCodes({ ...input, id: 27 }, truth)).toContain("source-exit-colour-capacity");
    expect(issueCodes(input, { ...truth, levelId: undefined })).toContain("source-exit-colour-capacity");
    const wrongIce = structuredClone(input);
    wrongIce.gates[1].frozen = 6;
    expect(issueCodes(wrongIce, truth)).toContain("source-mechanism-mismatch");
    const tooMany = structuredClone(input);
    tooMany.gates.push(...["orange", "purple", "pink", "cyan", "red"].map((color, offset) => ({
      id: `added-${color}`, side: "top" as const, color: color as BlockSpec["color"], offset, size: 1,
    })));
    expect(issueCodes(tooMany, truth)).toContain("lv26-ordinary-exit-range");
    input.gates.shift();
    expect(issueCodes(input, truth)).toContain("lv26-ordinary-exit-range");
  });

  it("retains each shutter count/cohort pairing and permits record reordering only as a pair", () => {
    const input = candidate({ shutters: [
      { id: "a", x: 2, y: 1, width: 1, height: 2, count: 9 },
      { id: "b", x: 4, y: 1, width: 1, height: 1, count: 12 },
    ], blocks: [piece("opening", 0, 2), piece("a1", 2, 1, "red", { shutterId: "a" }),
      piece("a2", 2, 2, "red", { shutterId: "a" }), piece("b1", 4, 1, "red", { shutterId: "b" })] });
    const truth = source({ fullBlockCount: 4, mechanisms: inventory({ shutterClearCounts: [9, 12], shutterHiddenBatchCounts: [2, 1] }) });
    expect(auditRevisedCandidate(input, truth).issues).toEqual([]);
    truth.mechanisms.shutterClearCounts = [12, 9];
    truth.mechanisms.shutterHiddenBatchCounts = [1, 2];
    expect(auditRevisedCandidate(input, truth).issues).toEqual([]);
    truth.mechanisms.shutterHiddenBatchCounts = [2, 1];
    expect(issueCodes(input, truth)).toContain("source-mechanism-mismatch");
    truth.mechanisms.shutterHiddenBatchCounts = [2];
    expect(issueCodes(input, truth)).toContain("incomplete-source-inventory");
  });

  it("checks every layer for an appropriately coloured star/axis/full-width compatible mouth", () => {
    expect(issueCodes(candidate({ blocks: [piece("shell", 0, 2, "red", { layers: ["red", "blue"] })] }),
      source({ mechanisms: inventory({ shellBlocks: 1 }) }))).toContain("missing-compatible-exit");
    expect(issueCodes(candidate({ blocks: [piece("star", 0, 2, "red", { star: true })] }),
      source({ mechanisms: inventory({ starBlocks: 1 }) }))).toContain("missing-compatible-exit");
    expect(issueCodes(candidate({ blocks: [piece("axis", 0, 2, "red", { movementAxis: "vertical" })] }),
      source({ mechanisms: inventory({ axisVerticalBlocks: 1 }) }))).toContain("missing-compatible-exit");
    expect(issueCodes(candidate({ gates: [{ id: "red", side: "bottom", offset: 2, size: 1, color: "red" }],
      blocks: [piece("tee", 1, 3, "red", { shape: [[0, 0], [1, 0], [2, 0], [1, 1]] })] }))).toContain("missing-compatible-exit");
  });

  it("does not certify an axis mouth at an unreachable tangent offset", () => {
    const input = candidate({ gates: [{ id: "red", side: "left", offset: 0, size: 1, color: "red" }],
      blocks: [piece("arrow", 0, 2, "red", { movementAxis: "horizontal" })] });
    expect(issueCodes(input, source({ mechanisms: inventory({ axisHorizontalBlocks: 1 }) }))).toContain("missing-compatible-exit");
  });

  it("rejects same-colour orthogonal opening adjacency for arbitrary shapes, not only single cells", () => {
    const input = candidate({
      gates: [{ id: "red", side: "left", offset: 1, size: 3, color: "red" }],
      blocks: [piece("h2", 0, 1, "red", { shape: [[0, 0], [1, 0]] }), piece("single", 1, 2)],
    });
    const result = auditRevisedCandidate(input, source({ fullBlockCount: 2, openingBlockCount: 2, mechanisms: inventory({ exits: [exit(3)] }) }));
    expect(result.issues.map(({ code }) => code)).toEqual(["opening-same-colour-adjacency"]);
    expect(result.issues[0]).toMatchObject({ blockId: "h2", otherBlockId: "single" });
  });

  it.each([NaN, Infinity, 2.5, 0, -1])("fails closed before board allocation for invalid dimension %s", (dimension) => {
    const result = auditRevisedCandidate(candidate({ width: dimension }), source());
    expect(result.staticPassed).toBe(false);
    expect(result.issues.map(({ code }) => code)).toContain("invalid-board-dimensions");
    expect(result.measurements.openingBlockCount).toBeUndefined();
  });

  it("rejects serialized unknown block/layer/grid/exit colours and over-capacity source/physical apertures", () => {
    const serialized = JSON.parse(JSON.stringify(candidate())) as LevelSpec;
    Object.assign(serialized.blocks[0], { color: "black", layers: ["black", "white"] });
    Object.assign(serialized.gates[0], { color: "black" });
    serialized.coloredGrids = JSON.parse('[{"id":"unknown-grid","color":"silver","cells":[[4,4]]}]');
    expect(issueCodes(serialized)).toEqual(expect.arrayContaining(["unknown-block-colour", "unknown-grid-colour", "unknown-exit-colour"]));
    const many = candidate({ gates: [{ id: "many", side: "top", offset: 0, size: 1, color: "red",
      portals: [0, 1, 2, 3, 4].map((x) => ({ side: "top" as const, origin: [x, 0] as Point, size: 1 }))
        .concat([0, 1, 2, 3].map((x) => ({ side: "bottom" as "top", origin: [x, 4] as Point, size: 1 }))) }] });
    const result = issueCodes(many, source({ mechanisms: inventory({ exits: Array.from({ length: 9 }, () => exit()) }) }));
    expect(result).toContain("exit-colour-capacity");
    expect(result).toContain("source-exit-colour-capacity");
  });

  it("requires independent hidden-batch quotas for covers rather than equating count with hidden cargo", () => {
    const input = candidate({ shutters: [{ id: "cover", x: 2, y: 2, width: 1, height: 1, count: 5 }],
      blocks: [piece("opening", 0, 2), piece("hidden", 2, 2, "red", { shutterId: "cover" })] });
    const truth = source({ fullBlockCount: 2, mechanisms: inventory({ shutterClearCounts: [5], shutterHiddenBatchCounts: [2] }) });
    expect(auditRevisedCandidate(input, truth).issues).toContainEqual(expect.objectContaining({
      code: "source-mechanism-mismatch", message: expect.stringContaining("shutterHiddenBatchCounts"),
    }));
  });

  it("does not erase an irregular-board mechanism by replacing the source with a plain rectangle", () => {
    expect(issueCodes(candidate({ playable: rectangle() }))).toContain("irregular-board-mechanism-lost");
  });
});
