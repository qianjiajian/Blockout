// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canvasFont, normalizeCanvasFontWeight } from "../src/game/canvasTypography";

class StrictWechatFontContext {
  private currentFont = "10px sans-serif";

  get font(): string {
    return this.currentFont;
  }

  set font(value: string) {
    const match = /^(\d+) (\d+(?:\.\d+)?)px (.+)$/.exec(value);
    if (!match) return;
    const weight = Number(match[1]);
    if (weight < 100 || weight > 900 || weight % 100 !== 0) return;
    this.currentFont = value;
  }
}

describe("Canvas typography compatibility", () => {
  it("rounds numeric weights to supported 100-step values and clamps them to 100-900", () => {
    expect(normalizeCanvasFontWeight(40)).toBe(100);
    expect(normalizeCanvasFontWeight(749)).toBe(700);
    expect(normalizeCanvasFontWeight(750)).toBe(800);
    expect(normalizeCanvasFontWeight(850)).toBe(900);
    expect(normalizeCanvasFontWeight(900)).toBe(900);
    expect(normalizeCanvasFontWeight(950)).toBe(900);
    expect(normalizeCanvasFontWeight(1000)).toBe(900);
  });

  it("preserves the requested size and family in the generated font shorthand", () => {
    expect(canvasFont(1000, 43))
      .toBe('900 43px system-ui, "Microsoft YaHei", sans-serif');
    expect(canvasFont(950, 43, 'system-ui, "Microsoft YaHei", sans-serif'))
      .toBe('900 43px system-ui, "Microsoft YaHei", sans-serif');
    expect(canvasFont(400, 31.5, "Arial, sans-serif"))
      .toBe("400 31.5px Arial, sans-serif");
  });

  it("still applies the target size when a strict WeChat-like parser rejects weights above 900", () => {
    const context = new StrictWechatFontContext();

    context.font = '1000 43px system-ui, "Microsoft YaHei", sans-serif';
    expect(context.font).toBe("10px sans-serif");

    context.font = canvasFont(1000, 43, 'system-ui, "Microsoft YaHei", sans-serif');
    expect(context.font).toBe('900 43px system-ui, "Microsoft YaHei", sans-serif');
  });

  it("routes every game Canvas font assignment through the compatibility builder", () => {
    const source = readFileSync(resolve("src/game/ColorEscapeGame.ts"), "utf8");
    const assignments = source.match(/ctx\.font\s*=\s*[^;]+;/g) ?? [];

    // Guide descriptions and the optically centred timeout heading also
    // re-measure at a fitted font size for longer translations.
    expect(assignments).toHaveLength(6);
    assignments.forEach((assignment: string) => expect(assignment).toContain("canvasFont("));
  });
});
