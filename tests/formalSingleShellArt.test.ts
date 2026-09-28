// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createHash } from "node:crypto";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { resolve } from "node:path";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { GAME_ART } from "../src/game/artManifest";

const COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"] as const;
const ROOT = resolve(".");

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

const uint32be = (bytes: Uint8Array, offset: number): number => (
  (bytes[offset] * 0x1000000)
  + (bytes[offset + 1] << 16)
  + (bytes[offset + 2] << 8)
  + bytes[offset + 3]
);

const chunkName = (bytes: Uint8Array, offset: number): string => String.fromCharCode(
  bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3],
);

const paeth = (left: number, up: number, upperLeft: number): number => {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  return upDistance <= upperLeftDistance ? up : upperLeft;
};

const decodeRgbaPng = (contents: Uint8Array): { width: number; height: number; pixels: Uint8Array } => {
  const signature = [...contents.subarray(0, 8)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (signature !== "89504e470d0a1a0a") throw new Error("Expected a PNG image");

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks: Uint8Array[] = [];
  for (let offset = 8; offset + 12 <= contents.length;) {
    const length = uint32be(contents, offset);
    const name = chunkName(contents, offset + 4);
    const dataStart = offset + 8;
    if (name === "IHDR") {
      width = uint32be(contents, dataStart);
      height = uint32be(contents, dataStart + 4);
      bitDepth = contents[dataStart + 8];
      colorType = contents[dataStart + 9];
      interlace = contents[dataStart + 12];
    } else if (name === "IDAT") {
      idatChunks.push(contents.subarray(dataStart, dataStart + length));
    }
    offset = dataStart + length + 4;
    if (name === "IEND") break;
  }
  if (!width || !height || bitDepth !== 8 || colorType !== 6 || interlace !== 0 || !idatChunks.length) {
    throw new Error(`Expected a non-interlaced 8-bit RGBA PNG, received ${width}x${height}, depth=${bitDepth}, type=${colorType}, interlace=${interlace}`);
  }

  const compressed = new Uint8Array(idatChunks.reduce((total, chunk) => total + chunk.length, 0));
  let compressedOffset = 0;
  for (const chunk of idatChunks) {
    compressed.set(chunk, compressedOffset);
    compressedOffset += chunk.length;
  }
  const filtered = new Uint8Array(inflateSync(compressed));
  const bytesPerPixel = 4;
  const rowBytes = width * bytesPerPixel;
  if (filtered.length !== height * (rowBytes + 1)) {
    throw new Error(`Unexpected decoded PNG length ${filtered.length}`);
  }

  const pixels = new Uint8Array(width * height * bytesPerPixel);
  for (let y = 0; y < height; y += 1) {
    const filter = filtered[y * (rowBytes + 1)];
    const sourceRow = y * (rowBytes + 1) + 1;
    const targetRow = y * rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const raw = filtered[sourceRow + x];
      const target = targetRow + x;
      const left = x >= bytesPerPixel ? pixels[target - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[target - rowBytes] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel ? pixels[target - rowBytes - bytesPerPixel] : 0;
      const predictor = filter === 0 ? 0
        : filter === 1 ? left
          : filter === 2 ? up
            : filter === 3 ? Math.floor((left + up) / 2)
              : filter === 4 ? paeth(left, up, upperLeft)
                : -1;
      if (predictor < 0) throw new Error(`Unsupported PNG row filter ${filter}`);
      pixels[target] = (raw + predictor) & 0xff;
    }
  }
  return { width, height, pixels };
};

const sha256 = (contents: Uint8Array): string => createHash("sha256").update(contents).digest("hex");

describe("formal one-cell two-color shell artwork", () => {
  const manifest = JSON.parse(readFileSync(resolve(ROOT, "art-source/manifest.json"), "utf8")) as {
    assets: ManifestAsset[];
  };

  it("declares all eight outer-color shell paths as current-level art", () => {
    for (const color of COLORS) {
      const file = `${color}-shell-single.png`;
      const runtimeUrl = `assets/art/gameplay/blocks/formal-v1/${file}`;
      expect(GAME_ART.gameplay.formalBlocks[color].shell[1], `${color} shell[1] runtime path`).toBe(runtimeUrl);
      expect(
        manifest.assets.find((asset) => asset.key === `gameplay.formalBlock.${color}-shell-single`),
        `${color} shell[1] manifest entry`,
      ).toMatchObject({
        source: `gameplay/blocks/formal-v1/${file}`,
        runtime: `../public/assets/art/gameplay/blocks/formal-v1/${file}`,
        width: 95,
        height: 104,
        alpha: true,
        grid: [1, 1],
        transform: "copy",
        loadGroup: "formal-gameplay-current-level",
      });
    }
  });

  it("keeps every supplied shell at 95x104 with a visually transparent center and byte-identical runtime copy", () => {
    for (const color of COLORS) {
      const file = `${color}-shell-single.png`;
      const source = new Uint8Array(readFileSync(resolve(ROOT, "art-source/gameplay/blocks/formal-v1", file)));
      const runtime = new Uint8Array(readFileSync(resolve(ROOT, "public/assets/art/gameplay/blocks/formal-v1", file)));
      const decoded = decodeRgbaPng(source);
      const centerAlpha = decoded.pixels[((Math.floor(decoded.height / 2) * decoded.width) + Math.floor(decoded.width / 2)) * 4 + 3];
      const hasVisibleFramePixel = decoded.pixels.some((value, index) => index % 4 === 3 && value > 0);

      expect({ width: decoded.width, height: decoded.height }, `${color} shell native size`).toEqual({ width: 95, height: 104 });
      expect(centerAlpha, `${color} shell center must reveal the inner-color single`).toBeLessThanOrEqual(4);
      expect(hasVisibleFramePixel, `${color} shell must retain a visible outer frame`).toBe(true);
      expect(sha256(runtime), `${color} shell runtime bytes`).toBe(sha256(source));
    }
  });
});
