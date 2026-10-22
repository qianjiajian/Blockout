import { describe, expect, it } from "vitest";
// @ts-expect-error Node-only projection test; the application tsconfig targets browsers.
import { readFileSync } from "node:fs";
import { appendGooglePlayOverlayPath, fillGooglePlayOverlay, googlePlayOverlayBounds } from "../src/googlePlay/overlays";
// @ts-expect-error build-only JavaScript projection
import { instrumentGooglePlayOverlays } from "../tools/google-play-overlays-plugin.mjs";

describe("physical fullscreen overlays preserve authored focus/input coordinates", () => {
  for (const [width, height, scale, x, y] of [
    [540, 1200, 1.04, 12, 64], [589, 1278, 1.1, 22, 74],
    [480, 852, 0.75, 54, 21], [1152, 1536, 1.36, 239, 18],
  ]) it(`covers every physical edge ${width}x${height}`, () => {
    const rects: number[][] = [];
    const ctx = { canvas: { width, height },
      getTransform: () => ({ inverse: () => ({ a: 1 / scale, b: 0, c: 0, d: 1 / scale, e: -x / scale, f: -y / scale }) }),
      rect: (...args: number[]) => rects.push(args),
    } as unknown as CanvasRenderingContext2D;
    const r = googlePlayOverlayBounds(ctx);
    expect(r.x * scale + x).toBeCloseTo(0);
    expect(r.y * scale + y).toBeCloseTo(0);
    expect((r.x + r.width) * scale + x).toBeCloseTo(width);
    expect((r.y + r.height) * scale + y).toBeCloseTo(height);
    appendGooglePlayOverlayPath(ctx);
    expect(rects).toEqual([[r.x, r.y, r.width, r.height]]);
  });
  it("preserves opacity and restores the drawing transform for content after the dim", () => {
    let matrix = [1.2, 0, 0, 1.2, 24, 60], saved: number[] = [];
    const fills: unknown[] = [];
    const ctx = { canvas: { width: 540, height: 1200 }, globalAlpha: 0.61, fillStyle: "rgba(1,2,3,.7)",
      save() { saved = [...matrix]; }, restore() { matrix = saved; },
      setTransform(...args: number[]) { matrix = args; },
      fillRect(this: { globalAlpha: number; fillStyle: string }, ...args: number[]) { fills.push({ matrix: [...matrix], args, alpha: this.globalAlpha, color: this.fillStyle }); },
    } as unknown as CanvasRenderingContext2D;
    fillGooglePlayOverlay(ctx);
    expect(matrix).toEqual([1.2, 0, 0, 1.2, 24, 60]);
    expect(fills).toEqual([{ matrix: [1, 0, 0, 1, 0, 0], args: [0, 0, 540, 1200], alpha: 0.61, color: "rgba(1,2,3,.7)" }]);
  });
  it("projects the spotlight outer path but leaves its hole and event routing byte-identical", () => {
    const source = readFileSync("src/game/ColorEscapeGame.ts", "utf8").replace(/\r\n/g, "\n");
    const projected = instrumentGooglePlayOverlays(source, "ColorEscapeGame.ts");
    const part = (code: string, start: string, end: string) => code.slice(code.indexOf(start), code.indexOf(end, code.indexOf(start)));
    expect(part(projected, "  private featureGuideTargetRect(", "  private finishFeatureUnlockGuide(")).toBe(
      part(source, "  private featureGuideTargetRect(", "  private finishFeatureUnlockGuide("));
    expect(projected).toContain('ctx.beginPath(); __gpOverlayPath(ctx);\n    traceRoundedRect(ctx, hole.x, hole.y, hole.width, hole.height, 16);\n    ctx.fill("evenodd");');
    expect(part(projected, "  private drawBackground(", "  private withGameplayArtboard(")).toBe(
      part(source, "  private drawBackground(", "  private withGameplayArtboard("));
  });
  for (const name of ["playerProfileUi.ts", "leagueIntroUi.ts", "leagueUi.ts"]) it(`projects secondary dim in ${name}`, () => {
    const source = readFileSync(`src/game/${name}`, "utf8");
    const result = instrumentGooglePlayOverlays(source, name);
    expect(result).toContain("__gpFillOverlay(ctx);");
    if (name === "leagueUi.ts") expect(result).toContain('ctx.fillStyle="#6540f5";ctx.fillRect(0,0,496,1078);');
  });
});
