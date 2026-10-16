import { afterEach, describe, expect, it, vi } from "vitest";
import { LEVELS, getLevel } from "../src/core/levels";
import { PuzzleModel } from "../src/core/PuzzleModel";
import type { LevelSpec, PuzzleSnapshot } from "../src/core/types";
import { BoardGeometryCache, visibleFlipDoorsOnRim } from "../src/game/BoardGeometryCache";
import * as boardRim from "../src/game/boardRim";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import type { GeneratorRimGeometry } from "../src/game/generatorRimGeometry";

const clone = <T>(value: T): T => structuredClone(value);
const geometryFor = (level: LevelSpec) => {
  const game = Object.create(ColorEscapeGame.prototype) as any;
  game.model = { level };
  return (generator: PuzzleSnapshot["generators"][number]): GeneratorRimGeometry => game.generatorRimGeometry(generator);
};

/** The uncached drawBoard pipeline; its pure builders remain unchanged. */
const uncached = (
  snapshot: PuzzleSnapshot,
  geometry: ReturnType<typeof geometryFor>,
  hasSpawn: (id: string) => boolean = () => false,
) => {
  const doors = visibleFlipDoorsOnRim(snapshot);
  const generators = snapshot.generators
    .filter(generator => generator.remaining > 0 || hasSpawn(generator.id))
    .map(generator => ({ mount: generator.rimMount ?? "rim", geometry: geometry(generator) }));
  return boardRim.buildBoardRimLayout(snapshot.playable, snapshot.blocked, snapshot.width, snapshot.height,
    [...snapshot.gates, ...doors], generators.flatMap(({ mount, geometry }) => mount === "rim" ? geometry.reservedRails : []), snapshot.seams);
};

const generatorFixture = (): LevelSpec => ({
  id: 980, name: "geometry final cargo fixture", difficulty: "normal", reward: 0, timeSeconds: 180,
  mechanismRules: "revised-2026-09-27-v1.5", width: 4, height: 4,
  gates: [{ id: "red-bottom", color: "red", side: "bottom", offset: 0, size: 1 }],
  generators: [{ id: "machine", side: "right", offset: 1, spawn: [3, 1], queueBlockIds: ["cargo"] }],
  blocks: [
    { id: "blocker", x: 3, y: 1, color: "yellow", shape: [[0, 0]] },
    { id: "spare", x: 0, y: 3, color: "red", shape: [[0, 0]] },
    { id: "cargo", x: 3, y: 1, color: "blue", shape: [[0, 0]] },
  ],
});

afterEach(() => vi.restoreAllMocks());

