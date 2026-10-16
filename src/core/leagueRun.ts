import { PuzzleModel } from "./PuzzleModel";
import { startLeagueAttempt, collectLeagueSpecial, type LeagueAttempt, type LeagueState } from "./league";
import type { ExitResult, LevelSpec } from "./types";

/** A separate, in-memory challenge. Campaign progress and its run journal are
 * never used as league state; only a verified successful result is committed. */
export class LeagueRun {
  readonly model: PuzzleModel;
  attempt: LeagueAttempt;
  readonly specialIds: ReadonlySet<string>;
  completedMs?: number;

  constructor(state: LeagueState, index: number, level: LevelSpec, specialIds: readonly string[], now: number) {
    const inventory = new Set(level.blocks.map(block => block.id));
    if (new Set(specialIds).size !== specialIds.length || specialIds.some(id => !inventory.has(id))) {
      throw Error("Invalid league special-block inventory");
    }
    this.attempt = startLeagueAttempt(state, index, now);
    this.specialIds = new Set(specialIds);
    this.model = new PuzzleModel(level, { deferExitCompletion: true });
  }

  /** Receive only the actual PuzzleModel exit/removal result. Peeling a shell
   * is distinct from removing the complete block, including booster removal. */
  recordRemoval(result: ExitResult, now: number): void {
    if (!result.ok || result.layerRemoved || !result.blockId || this.model.getBlock(result.blockId)) return;
    if (this.specialIds.has(result.blockId)) this.attempt = collectLeagueSpecial(this.attempt, result.blockId);
    if (result.complete && this.completedMs === undefined) this.completedMs = now;
  }

  /** Undo may restore a scored piece. Remove its temporary points so a second
   * elimination does not multiply the same block's points. Nothing is banked. */
  reconcileUndo(): void {
    this.attempt = { ...this.attempt, specialIds: this.attempt.specialIds.filter(id => !this.model.getBlock(id)) };
    if (!this.model.snapshot().complete) this.completedMs = undefined;
  }

  discard(): void { this.attempt={...this.attempt,specialIds:[]};this.completedMs=undefined; }

  get provisionalPoints(): number { return this.attempt.specialIds.length * 10; }
  get successful(): boolean { return this.model.snapshot().complete && !this.model.snapshot().failed && this.completedMs !== undefined; }
}
