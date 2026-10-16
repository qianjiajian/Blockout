// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createHash } from "node:crypto";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Point } from "../src/core/types";
import { GAME_ART } from "../src/game/artManifest";
import { matchFormalBlockShape } from "../src/game/formalBlockShapes";

const COLORS = {
  red: "红", blue: "蓝", green: "绿", yellow: "黄",
  purple: "紫", orange: "橙", pink: "粉", cyan: "浅蓝",
} as const;
const SHAPES = {
  13: { suffix: "rectangle-2x3", original: "2X3", columns: 2, rows: 3, width: 191, height: 296 },
  21: { suffix: "rectangle-3x2", original: "3X2", columns: 3, rows: 2, width: 285, height: 201 },
  14: { suffix: "square-3x3", original: "3X3", columns: 3, rows: 3, width: 285, height: 296 },
} as const;
type Color = keyof typeof COLORS;
type SupplementalShapeId = keyof typeof SHAPES;

interface SupplementalAsset {
  color: Color;
  shapeId: SupplementalShapeId;
  originalFile: string;
  source: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
}

interface ManifestAsset {
  key: string;
  source: string;
  runtime: string;
  width: number;
  height: number;
  alpha: boolean;
  grid: number[];
  transform: string;
  loadGroup?: string;
}

const ROOT = resolve(".");
const supplemental = JSON.parse(readFileSync(resolve(ROOT, "art-source/gameplay/blocks/supplemental-v1.json"), "utf8")) as {
  schemaVersion: number;
  sourceDirectory: string;
  transform: string;
  assets: SupplementalAsset[];
};
const manifest = JSON.parse(readFileSync(resolve(ROOT, "art-source/manifest.json"), "utf8")) as {
  assets: ManifestAsset[];
};
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const pngSize = (bytes: Uint8Array): { width: number; height: number } => {
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect([...bytes.subarray(12, 16)]).toEqual([73, 72, 68, 82]);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

describe("user-supplied supplemental whole-block art", () => {
  it("records exactly the eight colors and three supplied native rectangle shapes", () => {
    expect(supplemental.schemaVersion).toBe(1);
    expect(supplemental.transform).toBe("copy");
    expect(supplemental.sourceDirectory.replace(/\\/g, "/")).toBe(
      "C:/Users/Administrator/Desktop/block out/方块新/方块新",
    );
    const expected = Object.keys(COLORS).flatMap((color) => (
      Object.keys(SHAPES).map((shapeId) => `${color}:${shapeId}`)
    ));
    expect(supplemental.assets.map(({ color, shapeId }) => `${color}:${shapeId}`).sort()).toEqual(expected.sort());
    expect(new Set(supplemental.assets.map(({ source }) => source)).size).toBe(24);
    expect(new Set(supplemental.assets.map(({ originalFile }) => originalFile)).size).toBe(24);
  });

  it.each(supplemental.assets)("preserves $originalFile and loads its native $color shape $shapeId", (asset) => {
    const shape = SHAPES[asset.shapeId];
    const source = `gameplay/blocks/formal-v1/${asset.color}-${shape.suffix}.png`;
    expect(asset.source).toBe(source);
    expect(asset.originalFile).toBe(`${COLORS[asset.color]}${shape.original}.png`);
    expect({ width: asset.width, height: asset.height }).toEqual({ width: shape.width, height: shape.height });
    expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/);

    const entries = manifest.assets.filter((entry) => entry.source === source);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      key: `gameplay.formalBlock.${asset.color}-${shape.suffix}`,
      source,
      runtime: `../public/assets/art/${source}`,
      width: shape.width,
      height: shape.height,
      alpha: true,
      grid: [1, 1],
      transform: "copy",
      loadGroup: "formal-gameplay-current-level",
    });

    // The checked-in provenance pins the supplied PNG without requiring the
    // user's Desktop directory to remain available on every test machine.
    const sourceBytes = new Uint8Array(readFileSync(resolve(ROOT, "art-source", source)));
    const runtimeBytes = new Uint8Array(readFileSync(resolve(ROOT, "public/assets/art", source)));
    expect(sourceBytes.byteLength).toBe(asset.bytes);
    expect(runtimeBytes.byteLength).toBe(asset.bytes);
    expect(sha256(sourceBytes)).toBe(asset.sha256);
    expect(sha256(runtimeBytes)).toBe(asset.sha256);
    expect(pngSize(sourceBytes)).toEqual({ width: shape.width, height: shape.height });
    expect(pngSize(runtimeBytes)).toEqual({ width: shape.width, height: shape.height });

    const cells: Point[] = Array.from({ length: shape.columns * shape.rows }, (_, index) => (
      [index % shape.columns, Math.floor(index / shape.columns)] as const
    ));
    expect(matchFormalBlockShape(cells)).toMatchObject({
      shapeId: asset.shapeId,
      quarterTurns: 0,
      targetWidth: shape.columns,
      targetHeight: shape.rows,
      canonicalWidth: shape.columns,
      canonicalHeight: shape.rows,
    });
    expect(GAME_ART.gameplay.formalBlocks[asset.color].solid[asset.shapeId]).toBe(`assets/art/${source}`);
  });

  it("does not advertise the supplied solid rectangles as new shell artwork", () => {
    for (const color of Object.keys(COLORS) as Color[]) {
      for (const shapeId of Object.keys(SHAPES)) {
        expect(Object.prototype.hasOwnProperty.call(GAME_ART.gameplay.formalBlocks[color].shell, shapeId)).toBe(false);
      }
    }
  });
});
