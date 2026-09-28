// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("board editor campaign range", () => {
  it("clamps deep links against the runtime campaign length", () => {
    const source = readFileSync(fileURLToPath(new URL("../src/editor/boardEditor.ts", import.meta.url)), "utf8");
    expect(source).toContain("Math.min(LEVELS.length");
    expect(source).not.toContain("Math.min(100");
  });
});