describe("single-board geometry cache", () => {
  it("matches the complete uncached rim, floor and visible doors of all 200 formal openings", () => {
    const cache = new BoardGeometryCache();
    for (const level of LEVELS) {
      const model = new PuzzleModel(level);
      const snapshot = model.snapshot(), before = clone(snapshot), geometry = geometryFor(level);
      const result = cache.read(level, snapshot, () => false, geometry);
      expect(result.rim, `Lv${level.id} rim`).toEqual(uncached(snapshot, geometry));
      expect(result.visibleFlipDoors, `Lv${level.id} flip doors`).toEqual(visibleFlipDoorsOnRim(snapshot));
      const playable = new Set(snapshot.playable.map(([x, y]) => `${x},${y}`));
      const blocked = new Set(snapshot.blocked.map(([x, y]) => `${x},${y}`));
      for (let y = -1; y <= snapshot.height; y++) for (let x = -1; x <= snapshot.width; x++) {
        expect(result.isFloor(x, y), `Lv${level.id} floor ${x},${y}`).toBe(playable.has(`${x},${y}`) && !blocked.has(`${x},${y}`));
      }
      const warm = cache.read(level, model.snapshot(), () => false, geometry);
      expect(warm.rim).toBe(result.rim);
      expect(warm.isFloor).toBe(result.isFloor);
      expect(snapshot).toEqual(before);
    }
  });

  it("preserves seams and partial portal priority while reading fresh door state", () => {
    const snapshot = new PuzzleModel(generatorFixture()).snapshot();
    snapshot.generators = [];
    snapshot.seams = [{ orientation: "vertical", offset: 2, start: 0, size: 4 }];
    snapshot.gates = [{ id: "fixed", side: "top", offset: 0, size: 1, color: "red", frozen: 4,
      portals: [{ side: "top", origin: [0, 0], size: 1 }] }];
    snapshot.flipDoors = [{ id: "flip", side: "top", offset: 0, size: 1, color: "blue", frozen: 2,
      open: false, initiallyOpen: false, portals: [
        { side: "top", origin: [0, 0], size: 1 },
        { side: "left", origin: [2, 0], size: 3 },
        { side: "bottom", origin: [0, 3], size: 2 },
      ] }];
    snapshot.blocked = [[3, 3]];
    const cache = new BoardGeometryCache(), owner = {}, geometry = geometryFor(generatorFixture());
    const cold = cache.read(owner, snapshot, () => false, geometry);
    expect(cold.rim).toEqual(uncached(snapshot, geometry));
    expect(cold.visibleFlipDoors[0].portals).toEqual(snapshot.flipDoors[0].portals!.slice(1));
    const next = clone(snapshot);
    next.flipDoors[0].open = true;
    next.flipDoors[0].frozen = 0;
    next.gates[0].frozen = 0;
    const warm = cache.read(owner, next, () => false, geometry);
    expect(warm.rim).toBe(cold.rim);
    expect(warm.visibleFlipDoors).toEqual(visibleFlipDoorsOnRim(next));
    expect(warm.visibleFlipDoors[0]).toMatchObject({ open: true, frozen: 0 });
    expect(cold.visibleFlipDoors[0]).toMatchObject({ open: false, frozen: 2 });
    // The frame's projected portal array cannot poison the retained plan.
    warm.visibleFlipDoors[0].portals![0].origin = [99, 99];
    expect(cache.read(owner, next, () => false, geometry).visibleFlipDoors).toEqual(visibleFlipDoorsOnRim(next));
  });

  it.each([false, true])("holds final cargo rails until the real spawn sampler finishes, and restores them on undo (reduced=%s)", reducedMotion => {
    const level = generatorFixture(), model = new PuzzleModel(level), geometry = geometryFor(level);
    const game = Object.assign(Object.create(ColorEscapeGame.prototype), {
      model, save: { reducedMotion }, generatorSpawnAnimations: [], revisedTransitions: [], scheduleFrame: vi.fn(),
    }) as any;
    const hasSpawn = (id: string) => game.activeGeneratorSpawn(id) != null;
    const cache = new BoardGeometryCache();
    const before = model.snapshot();
    const initial = cache.read(level, before, hasSpawn, geometry);
    expect(initial.rim.deviceRails).toHaveLength(3);
    model.beginAction();
    expect(model.moveBlockStep("blocker", 2, 1)).toBe(true);
    expect(model.commitAction()).toBe(true);
    const after = model.snapshot();
    expect(after.generators[0].remaining).toBe(0);
    game.captureGeneratorSpawns(before, after);
    const animation = game.generatorSpawnAnimations[0];
    expect(animation).toBeDefined();
    const duration = game.generatorSpawnVisualState(animation).durationSeconds;
    expect(cache.read(level, after, hasSpawn, geometry).rim).toBe(initial.rim);
    game.updateGeneratorSpawnAnimations(duration - 0.001);
    const tail = cache.read(level, model.snapshot(), hasSpawn, geometry);
    expect(tail.rim).toBe(initial.rim);
    expect(tail.rim).toEqual(uncached(model.snapshot(), geometry, hasSpawn));
    game.updateGeneratorSpawnAnimations(0.002);
    expect(game.generatorSpawnAnimations).toHaveLength(0);
    const empty = cache.read(level, model.snapshot(), hasSpawn, geometry);
    expect(empty.rim).not.toBe(initial.rim);
    expect(empty.rim.deviceRails).toEqual([]);
    expect(empty.rim).toEqual(uncached(model.snapshot(), geometry, hasSpawn));
    expect(model.undo()).toBe(true);
    const restored = cache.read(level, model.snapshot(), hasSpawn, geometry);
    expect(restored.rim).not.toBe(empty.rim);
    expect(restored.rim).toEqual(initial.rim);
  });

  it("keeps outboard devices off the rim and respects a local rotated rim anchor", () => {
    const level = generatorFixture(), snapshot = new PuzzleModel(level).snapshot();
    snapshot.generators[0].rimAnchor = { x: 1.5, y: 0, quarterTurns: 0 };
    snapshot.generators.push({ ...clone(snapshot.generators[0]), id: "outboard", rimMount: "outboard", remaining: 0 });
    const geometry = geometryFor(level), hasSpawn = (id: string) => id === "outboard";
    const cache = new BoardGeometryCache();
    const result = cache.read(level, snapshot, hasSpawn, geometry);
    expect(result.rim.deviceRails).toEqual(geometry(snapshot.generators[0]).reservedRails);
    expect(result.rim).toEqual(uncached(snapshot, geometry, hasSpawn));
    snapshot.generators[0].remaining = 0;
    const emptied = cache.read(level, snapshot, hasSpawn, geometry);
    expect(emptied.rim.deviceRails).toEqual([]);
    expect(emptied.rim).toEqual(uncached(snapshot, geometry, hasSpawn));
  });

  it("builds once across fresh frame snapshots, keeps only the current owner, and supports explicit invalidation", () => {
    const level = getLevel(171), model = new PuzzleModel(level), geometry = geometryFor(level);
    const build = vi.spyOn(boardRim, "buildBoardRimLayout");
    const cache = new BoardGeometryCache();
    const first = cache.read(level, model.snapshot(), () => false, geometry);
    for (let frame = 0; frame < 120; frame++) cache.read(level, model.snapshot(), () => false, geometry);
    expect(build).toHaveBeenCalledOnce();
    const sameIdNewOwner = { ...level };
    const second = cache.read(sameIdNewOwner, model.snapshot(), () => false, geometry);
    expect(second.rim).not.toBe(first.rim);
    expect(second.rim).toEqual(first.rim);
    const returned = cache.read(level, model.snapshot(), () => false, geometry);
    expect(returned.rim).not.toBe(first.rim);
    expect(build).toHaveBeenCalledTimes(3);
    cache.invalidate();
    const changed = model.snapshot();
    changed.blocked = [...changed.blocked, changed.playable[0]];
    expect(cache.read(level, changed, () => false, geometry).rim).toEqual(uncached(changed, geometry));
    expect(build).toHaveBeenCalledTimes(5); // one invalidated build, one independent reference
  });
});
