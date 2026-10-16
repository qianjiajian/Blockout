#!/usr/bin/env node
/**
 * Independent daily-challenge slot proof pipeline.
 *
 * A slot is accepted only when all of the following are bound to the same
 * derived LevelSpec and layout hash:
 *   1. validateLevel() succeeds;
 *   2. an authoritative PuzzleModel witness is found and replayed to
 *      completion from a fresh model;
 *   3. checkRevisedRepositionFloor() exhausts every state below the required
 *      floor in its documented cost-non-increasing relaxation.
 *
 * The relaxation is deliberately reported in the output. It proves a lower
 * bound on necessary non-clearing drags, not pointer/timing solvability; the
 * independent route replay supplies the latter spatial witness. Unsupported,
 * timed-out and invalid slots remain pending and can never be promoted by
 * this tool.
 *
 * Input JSON is intentionally flexible so the generator can provide either
 * {slots:[{formalId,level,...}]} or {slots:[{formalId,sourceLevelId,...}]}.
 * When only sourceLevelId is present the current daily variant derivation is
 * used. The output is deterministic apart from generatedAt.
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { build } from "esbuild";
import { basename, resolve } from "node:path";

const DEFAULT_INPUT = "deliverables/daily-challenge-independent-20261005/candidates.json";
const DEFAULT_OUTPUT = "deliverables/daily-challenge-independent-20261005/proof-report.json";

const parseArgs = (argv) => {
  const args = { input: DEFAULT_INPUT, output: DEFAULT_OUTPUT, limit: 0, sourceLevel: 0 };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--input") args.input = argv[++i];
    else if (token === "--output") args.output = argv[++i];
    else if (token === "--limit") args.limit = Number(argv[++i]);
    else if (token === "--source-level") args.sourceLevel = Number(argv[++i]);
    else if (token === "--help" || token === "-h") {
      console.log("Usage: node tools/daily-challenge/proof-independent-slots.mjs [--input candidates.json] [--output report.json] [--limit N]");
      process.exit(0);
    } else throw new Error(`Unknown argument: ${token}`);
  }
  if (!Number.isSafeInteger(args.limit) || args.limit < 0) throw new Error("--limit must be a non-negative integer");
  if (!Number.isSafeInteger(args.sourceLevel) || args.sourceLevel < 0) throw new Error("--source-level must be a non-negative integer");
  return args;
};

const bundleRuntime = async () => {
  const bundle = await build({
    stdin: {
      resolveDir: process.cwd(),
      loader: "ts",
      contents: [
        'export { LEVELS } from "./src/core/levels.ts";',
        'export { deriveDailyChallengeLevel, buildIndependentDailyChallengeLevel, dailyChallengeLayoutHash } from "./src/core/dailyChallengeVariant.ts";',
        'export { validateLevel, PuzzleModel } from "./src/core/PuzzleModel.ts";',
        'export { searchRevisedLevel, replayRevisedRoute } from "./src/core/revisedLevelSearch.ts";',
        'export { checkRevisedRepositionFloor, checkSeamSeparatedChamberFloor } from "./src/core/revisedRepositionFloor.ts";',
      ].join("\n"),
    },
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
    logLevel: "silent",
  });
  return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const digestLevel = (runtime, level) => sha256(runtime.dailyChallengeLayoutHash(level));

const asArray = (value, label) => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
};

const readSlots = async (filename) => {
  const document = JSON.parse(await readFile(filename, "utf8"));
  const slots = Array.isArray(document)
    ? document
    : document.slots
      ?? document.candidates
      ?? (document.stages ?? []).flatMap((stage) => Object.entries(stage.difficulties ?? {})
        .flatMap(([difficulty, bucket]) => (bucket.candidates ?? []).map((candidate) => ({
          ...candidate,
          stageKey: stage.stageKey,
          difficulty: Number(difficulty),
        }))));
  asArray(slots, `${filename}.slots`);
  return { document, slots };
};

/**
 * Resolve a slot to the exact immutable LevelSpec that will be proved.
 * Embedded levels are accepted only when a formal id exists; source-only rows
 * are derived through the same function used by daily runtime assignments.
 */
