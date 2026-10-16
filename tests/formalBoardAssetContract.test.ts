// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createHash } from "node:crypto";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GAME_ART } from "../src/game/artManifest";

const ROOT = resolve(".");
const COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"] as const;
const ORIENTATIONS = ["horizontal", "vertical"] as const;
const SIZES = [1, 2, 3] as const;

interface ManifestAsset {
  key: string;
  source: string;
  runtime: string;
  width: number;
  height: number;
  alpha: boolean;
  grid: [number, number];
  transform: string;
  loadGroup?: string;
}

const manifest = JSON.parse(readFileSync(resolve(ROOT, "art-source/manifest.json"), "utf8")) as {
  assets: ManifestAsset[];
};
const bySource = new Map(manifest.assets.map((asset) => [asset.source, asset]));

const uint32be = (bytes: Uint8Array, offset: number): number => (
  (bytes[offset] * 0x1000000)
  + (bytes[offset + 1] << 16)
  + (bytes[offset + 2] << 8)
  + bytes[offset + 3]
);

const pngSize = (contents: Uint8Array): { width: number; height: number } => {
  const signature = [...contents.subarray(0, 8)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (signature !== "89504e470d0a1a0a") throw new Error("Expected a PNG image");
  return { width: uint32be(contents, 16), height: uint32be(contents, 20) };
};

const sha256 = (contents: Uint8Array): string => createHash("sha256").update(contents).digest("hex");

const runtimeStrings = new Set<string>();
const collectRuntimeStrings = (value: unknown): void => {
  if (typeof value === "string") {
    runtimeStrings.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(collectRuntimeStrings);
    return;
  }
  if (value && typeof value === "object") Object.values(value).forEach(collectRuntimeStrings);
};
collectRuntimeStrings(GAME_ART.gameplay);

const expectCopiedAsset = (
  source: string,
  size: { width: number; height: number },
  { requireRuntimeApi = true }: { requireRuntimeApi?: boolean } = {},
): void => {
  const asset = bySource.get(source);
  expect(asset, `${source} manifest entry`).toMatchObject({
    source,
    runtime: `../public/assets/art/${source}`,
    ...size,
    alpha: true,
    grid: [1, 1],
    transform: "copy",
  });
  const sourceBytes = new Uint8Array(readFileSync(resolve(ROOT, "art-source", source)));
  const runtimeBytes = new Uint8Array(readFileSync(resolve(ROOT, "public/assets/art", source)));
  expect(pngSize(sourceBytes), `${source} source dimensions`).toEqual(size);
  expect(pngSize(runtimeBytes), `${source} runtime dimensions`).toEqual(size);
  expect(sha256(runtimeBytes), `${source} runtime bytes`).toBe(sha256(sourceBytes));
  if (requireRuntimeApi) {
    expect(runtimeStrings.has(`assets/art/${source}`), `${source} runtime API path`).toBe(true);
  }
};

const FROZEN_SOURCE_SHA256: Record<string, string> = {
  "ice-cell.png": "3d6a2222fceebf7e646b50217967ddc7c95b92a930ad6b511555d2a51ac0d9ec",
  "ice-horizontal-2.png": "d433f083b12c89762a83bceb4513f95477e88a19876e5e493df4fb4e6306613c",
  "ice-horizontal-3.png": "d806df805239aaae5962a167a057e62aab31437f59db7be2a41b9630396b2bfd",
  "ice-l-triomino.png": "120361b68d80351306584f621dce3217debefb45b41a190173351afa58da7650",
  "ice-s-tetromino.png": "dec964514adf73d543976e8b4f1a66cb8c720bd5776f2f3106c04504ae289bbe",
  "ice-square-2x2.png": "242a8b516cffbebf0c8d69e80c72530950af8f2d981be19da98b209c6dcdf356",
  "ice-t-tetromino.png": "8296bad2c901717b922b5c6918f20ab0eb7f489a0f9b9f5f7ad68df55b5a60d0",
  "ice-vertical-2.png": "984056f0bb06c4e649f6fc174821632312e7669e3cac36cf615c0561629e04cb",
  "ice-vertical-3.png": "abe27afd6dfb7048be351b8abe9a2f7c53e98ed0ec5a6b7765c36c8152d99ea4",
};

const FROZEN_RUNTIME_SHA256: Record<string, string> = {
  "ice-cell.png": "4659e614dc53c13adcd263273727f83f0e674d24654bb58ca0245dd4df63c3db",
  "ice-horizontal-2.png": "16b4cd8e4fc9e8f3f3401d40f6580bcafe57cc4e85995cfd629ac3d24a74e30d",
  "ice-horizontal-3.png": "c73808a55fc0048ebb70655b370dc64a71b21ad7b64a90e6fcdf0b6d5df92b23",
  "ice-l-triomino.png": "3d7ffa332218a0cf8b7a5ff0465836e69916ab54bbe55e8a9d32b32d2b56b10e",
  "ice-s-tetromino.png": "5b7f5a5220984a0d42321d0792f6e5359b8675c76e03818631b43cf08626d765",
  "ice-square-2x2.png": "5b733d00520100e9efc14c98825ac4fec14d2c867e75040ce3ff5963e9a40431",
  "ice-t-tetromino.png": "68f4d5a4ce39db32049800c798c544d5ac717a58c4d17454ab805347fc8ac12d",
  "ice-vertical-2.png": "d4f9dfbd681ac63f607825fb232518a8eefc63cf6721d2d3f701c89e960f9770",
  "ice-vertical-3.png": "d476a137e8a7eb52ad6a4675397ea65ff37ecd1a9b82c37b179d26e4bdc11904",
};

const expectPaletteFrozenAsset = (
  source: string,
  size: { width: number; height: number },
): number => {
  const asset = bySource.get(source);
  expect(asset, `${source} manifest entry`).toMatchObject({
    source,
    runtime: `../public/assets/art/${source}`,
    ...size,
    alpha: true,
    grid: [1, 1],
    transform: "png-palette-128-q85",
  });
  const file = source.split("/").at(-1)!;
  const sourceBytes = new Uint8Array(readFileSync(resolve(ROOT, "art-source", source)));
  const runtimeBytes = new Uint8Array(readFileSync(resolve(ROOT, "public/assets/art", source)));
  expect(pngSize(sourceBytes), `${source} source dimensions`).toEqual(size);
  expect(pngSize(runtimeBytes), `${source} runtime dimensions`).toEqual(size);
  expect(sha256(sourceBytes), `${source} supplied source SHA`).toBe(FROZEN_SOURCE_SHA256[file]);
  expect(sha256(runtimeBytes), `${source} deterministic runtime SHA`).toBe(FROZEN_RUNTIME_SHA256[file]);
  expect(runtimeBytes.byteLength, `${source} package compression`).toBeLessThan(sourceBytes.byteLength);
  return runtimeBytes.byteLength;
};

describe("replacement formal board artwork contract", () => {
  it("registers the 58 native rim/gate slices and six native ice slices without legacy stretch names", () => {
    const horizontal = {
      1: { width: 95, height: 67 },
      2: { width: 190, height: 67 },
      3: { width: 286, height: 67 },
    } as const;
    const vertical = {
      1: { width: 57, height: 109 },
      2: { width: 57, height: 204 },
      3: { width: 58, height: 299 },
    } as const;
    const expectedBorderSources = new Set<string>();
    for (const orientation of ORIENTATIONS) {
      for (const size of SIZES) {
        const dimensions = orientation === "horizontal" ? horizontal[size] : vertical[size];
        const neutral = `gameplay/board/formal-border-v2/neutral-${orientation}-${size}.png`;
        expectedBorderSources.add(neutral);
        expectCopiedAsset(neutral, dimensions);
        for (const color of COLORS) {
          const gate = `gameplay/board/formal-border-v2/gate-${color}-${orientation}-${size}.png`;
          expectedBorderSources.add(gate);
          expectCopiedAsset(gate, dimensions);
        }
      }
    }

    const corners = new Map<string, { width: number; height: number }>([
      ["corner-south-west.png", { width: 60, height: 68 }],
      ["corner-south-east.png", { width: 60, height: 68 }],
      ["corner-north-west.png", { width: 61, height: 69 }],
      ["corner-north-east.png", { width: 60, height: 69 }],
    ]);
    for (const [file, dimensions] of corners) {
      const source = `gameplay/board/formal-border-v2/${file}`;
      expectedBorderSources.add(source);
      expectCopiedAsset(source, dimensions);
    }

    const actualBorderSources = manifest.assets
      .map(({ source }) => source)
      .filter((source) => source.startsWith("gameplay/board/formal-border-v2/"));
    expect(new Set(actualBorderSources)).toEqual(expectedBorderSources);
    expect(actualBorderSources).toHaveLength(58);

    const iceDimensions = {
      horizontal: {
        1: { width: 94, height: 67 },
        2: { width: 190, height: 67 },
        3: { width: 285, height: 67 },
      },
      vertical: {
        1: { width: 58, height: 111 },
        2: { width: 58, height: 208 },
        3: { width: 58, height: 303 },
      },
    } as const;
    const expectedIceSources = new Set<string>();
    for (const orientation of ORIENTATIONS) {
      for (const size of SIZES) {
        const source = `gameplay/mechanics/formal-ice-v1/ice-${orientation}-${size}.png`;
        expectedIceSources.add(source);
        expectCopiedAsset(source, iceDimensions[orientation][size]);
      }
    }
    const actualIceSources = manifest.assets
      .map(({ source }) => source)
      .filter((source) => source.startsWith("gameplay/mechanics/formal-ice-v1/"));
    expect(new Set(actualIceSources)).toEqual(expectedIceSources);
    expect(actualIceSources).toHaveLength(6);
  });

  it("registers supplied block/shell bitmaps, the 24 supplemental rectangles, and remaining generated slots", () => {
    const solidDimensions = {
      "single.png": { width: 95, height: 104 },
      "vertical-2.png": { width: 95, height: 199 },
      "vertical-3.png": { width: 95, height: 294 },
      "horizontal-3.png": { width: 285, height: 104 },
      "horizontal-2.png": { width: 190, height: 104 },
      "l-triomino.png": { width: 190, height: 199 },
      "s-tetromino.png": { width: 285, height: 199 },
      "square-2x2.png": { width: 192, height: 199 },
    } as const;
    const shellDimensions = {
      "shell-single.png": { width: 95, height: 104 },
      "shell-vertical-2.png": { width: 95, height: 199 },
      "shell-vertical-3.png": { width: 95, height: 294 },
      "shell-horizontal-3.png": { width: 285, height: 104 },
      "shell-horizontal-2.png": { width: 190, height: 104 },
      "shell-square-2x2.png": { width: 192, height: 199 },
    } as const;
    const expectedSources = new Set<string>();
    for (const color of COLORS) {
      for (const [suffix, dimensions] of Object.entries(solidDimensions)) {
        const source = `gameplay/blocks/formal-v1/${color}-${suffix}`;
        expectedSources.add(source);
        expectCopiedAsset(source, dimensions);
      }
      const tTetromino = `gameplay/blocks/formal-v1/${color}-t-tetromino.png`;
      expectedSources.add(tTetromino);
      expectCopiedAsset(tTetromino, {
        width: 285,
        height: color === "orange" || color === "purple" ? 200 : 199,
      });
      for (const [suffix, dimensions] of Object.entries(shellDimensions)) {
        const source = `gameplay/blocks/formal-v1/${color}-${suffix}`;
        expectedSources.add(source);
        expectCopiedAsset(source, dimensions);
      }
    }
    expect(expectedSources.size).toBe(120);

    const lShapeDimensions = {
      l2: { width: 286, height: 197 },
      l1: { width: 284, height: 199 },
    } as const;
    const l1NarrowColors = new Set(["red", "yellow", "cyan"]);
    for (const color of COLORS) {
      const l2 = `gameplay/blocks/formal-v1/${color}-l-tetromino.png`;
      expectCopiedAsset(l2, lShapeDimensions.l2);
      const l1 = `gameplay/blocks/formal-v1/${color}-mirrored-l-tetromino.png`;
      expectCopiedAsset(l1, {
        width: l1NarrowColors.has(color) ? 283 : lShapeDimensions.l1.width,
        height: lShapeDimensions.l1.height,
      });
    }

    const temporarySources = new Set([
      ...COLORS.map((color) => `gameplay/blocks/formal-v1/${color}-l-tetromino.png`),
      ...COLORS.map((color) => `gameplay/blocks/formal-v1/${color}-mirrored-l-tetromino.png`),
      "gameplay/blocks/formal-v1/red-z-tetromino.png",
      "gameplay/blocks/formal-v1/blue-plus-pentomino.png",
      "gameplay/blocks/formal-v1/pink-plus-pentomino.png",
    ]);
    expect(temporarySources.size).toBe(19);
    for (const source of temporarySources) {
      expect(bySource.has(source), `${source} preserved manifest slot`).toBe(true);
      expect(runtimeStrings.has(`assets/art/${source}`), `${source} preserved runtime API path`).toBe(true);
    }
    const supplementalSources = new Set<string>();
    for (const color of COLORS) {
      for (const [suffix, width, height] of [
        ["rectangle-2x3", 191, 296], ["rectangle-3x2", 285, 201], ["square-3x3", 285, 296],
      ] as const) {
        const source = `gameplay/blocks/formal-v1/${color}-${suffix}.png`;
        supplementalSources.add(source);
        expectCopiedAsset(source, { width, height });
      }
    }
    expect(supplementalSources.size).toBe(24);
    const generatedParitySources = new Map<string, { width: number; height: number }>([
      ["gameplay/blocks/formal-v1/purple-z-tetromino.png", { width: 287, height: 191 }],
      ["gameplay/blocks/formal-v1/cyan-z-tetromino.png", { width: 287, height: 191 }],
      ["gameplay/blocks/formal-v1/purple-plus-pentomino.png", { width: 287, height: 285 }],
      ["gameplay/blocks/formal-v1/cyan-plus-pentomino.png", { width: 287, height: 285 }],
      ["gameplay/blocks/formal-v1/red-plus-pentomino.png", { width: 287, height: 285 }],
      ["gameplay/blocks/formal-v1/blue-horizontal-4.png", { width: 380, height: 104 }],
      ["gameplay/blocks/formal-v1/pink-horizontal-4.png", { width: 380, height: 104 }],
      ["gameplay/blocks/formal-v1/pink-t-pentomino.png", { width: 287, height: 294 }],
      ["gameplay/blocks/formal-v1/yellow-plus-pentomino-generated.png", { width: 287, height: 285 }],
      ["gameplay/blocks/formal-v1/green-plus-pentomino-generated.png", { width: 287, height: 285 }],
      ["gameplay/blocks/formal-v1/green-l-pentomino-generated.png", { width: 380, height: 199 }],
      ["gameplay/blocks/formal-v1/yellow-t-hexomino-generated.png", { width: 287, height: 389 }],
      ["gameplay/blocks/formal-v1/cyan-square-3x3-corner-notch-generated.png", { width: 287, height: 294 }],
    ]);
    for (const [source, dimensions] of generatedParitySources) {
      expectCopiedAsset(source, dimensions);
      expect(runtimeStrings.has(`assets/art/${source}`), `${source} generated runtime API path`).toBe(true);
    }

    const actualBlockSources = manifest.assets
      .map(({ source }) => source)
      .filter((source) => source.startsWith("gameplay/blocks/formal-v1/"));
    expect(new Set(actualBlockSources)).toEqual(new Set([
      ...expectedSources,
      ...temporarySources,
      ...supplementalSources,
      ...generatedParitySources.keys(),
    ]));
    expect(actualBlockSources).toHaveLength(176);
  });

  it("registers the official L1/L2 star-block overlays", () => {
    const expected = new Map([
      ["gameplay/mechanics/formal-star-v1/star-block-l-tetromino.png", { width: 286, height: 197, key: "gameplay.starBlock.lTetromino" }],
      ["gameplay/mechanics/formal-star-v1/star-block-mirrored-l-tetromino.png", { width: 284, height: 199, key: "gameplay.starBlock.mirroredLTetromino" }],
    ]);
    for (const [source, dimensions] of expected) {
      const asset = bySource.get(source);
      expect(asset, `${source} manifest entry`).toMatchObject({
        source,
        runtime: `../public/assets/art/${source}`,
        width: dimensions.width,
        height: dimensions.height,
        alpha: true,
        grid: [1, 1],
        transform: "png-palette-256-q95",
        loadGroup: "formal-star-overlays",
        key: dimensions.key,
      });
      expect(runtimeStrings.has(`assets/art/${source}`), `${source} runtime API path`).toBe(true);
      const sourceBytes = new Uint8Array(readFileSync(resolve(ROOT, "art-source", source)));
      const runtimeBytes = new Uint8Array(readFileSync(resolve(ROOT, "public/assets/art", source)));
      expect(pngSize(sourceBytes)).toEqual({ width: dimensions.width, height: dimensions.height });
      expect(pngSize(runtimeBytes)).toEqual({ width: dimensions.width, height: dimensions.height });
    }
  });

  it("registers nine supplied whole-shape frozen blocks with source and deterministic runtime contracts", () => {
    const frozenBlocks = new Map<string, { key: string; width: number; height: number; lazy: boolean }>([
      ["gameplay/mechanics/formal-gameplay-v1/ice-cell.png", { key: "gameplay.formalIceCell", width: 95, height: 104, lazy: false }],
      ["gameplay/mechanics/formal-gameplay-v1/ice-vertical-2.png", { key: "gameplay.formalIceVertical2", width: 95, height: 199, lazy: true }],
      ["gameplay/mechanics/formal-gameplay-v1/ice-vertical-3.png", { key: "gameplay.formalIceVertical3", width: 95, height: 294, lazy: true }],
      ["gameplay/mechanics/formal-gameplay-v1/ice-horizontal-2.png", { key: "gameplay.formalIceHorizontal2", width: 190, height: 104, lazy: true }],
      ["gameplay/mechanics/formal-gameplay-v1/ice-horizontal-3.png", { key: "gameplay.formalIceHorizontal3", width: 285, height: 104, lazy: true }],
      ["gameplay/mechanics/formal-gameplay-v1/ice-l-triomino.png", { key: "gameplay.formalIceLTriomino", width: 191, height: 199, lazy: true }],
      ["gameplay/mechanics/formal-gameplay-v1/ice-s-tetromino.png", { key: "gameplay.formalIceSTetromino", width: 285, height: 199, lazy: true }],
      ["gameplay/mechanics/formal-gameplay-v1/ice-t-tetromino.png", { key: "gameplay.formalIceTTetromino", width: 285, height: 199, lazy: true }],
      ["gameplay/mechanics/formal-gameplay-v1/ice-square-2x2.png", { key: "gameplay.formalIceSquare2x2", width: 192, height: 199, lazy: true }],
    ]);
    let runtimeBytes = 0;
    for (const [source, { key, width, height, lazy }] of frozenBlocks) {
      runtimeBytes += expectPaletteFrozenAsset(source, { width, height });
      expect(bySource.get(source)?.key, `${source} stable manifest key`).toBe(key);
      expect(bySource.get(source)?.loadGroup, `${source} load group`)
        .toBe(lazy ? "formal-gameplay-current-level" : undefined);
    }
    expect(runtimeBytes).toBe(104_562);
  });
});
