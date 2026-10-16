// @ts-expect-error Node ambient types are intentionally excluded from the app tsconfig.
import assert from "node:assert/strict";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clonePlainData } from "../src/core/clonePlainData";
import { cloneDailyChallengeLevel, createDailyChallengeState, reconcileDailyChallengeState } from "../src/core/dailyChallenge";
import { LEVELS } from "../src/core/levels";
import {
  FORMAL_DAILY_CHALLENGE_CATALOG,
  getFormalDailyChallengeAssignments,
  getFormalDailyChallengeLevel,
} from "../src/core/formalDailyChallengeData";

const nativeClone = globalThis.structuredClone.bind(globalThis);
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function removeNativeClone() {
  vi.stubGlobal("structuredClone", undefined);
  Reflect.deleteProperty(globalThis, "structuredClone");
  expect("structuredClone" in globalThis).toBe(false);
}

function assertMutableDisjointGraph(source: unknown, result: unknown) {
  const originals = new WeakSet<object>();
  const collect = (value: unknown) => {
    if (value === null || typeof value !== "object" || originals.has(value)) return;
    originals.add(value);
    for (const key of Object.keys(value)) collect((value as Record<string, unknown>)[key]);
  };
  collect(source);
  const visited = new WeakSet<object>();
  const inspect = (value: unknown) => {
    if (value === null || typeof value !== "object" || visited.has(value)) return;
    assert.equal(originals.has(value), false, "a clone node must not alias any source node");
    assert.equal(Object.isFrozen(value), false, "all cloned nodes must be mutable");
    visited.add(value);
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      assert.equal(descriptor.writable, true);
      assert.equal(descriptor.configurable, true);
      inspect(descriptor.value);
    }
  };
  inspect(result);
}

describe("plain data cloning without host structuredClone", () => {
  it("preserves every supported primitive, including undefined, NaN and negative zero", () => {
    removeNativeClone();
    for (const value of [null, undefined, true, false, "", "荣耀联赛", 0, -0, NaN, Infinity, -Infinity, 123.5]) {
      expect(Object.is(clonePlainData(value), value)).toBe(true);
    }
  });

  it("thaws frozen nested data without sharing nodes or changing its source", () => {
    const source = Object.freeze({
      blocks: Object.freeze([Object.freeze({ cells: Object.freeze([1, 2]), score: 10 })]),
      optional: undefined,
    });
    const expected = nativeClone(source);
    removeNativeClone();
    const result = clonePlainData(source) as any;
    expect(result).toStrictEqual(expected);
    assertMutableDisjointGraph(source, result);
    result.blocks[0].cells.push(3);
    result.blocks[0].score = 20;
    result.blocks.push({ cells: [4], score: 30 });
    result.optional = "changed";
    expect(source).toStrictEqual(expected);
  });

  it("preserves shared references and cycles across arrays and objects", () => {
    const shared = { value: 10 };
    const source: any = { first: shared, second: shared, list: [shared] };
    source.self = source;
    source.list.push(source, source.list);
    Object.freeze(shared); Object.freeze(source.list); Object.freeze(source);
    removeNativeClone();
    const result = clonePlainData(source);
    expect(result.first).toBe(result.second);
    expect(result.list[0]).toBe(result.first);
    expect(result.self).toBe(result);
    expect(result.list[1]).toBe(result);
    expect(result.list[2]).toBe(result.list);
    assertMutableDisjointGraph(source, result);
    result.first.value = 20;
    expect(result.second.value).toBe(20);
    expect(shared.value).toBe(10);
  });

  it("keeps array holes distinct from explicit undefined and copies enumerable extra data", () => {
    const source = new Array(6) as any;
    source[1] = undefined;
    source[3] = { value: 4 };
    Object.defineProperty(source, "extra", { value: { score: 30 }, enumerable: true });
    Object.defineProperty(source, "hidden", { value: "not copied", enumerable: false });
    Object.freeze(source[3]); Object.freeze(source.extra); Object.freeze(source);
    removeNativeClone();
    const result = clonePlainData(source);
    expect(result.length).toBe(6);
    expect(Object.keys(result)).toEqual(["1", "3", "extra"]);
    expect(Object.hasOwn(result, "1")).toBe(true);
    expect(result[1]).toBeUndefined();
    for (const index of [0, 2, 4, 5]) expect(Object.hasOwn(result, index)).toBe(false);
    expect(Object.hasOwn(result, "hidden")).toBe(false);
    assertMutableDisjointGraph(source, result);
    result[0] = "filled"; result.push("last"); result.extra.score = 40;
    expect(source.length).toBe(6);
    expect(Object.hasOwn(source, "0")).toBe(false);
    expect(source.extra.score).toBe(30);
  });

  it("copies __proto__ as ordinary own data and normalizes null-prototype objects safely", () => {
    const source = Object.create(null);
    const shared = { polluted: true };
    Object.defineProperty(source, "__proto__", { value: shared, enumerable: true });
    source.other = shared;
    source.constructor = { prototype: { data: 1 } };
    Object.freeze(shared); Object.freeze(source);
    removeNativeClone();
    const result = clonePlainData(source);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.hasOwn(result, "__proto__")).toBe(true);
    expect(Object.getOwnPropertyDescriptor(result, "__proto__")).toMatchObject({ writable: true, enumerable: true, configurable: true });
    expect(result.__proto__).toBe(result.other);
    expect(result.__proto__).not.toBe(shared);
    expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
    expect(({} as any).polluted).toBeUndefined();
    assertMutableDisjointGraph(source, result);
  });

  it.each([
    ["function", () => 1], ["symbol", Symbol("unsupported")], ["bigint", 1n],
    ["Date", new Date(0)], ["Map", new Map()], ["Set", new Set()],
    ["RegExp", /x/], ["typed array", new Uint8Array([1])],
    ["class instance", new (class Example { value = 1; })()],
    ["custom prototype", Object.create({ inherited: 1 })],
  ])("rejects unsupported %s instead of silently changing its meaning", (_name, value) => {
    removeNativeClone();
    expect(() => clonePlainData(value)).toThrow(TypeError);
    expect(() => clonePlainData({ nested: [value] })).toThrow(TypeError);
  });

  it("rejects enumerable symbol keys and accessors without invoking a getter", () => {
    const getter = vi.fn(() => { throw new Error("getter must not run"); });
    const accessor = Object.defineProperty({}, "value", { enumerable: true, get: getter });
    removeNativeClone();
    expect(() => clonePlainData({ [Symbol("key")]: 1 })).toThrow(TypeError);
    expect(() => clonePlainData(accessor)).toThrow(TypeError);
    expect(getter).not.toHaveBeenCalled();
  });

  it("treats accessor-backed persisted daily pools as unavailable", () => {
    const state = createDailyChallengeState("2026-10-10", 200, LEVELS, 7);
    const assignment = { ...state.pools[1][0] };
    Object.defineProperty(assignment, "layoutSha256", { enumerable: true, get: () => "accessor" });
    const restored = reconcileDailyChallengeState({
      ...state,
      pools: { ...state.pools, 1: [assignment] },
    }, new Date("2026-10-10T12:00:00Z"), 200, LEVELS);
    expect(restored.pools[1]).toEqual([]);
  });
});