export const resolveSlotLevel = (runtime, slot) => {
  const formalId = String(slot.formalId ?? slot.id ?? "");
  if (!formalId) throw new Error("slot.formalId is required");
  const candidate = slot.level ?? slot.derivedLevel;
  const source = candidate ?? runtime.LEVELS.find((level) => level.id === Number(slot.sourceLevelId));
  if (!source) throw new Error(`${formalId}: sourceLevelId ${String(slot.sourceLevelId)} not found`);
  const rawDifficulty = slot.difficulty ?? slot.dailyDifficultyId ?? slot.dailyDifficulty;
  const difficulty = typeof rawDifficulty === "string"
    ? ({ "难": 1, "超难": 2, "超超难": 3 }[rawDifficulty] ?? Number(rawDifficulty))
    : Number(rawDifficulty);
  const level = candidate
    ? structuredClone(candidate)
    : slot.layoutFactory === "seam-chambers-v1" && typeof runtime.buildIndependentDailyChallengeLevel === "function"
      ? runtime.buildIndependentDailyChallengeLevel(source, formalId, difficulty === 1 || difficulty === 2 || difficulty === 3 ? difficulty : 3)
      : runtime.deriveDailyChallengeLevel(source, formalId);
  return { formalId, level };
};

const positive = (value, fallback) => {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < 1) throw new Error("proof budgets must be positive safe integers");
  return result;
};

export const budgetsFor = (slot) => ({
  route: {
    maxStates: positive(slot.budget?.route?.maxStates, 100_000),
    maxDragStates: positive(slot.budget?.route?.maxDragStates, 4_096),
    maxTransitions: positive(slot.budget?.route?.maxTransitions, 3_000_000),
    maxMilliseconds: positive(slot.budget?.route?.maxMilliseconds, 15_000),
  },
  lower: {
    maxStates: positive(slot.budget?.lower?.maxStates, 100_000),
    maxDragStates: positive(slot.budget?.lower?.maxDragStates, 10_000),
    maxTransitions: positive(slot.budget?.lower?.maxTransitions, 3_000_000),
    maxMilliseconds: positive(slot.budget?.lower?.maxMilliseconds, 15_000),
  },
});

const requiredFloorFor = (slot) => {
  const rawDifficulty = slot.difficulty ?? slot.dailyDifficultyId ?? slot.dailyDifficulty;
  const difficulty = typeof rawDifficulty === "string"
    ? ({ "难": 1, "超难": 2, "超超难": 3 }[rawDifficulty] ?? Number(rawDifficulty))
    : Number(rawDifficulty);
  const explicit = slot.requiredFloor ?? slot.requiredLowerBound ?? slot.minimumRepositionMoves;
  if (!Number.isSafeInteger(Number(explicit)) || Number(explicit) < 1) {
    throw new Error(`${slot.formalId ?? slot.id}: requiredFloor must be a positive integer; metadata omission is not a proof target`);
  }
  const floor = Number(explicit);
  // The user-facing D3 rule is strictly >30, therefore a D3 slot needs the
  // 31-floor even if an old source estimate is lower.
  if (difficulty === 3 && floor <= 30) return 31;
  return floor;
};

const summarizeSearch = (search) => ({
  status: search.status,
  termination: search.termination,
  witnessFound: search.witnessFound,
  exploredStates: search.exploredStates,
  discoveredStates: search.discoveredStates,
  attemptedTransitions: search.attemptedTransitions,
  reasons: search.reasons,
});

