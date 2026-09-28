// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createHash } from "node:crypto";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_ART_URLS, DAILY_TASK_ART_URLS } from "../src/game/artManifest";

const SOURCE = "art-source/ui/formal-pages/achievements-v2";
const RUNTIME = "public/assets/art/ui/formal-pages/achievements-v2";
const ASSETS = [
  { input: "2.png", file: "close.png", key: "close", width: 94, height: 98, sha256: "fd6df9c51e81220161239dd0e405ce5ab8080827c22b7bd703650150659167ec", shared: true },
  { input: "3.png", file: "medal-inactive.png", key: "medalInactive", width: 82, height: 79, sha256: "e055beddce86ada2f630abf0fca19669594078ebb2511eae591952382ae6f2cb", shared: false },
  { input: "4.png", file: "medal-active.png", key: "medalActive", width: 82, height: 79, sha256: "06a29a26a706be271e0071386dec60ea2e841011ad288fb35675c375130f9772", shared: false },
  { input: "5.png", file: "summary-panel.png", key: "summaryPanel", width: 476, height: 66, sha256: "b7b1a2f089d38769084f4a7ad439c45ce34b776dfdeaf0480a853741d3957e45", shared: false },
  { input: "6.png", file: "button-green.png", key: "buttonGreen", width: 120, height: 53, sha256: "1e3624ff9498f0e58db442d39539a5b084a279e3e8a438660a3dd47efce7b1e7", shared: false },
  { input: "7.png", file: "button-grey.png", key: "buttonGrey", width: 120, height: 53, sha256: "4bc204e9eb1ec7d8aa7249404de2b6f77254e75cf5ecea03f01e81b3c14db865", shared: true },
  { input: "8.png", file: "progress-track.png", key: "progressTrack", width: 229, height: 21, sha256: "184aac13a2bea48e9b4def2ff2163c6390bb658290f957f99b3156bd440249fe", shared: false },
  { input: "9.png", file: "progress-fill-green.png", key: "progressFillGreen", width: 223, height: 15, sha256: "17924d572123fdc7521aca8d780dfca08ff2ce7640ce9cf432a25a86195eaf08", shared: false },
  { input: "10.png", file: "progress-fill-blue.png", key: "progressFillBlue", width: 223, height: 15, sha256: "b4e085e27280f75b4bd8b459297818f9c264ed4e8ffb6c68304d1a899a5ee6bd", shared: false },
  { input: "11.png", file: "panel.png", key: "panel", width: 594, height: 889, sha256: "bc76f958332d5aed3c166267f2a485a1512ffcf42e3aebe2fc0a3cb68d70a327", shared: false },
  { input: "supplied row-active.png", file: "row-active.png", key: "rowActive", width: 519, height: 115, sha256: "796a9c11421c3ce038987281ecb37aabb4e42e6d4642a0dd374044b32bef2dd2", shared: false },
  { input: "supplied row-inactive.png", file: "row-inactive.png", key: "rowInactive", width: 517, height: 114, sha256: "c23339c141f3ecc8e5eb6a8d76cced3ea869cb59e4ae0fce94efd3a0d5a1172a", shared: false },
] as const;
interface ArtRecord {
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
const manifest = JSON.parse(readFileSync("art-source/manifest.json", "utf8")) as { assets: ArtRecord[] };
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const uint32be = (bytes: Uint8Array, offset: number): number => (
  bytes[offset] * 0x1000000 + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3]
);

