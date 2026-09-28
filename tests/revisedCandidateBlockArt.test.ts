import { describe, expect, it } from "vitest";
// @ts-ignore Offline visual-input guard; no production declaration dependency.
import { auditCandidateBlockArt } from "../tools/revised-candidate-block-art.mjs";

const block = (id: string, color: string, shape = [[0, 0]], extra = {}) => ({ id, color, shape, ...extra });

describe("candidate whole-block renderability is separate from spatial solvability", () => {
  it("accepts existing translated/rotated sprites and binds every shell/inner color", () => {
    const result = auditCandidateBlockArt({ blocks: [block("hidden-shell", "green", [[-1, 2], [0, 2]],
      { shutterId: "cover", frozen: 2, layers: ["green", "purple"] })] });
    expect(result.passed).toBe(true);
    expect(result.requirements.map((r: any) => [r.kind, r.color])).toEqual([["solid", "green"], ["solid", "purple"], ["shell", "green"]]);
    expect(result.requirements.every((r: any) => r.path.startsWith("assets/"))).toBe(true);
    expect(result.releaseApproved).toBe(false);
  });

  it("rejects the invisible 3 by 4 rectangle even though model geometry is valid", () => {
    const shape = Array.from({ length: 4 }, (_, y) => Array.from({ length: 3 }, (_, x) => [x, y])).flat();
    expect(auditCandidateBlockArt({ blocks: [block("large", "red", shape)] })).toMatchObject({ passed: false,
      issues: [{ code: "unsupported-rendered-shape", blockId: "large", cells: 12 }] });
  });

  it("rejects a shape/color pair with no sprite, including future hidden/queued cargo", () => {
    const shape = [[0, 0], [1, 0], [2, 0], [3, 0]];
    expect(auditCandidateBlockArt({ blocks: [block("future", "orange", shape, { shutterId: "later" })] }).passed).toBe(false);
    expect(auditCandidateBlockArt({ blocks: [block("future", "blue", shape)] }).passed).toBe(true);
  });

  it("does not accept a visible outer sprite when the actual shell or inner is unsupported", () => {
    const shape = [[0, 0], [1, 0], [2, 0], [3, 0]];
    const result = auditCandidateBlockArt({ blocks: [block("shell", "blue", shape, { layers: ["blue", "orange"] })] });
    expect(result.passed).toBe(false);
    expect(result.issues.map((issue: any) => issue.kind)).toEqual(["solid", "shell"]);
  });

  it.each([{}, { blocks: null }, { blocks: [null] }, { blocks: [{ shape: null }] },
    { blocks: [block("invalid", "__proto__")] }, { blocks: [block("invalid", "red", [[0, 0]], { layers: "red" })] },
    { blocks: [{ shape: [[0.5, 0]] }] }, { blocks: [{ shape: [null] }] }])("handles malformed input without replacing static validation: %j", (input) => {
    expect(auditCandidateBlockArt(input).passed).toBe(false);
  });
});
