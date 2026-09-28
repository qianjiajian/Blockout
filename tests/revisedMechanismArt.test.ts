// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest runs in Node.
import fs from "node:fs";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest runs in Node.
import path from "node:path";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest runs in Node.
import crypto from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { COLORS } from "../src/core/types";
import { REVISED_MECHANISM_ART_PATHS, REVISED_MECHANISM_ART_URLS } from "../src/game/revisedMechanismArt";
// Import/verification is a build-time Node tool, not a game runtime dependency.
// @ts-ignore JS tool has no production declaration dependency.
import { REVISED_ART_IMPORTS, REVISED_ART_EXCLUDED_REFERENCES, verifyRevisedMechanismArt } from "../tools/import-revised-mechanism-art.mjs";

const directory = "public/assets/art/gameplay/mechanics/revised-reference-v1";
interface ManifestEntry {
  source: string;
  target: string;
  url: string;
  mechanism: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
  rgbaSha256: string;
  color?: string;
  orientation?: string;
  length?: number;
}
const manifest = JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8")) as {
  entries: ManifestEntry[];
  totalRuntimePngBytes: number;
  excludedReferences: Array<{ source: string }>;
};
const byUrl = new Map(manifest.entries.map((entry) => [entry.url, entry]));
const sha = (buffer: Uint8Array) => crypto.createHash("sha256").update(buffer).digest("hex");

describe("revised original mechanism components", () => {
  it("maps exactly 63 independent runtime components, including all 48 flip-door combinations", () => {
    expect(REVISED_MECHANISM_ART_PATHS).toHaveLength(63);
    expect(new Set(REVISED_MECHANISM_ART_PATHS).size).toBe(63);
    expect([...REVISED_MECHANISM_ART_PATHS].sort()).toEqual(manifest.entries.map(({ url }) => url).sort());
    expect(manifest.entries.filter(({ mechanism }) => mechanism === "flip-door")).toHaveLength(48);
    expect(REVISED_ART_IMPORTS.map((entry: { source: string }) => entry.source).sort()).toEqual(manifest.entries.map(({ source }) => source).sort());
  });

  it("keeps floor colours, orientations, spans and source identities distinct", () => {
    expect(Object.keys(REVISED_MECHANISM_ART_URLS.coloredGrids).sort()).toEqual([...COLORS].sort());
    const translations = { red: "红", blue: "蓝", green: "绿", yellow: "黄", purple: "紫", orange: "橙", pink: "粉", cyan: "浅蓝" };
    for (const color of COLORS) {
      expect(byUrl.get(REVISED_MECHANISM_ART_URLS.coloredGrids[color])?.source).toBe(`彩色地格/${translations[color]}.png`);
      for (const orientation of ["horizontal", "vertical"] as const) for (const length of [1, 2, 3] as const) {
        const entry = byUrl.get(REVISED_MECHANISM_ART_URLS.flipDoors[color][orientation][length]);
        expect(entry).toMatchObject({ color, orientation, length, source: `翻转门/${orientation === "horizontal" ? "横" : "竖"}${length}${translations[color]}.png` });
      }
    }
  });

  it("keeps independently animated slat, frame, leaves, bomb face and arrow badges separate", () => {
    expect(byUrl.get(REVISED_MECHANISM_ART_URLS.shutterStrip)).toMatchObject({ source: "卷帘门/单条.png", width: 292, height: 40 });
    expect(byUrl.get(REVISED_MECHANISM_ART_URLS.lift.frame)).toMatchObject({ source: "电梯/kuang.png", width: 330, height: 317 });
    expect(byUrl.get(REVISED_MECHANISM_ART_URLS.lift.left)).toMatchObject({ source: "电梯/zuo.png", width: 147, height: 290 });
    expect(byUrl.get(REVISED_MECHANISM_ART_URLS.lift.right)).toMatchObject({ source: "电梯/you.png", width: 146, height: 290 });
    expect(byUrl.get(REVISED_MECHANISM_ART_URLS.bombFace)).toMatchObject({ source: "炸弹/biao.png", width: 94, height: 105 });
    expect(byUrl.get(REVISED_MECHANISM_ART_URLS.axis.horizontal)).toMatchObject({ source: "轴向块/zuoyou.png", width: 74, height: 74 });
    expect(byUrl.get(REVISED_MECHANISM_ART_URLS.axis.vertical)).toMatchObject({ source: "轴向块/shangxia.png", width: 61, height: 84 });
  });

  it("excludes all annotated references and the combined timer sheet from runtime paths", () => {
    expect(manifest.excludedReferences.map(({ source }) => source).sort()).toEqual([...REVISED_ART_EXCLUDED_REFERENCES].sort());
    expect(manifest.excludedReferences).toHaveLength(5);
    expect(manifest.entries.some(({ source }) => /示意|定时器/.test(source))).toBe(false);
    expect(fs.readdirSync(directory).filter((file: string) => file.endsWith(".png"))).toHaveLength(63);
  });

  it("retains every original PNG byte hash, dimension and decoded RGBA hash", async () => {
    let bytes = 0;
    for (const entry of manifest.entries) {
      const buffer = fs.readFileSync(path.join("public", entry.url));
      expect(buffer.length).toBe(entry.bytes);
      expect(sha(buffer)).toBe(entry.sha256);
      expect([buffer.readUInt32BE(16), buffer.readUInt32BE(20)]).toEqual([entry.width, entry.height]);
      expect(sha(await sharp(buffer).ensureAlpha().raw().toBuffer())).toBe(entry.rgbaSha256);
      bytes += buffer.length;
    }
    expect(bytes).toBe(manifest.totalRuntimePngBytes);
    expect(bytes).toBe(725162);
    expect(await verifyRevisedMechanismArt()).toEqual({ entries: 63, bytes: 725162, exactOriginals: true });
  });
});