const formalCandidates = FORMAL_DAILY_CHALLENGE_CATALOG.flatMap(stage =>
  ([1, 2, 3] as const).flatMap(difficulty => {
    const assignments = getFormalDailyChallengeAssignments(stage.stageKey, difficulty)!;
    return stage.difficulties[difficulty].candidates.map((candidate, index) => ({
      ...candidate, assignment: assignments[index],
    }));
  }));

describe("all 450 frozen production daily levels match the native clone oracle", () => {
  it("covers all 450 distinct formal entries", () => {
    expect(formalCandidates).toHaveLength(450);
    expect(new Set(formalCandidates.map(candidate => candidate.formalId)).size).toBe(450);
  });

  it.each(formalCandidates.map(candidate => [candidate.formalId, candidate.level, candidate.assignment] as const))(
    "%s clones through the helper and both production queries without host structuredClone",
    (formalId, level, assignment) => {
      const expected = nativeClone(level);
      expect(Object.isFrozen(level)).toBe(true);
      removeNativeClone();
      const results = [clonePlainData(level), getFormalDailyChallengeLevel(formalId), cloneDailyChallengeLevel(assignment)];
      for (const result of results) {
        expect(result).toBeDefined();
        assert.deepStrictEqual(result, expected);
        assertMutableDisjointGraph(level, result);
      }
      for (let index = 0; index < results.length; index++) {
        for (let other = index + 1; other < results.length; other++) {
          assertMutableDisjointGraph(results[index], results[other]);
        }
        results[index]!.blocks[0].x += 1000 + index;
        assert.notDeepStrictEqual(results[index], expected);
      }
      assert.deepStrictEqual(getFormalDailyChallengeLevel(formalId), expected);
      assert.deepStrictEqual(cloneDailyChallengeLevel(assignment), expected);
      assert.deepStrictEqual(level, expected);
      expect(Object.isFrozen(level)).toBe(true);
    },
  );

  it("keeps explicit undefined and nested isolation in the custom pending source branch", () => {
    const source = nativeClone(formalCandidates[0].level);
    source.reward = 20;
    source.shutters = undefined;
    source.blocks[0].movementAxis = undefined;
    Object.freeze(source.blocks[0]);
    Object.freeze(source.blocks);
    Object.freeze(source);
    const expected = { ...nativeClone(source), reward: 0 };
    const assignment = { ...formalCandidates[0].assignment, proofStatus: "pending" as const };
    removeNativeClone();
    const result = cloneDailyChallengeLevel(assignment, [source])!;
    expect(result).toBeDefined();
    assert.deepStrictEqual(result, expected);
    assertMutableDisjointGraph(source, result);
    expect(Object.hasOwn(result, "shutters")).toBe(true);
    expect(result.shutters).toBeUndefined();
    expect(Object.hasOwn(result.blocks[0], "movementAxis")).toBe(true);
    expect(result.blocks[0].movementAxis).toBeUndefined();
    result.blocks[0].x += 1000;
    expect(source.blocks[0].x).toBe(expected.blocks[0].x);
    expect(source.reward).toBe(20);
  });

  it("preserves production rejection of unknown IDs and unbound assignments without the host API", () => {
    removeNativeClone();
    expect(getFormalDailyChallengeLevel("missing-formal-level")).toBeUndefined();
    expect(cloneDailyChallengeLevel({ ...formalCandidates[0].assignment, catalogRevision: "stale" })).toBeUndefined();
    expect(cloneDailyChallengeLevel({ ...formalCandidates[0].assignment, proofStatus: "pending" })).toBeUndefined();
  });
});
