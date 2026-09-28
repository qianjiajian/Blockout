// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createHash } from "node:crypto";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createRequire } from "node:module";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GAME_ART } from "../src/game/artManifest";
import { WIN_ART_LAYOUT } from "../src/game/formalPageLayout";
// @ts-expect-error Node regression tooling intentionally uses JavaScript.
import { LARGE_IMAGE_TRANSFORM, assertLargeImageGeometry, encodeLargeImage, findLargeImagePolicy, largeImageSourcePixels } from "../tools/large-image-encoding.mjs";

const SOURCE_DIR = resolve("art-source/ui/formal-pages/overlays/win");
const RUNTIME_DIR = resolve("public/assets/art/ui/formal-pages/overlays/win");
const sharp = createRequire(import.meta.url)("sharp");
const manifest = JSON.parse(readFileSync(resolve("art-source/manifest.json"), "utf8")) as {
  assets: { key: string; transform?: string }[];
};

const WIN_CUTOUTS = [
  { property: "panel", file: "panel.png", placement: { x: 25, y: 287, width: 671, height: 867 } },
  { property: "close", file: "close.png", placement: { x: 616, y: 336, width: 94, height: 98 } },
  { property: "glow", file: "glow.png", placement: { x: 108, y: 398, width: 483, height: 483 } },
  { property: "coinPile", file: "coin-pile.png", placement: { x: 239, y: 566, width: 243, height: 203 } },
  { property: "rewardPill", file: "reward-pill.png", placement: { x: 271, y: 802, width: 178, height: 69 } },
  { property: "continueButton", file: "continue-button.png", placement: { x: 199, y: 964, width: 322, height: 125 } },
] as const;

const uint32be = (contents: Uint8Array, offset: number): number => (
  (contents[offset] * 0x1000000)
  + (contents[offset + 1] << 16)
  + (contents[offset + 2] << 8)
  + contents[offset + 3]
);

const pngSize = (contents: Uint8Array): { width: number; height: number } => {
  const signature = [...contents.subarray(0, 8)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (signature !== "89504e470d0a1a0a") throw new Error("Expected a PNG image");
  return { width: uint32be(contents, 16), height: uint32be(contents, 20) };
};

const sha256 = (contents: Uint8Array): string => createHash("sha256").update(contents).digest("hex");

describe("formal win artwork layout", () => {
  it("uses the reference's black 199/255 dim layer", () => {
    expect(WIN_ART_LAYOUT.overlay).toEqual({ color: "#000000", alpha: 199 / 255 });
  });

  it("locks the six active supplied cutouts to their reference coordinates and native pixels", async () => {
    expect(WIN_CUTOUTS).toHaveLength(6);

    for (const cutout of WIN_CUTOUTS) {
      const source = readFileSync(resolve(SOURCE_DIR, cutout.file));
      const runtime = readFileSync(resolve(RUNTIME_DIR, cutout.file));

      expect(WIN_ART_LAYOUT[cutout.property], `${cutout.file} placement`).toEqual(cutout.placement);
      expect(pngSize(source), `${cutout.file} source dimensions`).toEqual({
        width: cutout.placement.width,
        height: cutout.placement.height,
      });
      expect(pngSize(runtime), `${cutout.file} runtime dimensions`).toEqual(pngSize(source));
      const transform = manifest.assets.find(({ key }) => key === `ui.win.${cutout.property}`)?.transform;
      const policy = findLargeImagePolicy(`ui/formal-pages/overlays/win/${cutout.file}`);
      if (policy) {
        expect(["panel.png", "glow.png"]).toContain(cutout.file);
        expect(transform).toBe(LARGE_IMAGE_TRANSFORM);
        expect(policy.format).toBe("rgb-palette-exact-alpha-png");
        expect(policy.runtime).toBe(`ui/formal-pages/overlays/win/${cutout.file}`);
        expect(sha256(runtime), `${cutout.file} must be encoded directly from its master`).toBe(sha256(await encodeLargeImage(source, policy)));
        await assertLargeImageGeometry(await largeImageSourcePixels(source, policy), runtime, policy);
      } else if (transform === "copy") {
        expect(sha256(runtime), `${cutout.file} copy must remain byte-identical`).toBe(sha256(source));
      } else {
        expect(transform).toBe("png-lossless-no-resize");
        const sourcePixels = await sharp(source).ensureAlpha().raw().toBuffer();
        const runtimePixels = await sharp(runtime).ensureAlpha().raw().toBuffer();
        expect(sha256(runtimePixels), `${cutout.file} lossless PNG must preserve every RGBA pixel`).toBe(sha256(sourcePixels));
      }
      expect(GAME_ART.ui.win[cutout.property]).toBe(`assets/art/ui/formal-pages/overlays/win/${cutout.file}`);
    }
  });

  it("does not declare the retired bitmap title used before localized Canvas text", () => {
    expect(GAME_ART.ui.win).not.toHaveProperty("perfectTitle");
    expect(Object.values(GAME_ART.ui.win)).not.toContain("assets/art/ui/formal-pages/overlays/win/perfect-title.png");
  });

  it("locks the two annotated 28-point labels to their calibrated Canvas pixels and 3px outer outlines", () => {
    expect(WIN_ART_LAYOUT.rewardText).toEqual({
      x: 360,
      y: 838,
      designSize: 28,
      renderSize: 44,
      fill: "#ffffff",
      stroke: "#415ca4",
      lineWidth: 6,
    });
    expect(WIN_ART_LAYOUT.continueText).toEqual({
      x: 360,
      y: 1027,
      designSize: 28,
      renderSize: 44,
      fill: "#ffffff",
      stroke: "#10520b",
      lineWidth: 6,
    });
  });
});