describe("supplied Achievements V2 formal art", () => {
  for (const asset of ASSETS) {
    it(`preserves ${asset.input} as native ${asset.file} in source, runtime and URL contracts`, () => {
      const source = readFileSync(`${SOURCE}/${asset.file}`) as Uint8Array;
      const folder = asset.shared ? "daily-tasks-v2" : "achievements-v2";
      const url = `assets/art/ui/formal-pages/${folder}/${asset.file}`;
      const runtime = readFileSync(`public/${url}`) as Uint8Array;
      expect(sha256(source)).toBe(asset.sha256);
      expect(sha256(runtime)).toBe(asset.sha256);
      expect([...source.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      expect(uint32be(source, 16)).toBe(asset.width);
      expect(uint32be(source, 20)).toBe(asset.height);
      expect(source[25]).toBe(6); // PNG RGBA: preserve the supplied alpha channel.
      expect(ACHIEVEMENT_ART_URLS[asset.key]).toBe(url);
      const entries = manifest.assets.filter((row) => row.runtime === `../public/${url}`);
      expect(entries).toHaveLength(1);
      const key = `ui.formal.${asset.shared ? "dailyTasks" : "achievements"}.${asset.key}`;
      expect(manifest.assets.filter((row) => row.key === key)).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        key,
        source: `ui/formal-pages/${folder}/${asset.file}`,
        width: asset.width, height: asset.height, alpha: true,
        grid: [1, 1], transform: "copy",
        loadGroup: asset.shared ? "formal-daily-tasks" : "formal-achievements",
      });
    });
  }

  it("deduplicates only exactly identical close and grey-button files", () => {
    expect(ACHIEVEMENT_ART_URLS.close).toBe(DAILY_TASK_ART_URLS.close);
    expect(ACHIEVEMENT_ART_URLS.buttonGrey).toBe(DAILY_TASK_ART_URLS.buttonGrey);
    expect(ACHIEVEMENT_ART_URLS.panel).not.toBe(DAILY_TASK_ART_URLS.panel);
    expect(ACHIEVEMENT_ART_URLS.buttonGreen).not.toBe(DAILY_TASK_ART_URLS.buttonGreen);
    expect(ACHIEVEMENT_ART_URLS.summaryPanel).not.toBe(DAILY_TASK_ART_URLS.summaryPanel);
    expect(ACHIEVEMENT_ART_URLS.rowActive).not.toBe(ACHIEVEMENT_ART_URLS.rowInactive);
    expect(Object.keys(ACHIEVEMENT_ART_URLS)).toHaveLength(12);
    expect(new Set(Object.values(ACHIEVEMENT_ART_URLS)).size).toBe(12);
    expect(ASSETS.filter((asset) => !asset.shared)).toHaveLength(10);
    expect(readdirSync(RUNTIME).sort()).toEqual(ASSETS.filter((asset) => !asset.shared).map((asset) => asset.file).sort());
    expect(ASSETS.filter((asset) => !asset.shared).reduce((sum, asset) => (
      sum + (readFileSync(`${RUNTIME}/${asset.file}`) as Uint8Array).byteLength
    ), 0)).toBe(103_918);
    expect(["row-active.png", "row-inactive.png"].reduce((sum, file) => (
      sum + (readFileSync(`${RUNTIME}/${file}`) as Uint8Array).byteLength
    ), 0)).toBe(13_282);
  });

  it("excludes the annotated reference and retired medal from runtime while retaining their sources", () => {
    expect(sha256(readFileSync(`${SOURCE}/reference-layout.png`))).toBe(
      "41d5028fdac076e9d8747faf9d716b23b6c702ee1d2ea7bed44d7c38b3326194",
    );
    const entries = manifest.assets.filter((row) => row.loadGroup === "formal-achievements");
    expect(entries).toHaveLength(10);
    expect(entries.some((row) => row.source.includes("reference-layout"))).toBe(false);
    expect(manifest.assets.some((row) => row.key === "ui.achievementMedal")).toBe(false);
    expect(manifest.assets.some((row) => row.runtime.endsWith("/achievement-medal-blue-v1.png"))).toBe(false);
    expect(existsSync("art-source/ui/achievements/achievement-medal-blue-v1.png")).toBe(true);
    expect(existsSync("public/assets/art/ui/achievements/achievement-medal-blue-v1.png")).toBe(false);
  });

  it("exports ten unique native PNGs without copying the annotated reference", () => {
    const optimizer = readFileSync("tools/optimize-assets.mjs", "utf8") as string;
    const section = optimizer.slice(optimizer.indexOf("const achievementV2Assets ="), optimizer.indexOf("// Journey episode 1"));
    for (const asset of ASSETS.filter((row) => !row.shared)) expect(section).toContain(`"${asset.file}"`);
    expect(section).toContain("await copyFile(source, target)");
    expect(section).not.toContain('"close.png"');
    expect(section).not.toContain('"button-grey.png"');
    expect(section).not.toContain("reference-layout.png");
    expect(section).not.toContain(".resize(");
    expect(optimizer).not.toContain('"public/assets/art/ui/achievements/achievement-medal-blue-v1.png"');
  });
});
