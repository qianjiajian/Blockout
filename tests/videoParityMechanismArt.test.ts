// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createRequire } from "node:module";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GAME_ART } from "../src/game/artManifest";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import {
  KEY_LOCK_COUNT_VERTICAL_OFFSET_CELLS,
  KEY_LOCK_COUNT_VERTICAL_OFFSET_PX,
  keyLockMarkerVerticalOffset,
  markerAspectRatio,
} from "../src/game/keyLockMarkerArt";

const require = createRequire(import.meta.url);
const sharp = require("C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const ROOT = resolve(".");

const assets = [
  ["movementAxis", "arrow-axis-overlay-v1.png", 192, 192],
  ["keyToken", "key-token-v1.png", 66, 84],
  ["chainLock", "chain-lock-v1.png", 62, 86],
  ["liftFrame", "lift-frame-v1.png", 512, 512],
  ["stagedFrame", "staged-frame-v1.png", 288, 288],
  ["timedFeeder", "timed-feeder-v1.png", 512, 384],
] as const;

const markerAssets = [
  ["purple", "key-token-v1.png", "chain-lock-v1.png", 62, 86],
  ["red", "key-token-red-v1.png", "chain-lock-red-v1.png", 62, 86],
  ["blue", "key-token-blue-v1.png", "chain-lock-blue-v1.png", 62, 86],
  ["green", "key-token-green-v1.png", "chain-lock-green-v1.png", 62, 85],
  ["yellow", "key-token-yellow-v1.png", "chain-lock-yellow-v1.png", 62, 85],
  ["orange", "key-token-orange-v1.png", "chain-lock-orange-v1.png", 62, 86],
  ["pink", "key-token-pink-v1.png", "chain-lock-pink-v1.png", 62, 86],
  ["cyan", "key-token-cyan-v1.png", "chain-lock-cyan-v1.png", 62, 86],
] as const;

const image = (name: string, width = 192, height = width) => ({
  src: name,
  currentSrc: name,
  width,
  height,
  naturalWidth: width,
  naturalHeight: height,
});

const canvasProbe = () => {
  const draws: Array<{ image: unknown; args: number[] }> = [];
  const rotations: number[] = [];
  const ctx = {
    globalAlpha: 1,
    shadowColor: "",
    shadowBlur: 0,
    save() {},
    restore() {},
    translate() {},
    scale() {},
    rotate(radians: number) { rotations.push(radians); },
    drawImage(source: unknown, ...args: number[]) { draws.push({ image: source, args }); },
  };
  return { ctx, draws, rotations };
};

describe("video-parity mechanism artwork", () => {
  it("declares and ships the six optimized deferred gameplay images", async () => {
    const manifest = JSON.parse(readFileSync(resolve(ROOT, "art-source/manifest.json"), "utf8")) as {
      assets: Array<Record<string, unknown>>;
    };
    for (const [property, filename, width, height] of assets) {
      const runtimeUrl = `assets/art/gameplay/mechanics/video-parity-v1/${filename}`;
      expect(GAME_ART.gameplay.videoParity[property]).toBe(runtimeUrl);
      expect(manifest.assets.find((asset) => asset.key === `gameplay.videoParity.${property}`)).toMatchObject({
        source: `gameplay/mechanics/video-parity-v1/${filename}`,
        runtime: `../public/assets/art/gameplay/mechanics/video-parity-v1/${filename}`,
        width,
        height,
        alpha: true,
        grid: [1, 1],
      });
      await expect(sharp(resolve(ROOT, "public/assets/art/gameplay/mechanics/video-parity-v1", filename)).metadata())
        .resolves.toMatchObject({ width, height, hasAlpha: true });
    }
  });

  it("maps all eight key groups to matching optimized key and lock artwork", async () => {
    for (const [color, keyFilename, lockFilename, lockWidth, lockHeight] of markerAssets) {
      const base = "assets/art/gameplay/mechanics/video-parity-v1";
      expect(GAME_ART.gameplay.videoParity.keyTokens[color]).toBe(`${base}/${keyFilename}`);
      expect(GAME_ART.gameplay.videoParity.chainLocks[color]).toBe(`${base}/${lockFilename}`);

      for (const root of [
        resolve(ROOT, "art-source/gameplay/mechanics/video-parity-v1"),
        resolve(ROOT, "public/assets/art/gameplay/mechanics/video-parity-v1"),
      ]) {
        await expect(sharp(resolve(root, keyFilename)).metadata())
          .resolves.toMatchObject({ width: 66, height: 84, hasAlpha: true });
        await expect(sharp(resolve(root, lockFilename)).metadata())
          .resolves.toMatchObject({ width: lockWidth, height: lockHeight, hasAlpha: true });
      }
    }
  });

  it("draws horizontal/vertical arrows plus colour-matched key and active lock badges", () => {
    const probe = canvasProbe();
    const game = Object.create(ColorEscapeGame.prototype) as any;
    const movementAxis = image("movement-axis");
    const keyTokens = Object.fromEntries(markerAssets.map(([color]) => [color, image(`key-${color}`, 66, 84)]));
    const chainLocks = Object.fromEntries(markerAssets.map(([color, _key, _lock, width, height]) => (
      [color, image(`lock-${color}`, width, height)]
    )));
    const labels: Array<{ value: string; y: number }> = [];
    game.ctx = probe.ctx;
    game.art = {
      videoParity: {
        movementAxis,
        keyToken: keyTokens.purple,
        chainLock: chainLocks.purple,
        keyTokens,
        chainLocks,
      },
    };
    game.revisedTransitions = [];
    game.model = { level: { blocks: [
      { keyId: "vp-key-group-1" },
      { keyId: "vp-key-group-2" },
      { lockedBy: "vp-key-group-2", lockCount: 2 },
    ] } };
    game.label = (value: string, _x: number, y: number) => { labels.push({ value, y }); };
    const board = { innerX: 20, innerY: 30, cell: 60 };

    game.drawBlockMechanicMarkers({ movementAxis: "horizontal" }, [[0, 0]], board);
    game.drawBlockMechanicMarkers({ movementAxis: "vertical" }, [[1, 0]], board);
    game.drawBlockMechanicMarkers({ keyId: "vp-key-group-2", color: "orange" }, [[2, 0]], board);
    game.drawBlockMechanicMarkers({ lockedBy: "vp-key-group-2", color: "cyan" }, [[3, 0]], board);
    game.drawBlockMechanicMarkers({ lockedBy: "vp-key-group-2", lockCount: 2, color: "blue" }, [[4, 0]], board);

    expect(probe.draws.map((draw) => draw.image)).toEqual([
      movementAxis,
      movementAxis,
      keyTokens.red,
      chainLocks.red,
      chainLocks.red,
    ]);
    expect(probe.rotations).toEqual([Math.PI / 2]);
    expect(labels.map(({ value }) => value)).toEqual(["1", "2"]);

    for (const draw of probe.draws.slice(2)) {
      const marker = draw.image as ReturnType<typeof image>;
      expect(draw.args[2] / draw.args[3]).toBeCloseTo(markerAspectRatio(marker));
    }
    const expectedMarkerCenterY = board.innerY + board.cell / 2 + keyLockMarkerVerticalOffset(board.cell);
    for (const draw of probe.draws.slice(2)) {
      expect(draw.args[1] + draw.args[3] / 2).toBeCloseTo(expectedMarkerCenterY);
    }
    expect(labels.every(({ y }) => (
      Math.abs(y - (
        expectedMarkerCenterY
          + board.cell * (0.17 + KEY_LOCK_COUNT_VERTICAL_OFFSET_CELLS)
          + KEY_LOCK_COUNT_VERTICAL_OFFSET_PX
      )) < 0.001
    ))).toBe(true);
  });

  it("keeps the lift center transparent and renders only its scalable gold frame", async () => {
    const liftPath = resolve(ROOT, "public/assets/art/gameplay/mechanics/video-parity-v1/lift-frame-v1.png");
    const { data, info } = await sharp(liftPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const centerAlpha = data[(Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * 4 + 3];
    expect(centerAlpha).toBe(0);

    const probe = canvasProbe();
    const game = Object.create(ColorEscapeGame.prototype) as any;
    const liftFrame = image("lift-frame");
    const nineSlices: unknown[][] = [];
    game.ctx = probe.ctx;
    game.art = { videoParity: { liftFrame } };
    game.drawNineSlice = (...args: unknown[]) => { nineSlices.push(args); };
    game.drawLiftFrame(1, 2, 2, 2, { innerX: 10, innerY: 20, cell: 50 });

    expect(nineSlices).toHaveLength(1);
    expect(nineSlices[0][0]).toBe(liftFrame);
    expect(probe.draws).toHaveLength(0);
  });

  it("keeps the staged-release center transparent and renders its own cool frame", async () => {
    const framePath = resolve(ROOT, "public/assets/art/gameplay/mechanics/video-parity-v1/staged-frame-v1.png");
    const { data, info } = await sharp(framePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const centerAlpha = data[(Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * 4 + 3];
    expect(centerAlpha).toBe(0);

    const probe = canvasProbe();
    const game = Object.create(ColorEscapeGame.prototype) as any;
    const stagedFrame = image("staged-frame");
    const nineSlices: unknown[][] = [];
    game.ctx = probe.ctx;
    game.art = { videoParity: { stagedFrame } };
    game.drawNineSlice = (...args: unknown[]) => { nineSlices.push(args); };
    game.drawStagedFrame(1, 2, 2, 2, { innerX: 10, innerY: 20, cell: 50 });

    expect(nineSlices).toHaveLength(1);
    expect(nineSlices[0][0]).toBe(stagedFrame);
    expect(probe.draws).toHaveLength(0);
  });

  it("renders a timed feeder skin, oriented chute, next-shape preview and remaining cargo", () => {
    const probe = canvasProbe();
    const game = Object.create(ColorEscapeGame.prototype) as any;
    const timedFeeder = image("timed-feeder");
    const sideGenerator = image("side-generator", 112, 299);
    const previewCell = image("preview-cell");
    const labels: Array<{ value: string; x: number; y: number; color: string; maxWidth?: number }> = [];
    const previews: Array<{ x: number; y: number; maxWidth: number; maxHeight: number }> = [];
    let pillDraws = 0;
    game.ctx = probe.ctx;
    game.art = {
      videoParity: { sideGenerator, timedFeeder },
      formalBlocks: { blue: { solid: { 8: previewCell }, shell: {} } },
    };
    game.model = { level: { width: 6, height: 6 } };
    game.revisedTransitions = [];
    game.drawPill = () => { pillDraws += 1; };
    const drawFormalBlockPreview = game.drawFormalBlockPreview.bind(game);
    game.drawFormalBlockPreview = (
      block: unknown,
      x: number,
      y: number,
      maxWidth: number,
      maxHeight: number,
    ) => {
      previews.push({ x, y, maxWidth, maxHeight });
      return drawFormalBlockPreview(block, x, y, maxWidth, maxHeight);
    };
    game.label = (value: string, x: number, y: number, _size: number, color: string, ...rest: unknown[]) => {
      labels.push({ value, x, y, color, maxWidth: rest[4] as number | undefined });
    };
    game.drawIndependentGenerator({
      id: "timer",
      side: "right",
      offset: 2,
      spawn: [5, 2],
      queueBlockIds: ["next", "later", "last"],
      trigger: "time",
      intervalSeconds: 2,
      head: 0,
      remaining: 3,
      nextBlockId: "next",
      elapsed: 0.5,
    }, {
      id: "next",
      x: 5,
      y: 2,
      shape: [[0, 0], [1, 0]],
      color: "blue",
      layers: ["blue"],
      frozen: 0,
    }, { innerX: 20, innerY: 30, cell: 60 });

    expect(probe.draws.some((draw) => draw.image === sideGenerator)).toBe(true);
    expect(probe.draws.some((draw) => draw.image === timedFeeder)).toBe(true);
    expect(probe.draws.filter((draw) => draw.image === previewCell)).toHaveLength(1);
    expect(probe.rotations).toContain(Math.PI / 2);
    expect(pillDraws).toBe(0);
    expect(labels).toHaveLength(1);
    expect(labels[0]).toMatchObject({ value: "3", color: "#a8ffff", maxWidth: 26.4 });
    expect(labels[0].x).toBeCloseTo(20 + (6 + (55 / 299) * 3) * 60);
    expect(labels[0].y).toBeCloseTo(30 + (2.5 - (1.5 - (39 / 299) * 3)) * 60);
    expect(previews).toHaveLength(1);
    expect(previews[0].x).toBeCloseTo(20 + (6 + (55 / 299) * 3) * 60);
    expect(previews[0].y).toBeCloseTo(30 + (2.5 + (-1.5 + (161 / 299) * 3)) * 60);
    expect(previews[0].maxWidth).toBeCloseTo(39.6);
    expect(previews[0].maxHeight).toBeCloseTo(31.2);
  });
});