const summarizeReplay = (replay) => replay ? ({
  valid: replay.valid,
  complete: replay.complete,
  effectiveDrags: replay.effectiveDrags,
  nonClearingDrags: replay.nonClearingDrags,
  clearEvents: replay.clearEvents,
  error: replay.error,
}) : undefined;

const summarizeLower = (lower) => ({
  status: lower.status,
  termination: lower.termination,
  thresholdProven: lower.thresholdProven,
  floor: lower.floor,
  abstraction: lower.abstraction,
  hashBindingRequired: lower.hashBindingRequired,
  solvabilityValidated: lower.solvabilityValidated,
  pointerReplayValidated: lower.pointerReplayValidated,
  timeValidated: lower.timeValidated,
  exploredStates: lower.exploredStates,
  discoveredStates: lower.discoveredStates,
  attemptedTransitions: lower.attemptedTransitions,
  relaxedNonClearingDrags: lower.relaxedNonClearingDrags,
  composition: lower.composition ? {
    componentCount: lower.composition.componentCount,
    componentFloorSum: lower.composition.componentFloorSum,
    componentFloors: lower.composition.componentFloors,
  } : undefined,
  reasons: lower.reasons,
});

/** Prove one exact slot. No result is silently downgraded to PASS. */
export const proveSlot = (runtime, slot) => {
  const startedAt = Date.now();
  const result = {
    formalId: slot.formalId ?? slot.id,
    sourceLevelId: slot.sourceLevelId ?? null,
    difficulty: slot.difficulty ?? slot.dailyDifficultyId ?? null,
    status: "pending",
    lowerBound: null,
    route: null,
    hashBinding: null,
    reasons: [],
  };
  try {
    const { formalId, level } = resolveSlotLevel(runtime, slot);
    result.formalId = formalId;
    runtime.validateLevel(level);
    const layoutSha256 = digestLevel(runtime, level);
    result.hashBinding = { actual: layoutSha256, expected: slot.layoutSha256 ?? null, matched: !slot.layoutSha256 || slot.layoutSha256 === layoutSha256 };
    if (!result.hashBinding.matched) {
      result.status = "hash-mismatch";
      result.reasons.push("candidate hash does not bind to the exact LevelSpec being proved");
      return { ...result, elapsedMs: Date.now() - startedAt };
    }
    const floor = requiredFloorFor({ ...slot, formalId });
    const budgets = budgetsFor(slot);
    result.proofTargetFloor = floor;
    result.budget = budgets;
    // Static seam compositions carry an additive lower-bound certificate and
    // a concatenated exact route. A monolithic search would needlessly expand
    // the Cartesian product of independent chambers, so use the theorem
    // backed by per-component searches for this explicitly-authored layout.
    if (level.dailyProof?.kind === "seam-chambers-v1") {
      const lower = runtime.checkRevisedRepositionFloor(level, { floor, ...budgets.lower });
      result.lowerBound = summarizeLower(lower);
      const replay = lower.relaxedRoute?.length
        ? runtime.replayRevisedRoute(level, lower.relaxedRoute)
        : undefined;
      result.route = {
        status: lower.status === "threshold-proven" && replay?.valid && replay.complete ? "witness" : lower.status,
        termination: lower.termination,
        witnessFound: Boolean(replay?.valid && replay.complete),
        exploredStates: lower.exploredStates,
        discoveredStates: lower.discoveredStates,
        attemptedTransitions: lower.attemptedTransitions,
        reasons: lower.reasons,
        replay: summarizeReplay(replay),
      };
      if (lower.status === "threshold-proven" && replay?.valid && replay.complete && replay.nonClearingDrags >= floor) {
        result.status = "PASS";
        result.reasons.push("same-layout seam-component lower-bound sum and fresh concatenated route replay completed");
      } else {
        result.status = lower.status === "unsupported" ? "unsupported" : lower.status === "unknown" ? "unknown" : "route-failed";
        result.reasons.push("seam-component lower-bound certificate or fresh route replay did not complete");
        result.reasons.push(...(lower.reasons ?? []));
      }
      return { ...result, elapsedMs: Date.now() - startedAt };
    }
    const search = runtime.searchRevisedLevel(level, budgets.route);
    const route = summarizeSearch(search);
    let replay;
    if (search.witnessFound && search.drags?.length) replay = runtime.replayRevisedRoute(level, search.drags);
    route.replay = summarizeReplay(replay);
    result.route = route;
    if (!search.witnessFound || !replay?.valid || !replay.complete) {
      result.status = search.status === "unsupported" ? "unsupported" : "route-failed";
      result.reasons.push("fresh authoritative route replay did not complete");
      return { ...result, elapsedMs: Date.now() - startedAt };
    }
    const lower = runtime.checkRevisedRepositionFloor(level, { floor, ...budgets.lower });
    result.lowerBound = summarizeLower(lower);
    if (lower.status === "unsupported") result.status = "unsupported";
    else if (lower.status === "unknown") result.status = "unknown";
    else if (lower.status !== "threshold-proven") result.status = lower.status === "relaxed-shortcut" ? "lower-bound-failed" : "lower-bound-invalid";
    else if (replay.nonClearingDrags < floor) result.status = "route-below-floor";
    else {
      result.status = "PASS";
      result.reasons.push("same-layout fresh route replay completed and all relaxed states below floor were exhausted");
    }
    if (result.status !== "PASS") result.reasons.push(...(lower.reasons ?? []));
    return { ...result, elapsedMs: Date.now() - startedAt };
  } catch (error) {
    result.status = "invalid";
    result.reasons.push(error instanceof Error ? error.message : String(error));
    return { ...result, elapsedMs: Date.now() - startedAt };
  }
};

