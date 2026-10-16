import { describe, expect, it } from "vitest";
import { LeagueRun } from "../src/core/leagueRun";
import { createLeague, finishLeagueAttempt } from "../src/core/league";
import type { LevelSpec } from "../src/core/types";

// Small event fixture only: not a shipped league map or difficulty evidence.
const fixture: LevelSpec = {
  id: 900001, name: "event fixture", difficulty: "easy", timeSeconds: 120, reward: 0,
  width: 2, height: 2,
  gates: [{ id: "red", color: "red", side: "left", offset: 0, size: 1 },
    { id: "blue", color: "blue", side: "right", offset: 0, size: 1 }],
  blocks: [{ id: "special", color: "red", layers: ["red", "blue"], x: 0, y: 0, shape: [[0, 0]] },
    { id: "ordinary", color: "blue", x: 1, y: 0, shape: [[0, 0]] }],
};
const now = 1_790_841_600_000;
describe("league scoring from actual PuzzleModel removals", () => {
  it("does not score shell peeling, counts complete booster removal once", () => {
    const state = createLeague(now, 123, 0), run = new LeagueRun(state, 1, fixture, ["special"], now);
    run.model.beginAction();const peel = run.model.tryExit("special", "left");run.model.commitAction();
    expect(peel.layerRemoved).toBe(true);run.recordRemoval(peel, now + 1);expect(run.provisionalPoints).toBe(0);
    run.model.beginAction();const removal = run.model.removeBlockWithBooster("special");run.model.commitAction();
    run.recordRemoval(removal, now + 2);run.recordRemoval(removal, now + 3);expect(run.provisionalPoints).toBe(10);
    expect(state.season.score).toBe(0);expect(run.successful).toBe(false);
    const ordinary = run.model.removeBlockWithBooster("ordinary");run.recordRemoval(ordinary, now + 4);
    expect(run.successful).toBe(true);expect(run.completedMs).toBe(now + 4);
    const settled = finishLeagueAttempt(state, run.attempt, run.successful, run.completedMs!);
    expect(settled.points).toBe(10);expect(settled.state.season.cleared).toEqual([1]);
    expect(finishLeagueAttempt(settled.state, run.attempt, true, now + 5).status).toBe("duplicate");
  });
  it("undo restores provisional points; removing again never doubles points", () => {
    const run = new LeagueRun(createLeague(now, 123, 0), 1, fixture, ["special"], now);
    run.model.beginAction();const removal = run.model.removeBlockWithBooster("special");run.model.commitAction();
    run.recordRemoval(removal, now + 1);expect(run.provisionalPoints).toBe(10);
    expect(run.model.undo()).toBe(true);run.reconcileUndo();expect(run.provisionalPoints).toBe(0);
    run.recordRemoval(run.model.removeBlockWithBooster("special"), now + 2);expect(run.provisionalPoints).toBe(10);
  });
  it("discards unsuccessful attempts and excludes a cross-period success", () => {
    const state = createLeague(now, 123, 0), run = new LeagueRun(state, 1, fixture, ["special"], now);
    run.recordRemoval(run.model.removeBlockWithBooster("special"), now + 1);
    expect(finishLeagueAttempt(state, run.attempt, false, now + 2).state.season.score).toBe(0);
    run.discard();expect(run.provisionalPoints).toBe(0);
    run.recordRemoval(run.model.removeBlockWithBooster("ordinary"), state.season.endMs);
    const result = finishLeagueAttempt(state, run.attempt, run.successful, run.completedMs!);
    expect(result.status).toBe("expired");expect(result.state.season.score).toBe(0);
  });
  it("rejects fake inventory and ignores failed/live block removal results", () => {
    const state = createLeague(now, 123, 0);
    expect(() => new LeagueRun(state, 1, fixture, ["missing"], now)).toThrow();
    const run = new LeagueRun(state, 1, fixture, ["special"], now);
    run.recordRemoval({ ok: false }, now + 1);
    run.recordRemoval({ ok: true, blockId: "special", complete: true }, now + 2);
    expect(run.provisionalPoints).toBe(0);expect(run.completedMs).toBeUndefined();
  });
});

