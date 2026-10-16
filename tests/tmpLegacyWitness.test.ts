import { describe, it, expect } from "vitest";
import { LEVELS } from "../src/core/levels";
import { BASE_STANDARD_SOLUTIONS } from "../src/core/solutions";
import { PuzzleModel } from "../src/core/PuzzleModel";

describe("legacy witness", () => {
  it("replay", () => {
    const ids = LEVELS.filter((l) => !l.mechanismRules).map((l) => l.id);
    const out = [];
    for (const id of ids) {
      const level = LEVELS.find((x) => x.id === id)!;
      const model = new PuzzleModel(structuredClone(level));
      model.startCountdown();
      let non = 0;
      let clear = 0;
      let ok = true;
      let note = "";
      const actions = BASE_STANDARD_SOLUTIONS[id] ?? [];
      for (const action of actions) {
        const before = model.snapshot();
        model.beginAction();
        const accepted = action.type === "move"
          ? model.moveBlockStep(action.blockId, action.x, action.y)
          : model.tryExit(action.blockId, action.side).ok;
        const committed = model.commitAction();
        const after = model.snapshot();
        if (!accepted || !committed) {
          ok = false;
          note = note || JSON.stringify({ action, accepted, committed, active: after.blocks.map((b) => b.id) });
          break;
        }
        if (after.cleared > before.cleared) clear += after.cleared - before.cleared;
        else non += 1;
      }
      const snapshot = model.snapshot();
      const row = { id, actions: actions.length, ok, complete: snapshot.complete, clear, non, remaining: snapshot.blocks.length, note };
      console.log(JSON.stringify(row));
      out.push(row);
    }
    expect(out.length).toBe(ids.length);
  });
});