export const runProof = async ({ input = DEFAULT_INPUT, output = DEFAULT_OUTPUT, limit = 0, sourceLevel = 0 } = {}) => {
  const runtime = await bundleRuntime();
  const { document, slots: allSlots } = await readSlots(input);
  const filtered = sourceLevel ? allSlots.filter((slot) => Number(slot.sourceLevelId) === sourceLevel) : allSlots;
  const slots = limit ? filtered.slice(0, limit) : filtered;
  const results = slots.map((slot) => proveSlot(runtime, slot));
  const counts = Object.fromEntries([...new Set(results.map((row) => row.status))].sort().map((status) => [status, results.filter((row) => row.status === status).length]));
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: results.length > 0 && results.every((row) => row.status === "PASS") ? "PASS_INDEPENDENT_LOWER_BOUND_AND_ROUTE" : "PENDING_PROOF",
    input: resolve(input),
    inputSchema: document?.schemaVersion ?? null,
    slotCount: results.length,
    counts,
    budgets: {
      route: { maxStates: 100_000, maxDragStates: 4_096, maxTransitions: 3_000_000, maxMilliseconds: 15_000 },
      lower: { maxStates: 100_000, maxDragStates: 10_000, maxTransitions: 3_000_000, maxMilliseconds: 15_000 },
    },
    acceptance: {
      lowerBound: "checkRevisedRepositionFloor thresholdProven=true for the same layout hash and required floor",
      route: "searchRevisedLevel witness plus fresh replayRevisedRoute valid=true, complete=true",
      d3: "required floor is at least 31, so necessary reposition is proven >30",
      unsupportedOrUnknown: "never promoted; requires a qualified solver or a regenerated candidate",
    },
    results,
  };
  await mkdir(resolve(output, ".."), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
};

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}` || process.argv[1]?.endsWith("proof-independent-slots.mjs")) {
  try {
    const report = await runProof(parseArgs(process.argv.slice(2)));
    console.log(`${report.status}: ${report.slotCount} slot(s)`, report.counts);
    if (report.status !== "PASS_INDEPENDENT_LOWER_BOUND_AND_ROUTE") process.exitCode = 2;
  } catch (error) {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  }
}

