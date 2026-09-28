// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createHash } from "node:crypto";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DAILY_TASK_ART_URLS } from "../src/game/artManifest";

const SOURCE = "art-source/ui/formal-pages/daily-tasks-v2";
const RUNTIME = "public/assets/art/ui/formal-pages/daily-tasks-v2";
const ASSETS = [
  { input: "2.png", file: "close.png", key: "close", width: 94, height: 98, sha256: "fd6df9c51e81220161239dd0e405ce5ab8080827c22b7bd703650150659167ec" },
  { input: "3.png", file: "task-booster.png", key: "taskBooster", width: 71, height: 77, sha256: "982d0874fb569e12fea4ab005d73c8c94fd167352bc0b170dd37bf47bc09ab8f" },
  { input: "4.png", file: "task-trophy.png", key: "taskTrophy", width: 70, height: 90, sha256: "e472aa044a3bef26409932042ca4f33db5ff14d8726e6f2a54d9548bd394b442" },
  { input: "5.png", file: "task-shield.png", key: "taskShield", width: 59, height: 68, sha256: "277c92c5613d7f311f8350490d1572249e6347d95f229d0b073042ff2550c138" },
  { input: "6.png", file: "chest.png", key: "chest", width: 85, height: 75, sha256: "3236baa86717db91d336da2fd15db8d1ecd58191f3b26ebb76c35fb41c11d1a7" },
  { input: "7.png", file: "calendar.png", key: "calendar", width: 53, height: 54, sha256: "32b75d6be1e55965de813a421447e98168241efd827b12c492c82a195b1fa326" },
  { input: "8.png", file: "summary-panel.png", key: "summaryPanel", width: 476, height: 66, sha256: "3ea5e64a6288e358d5a018bffc4f65052db1d47d6ca1849fa7c18a7774550be5" },
  { input: "9.png", file: "button-green.png", key: "buttonGreen", width: 120, height: 53, sha256: "afe3bd7bfa73e9db46bb26b0179efa643cb3b7807d1c4c5a734694ac1861c5ea" },
  { input: "10.png", file: "button-grey.png", key: "buttonGrey", width: 120, height: 53, sha256: "4bc204e9eb1ec7d8aa7249404de2b6f77254e75cf5ecea03f01e81b3c14db865" },
  { input: "11.png", file: "button-yellow.png", key: "buttonYellow", width: 120, height: 53, sha256: "256a1c8d31c2499d44fa47d5ca04493e91b39a240f10a7d6d5b06a9df11022e2" },
  { input: "12.png", file: "progress-track.png", key: "progressTrack", width: 189, height: 27, sha256: "ae9f2884d6e1d65af059abbe322609515316e7cf764ce7176e9c7d59c4d99f9f" },
  { input: "13.png", file: "progress-fill.png", key: "progressFill", width: 182, height: 19, sha256: "ecf284b307bf36637eeedaec2c268594f763c88cbef74da37b7138ad2d6d685c" },
  { input: "14.png", file: "bonus-panel.png", key: "bonusPanel", width: 524, height: 113, sha256: "c938e269f99affc354e0b6e844960ebb0d428aec98389cece065578a855eb132" },
  { input: "15.png", file: "panel.png", key: "panel", width: 594, height: 889, sha256: "b5cc9b255865bb96acd3a6104abd710befd12bbbd3d393fc38e88f4b3821c700" },
  { input: "supplied task-row.png", file: "task-row.png", key: "taskRow", width: 458, height: 115, sha256: "980954593cc91da9b8390ea80b0f91ff61f2c59c26248ffbdd173e198d9ad302" },
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

describe("supplied Daily Tasks V2 formal art", () => {
  for (const asset of ASSETS) {
    it(`preserves ${asset.input} as native ${asset.file} in source, runtime and manifests`, () => {
      const source = readFileSync(`${SOURCE}/${asset.file}`) as Uint8Array;
      const runtime = readFileSync(`${RUNTIME}/${asset.file}`) as Uint8Array;
      expect(sha256(source)).toBe(asset.sha256);
      expect(sha256(runtime)).toBe(asset.sha256);
      expect([...source.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      expect(uint32be(source, 16)).toBe(asset.width);
      expect(uint32be(source, 20)).toBe(asset.height);
      expect(source[25]).toBe(6); // PNG RGBA: preserve the supplied alpha channel.
      const entries = manifest.assets.filter((row) => row.key === `ui.formal.dailyTasks.${asset.key}`);
      expect(entries).toHaveLength(1);
      expect(manifest.assets.filter((row) => row.runtime === `../${RUNTIME}/${asset.file}`)).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        source: `ui/formal-pages/daily-tasks-v2/${asset.file}`,
        runtime: `../public/assets/art/ui/formal-pages/daily-tasks-v2/${asset.file}`,
        width: asset.width, height: asset.height, alpha: true,
        grid: [1, 1], transform: "copy", loadGroup: "formal-daily-tasks",
      });
      expect(DAILY_TASK_ART_URLS[asset.key]).toBe(`assets/art/ui/formal-pages/daily-tasks-v2/${asset.file}`);
    });
  }

  it("excludes the annotated composition reference from the runtime package", () => {
    expect(sha256(readFileSync(`${SOURCE}/reference-layout.png`))).toBe(
      "919e9e75e70648110ed12c0c453cb766147bf6ae30f0a702ec9a3229f78ee8d8",
    );
    expect(readdirSync(RUNTIME).sort()).toEqual(ASSETS.map((asset) => asset.file).sort());
    const entries = manifest.assets.filter((row) => row.loadGroup === "formal-daily-tasks");
    expect(entries).toHaveLength(15);
    expect(entries.some((row) => row.source.includes("reference-layout"))).toBe(false);
  });

  it("uses fifteen unique V2 cutouts and retires every V1 runtime reference", () => {
    expect(Object.keys(DAILY_TASK_ART_URLS)).toHaveLength(15);
    expect(new Set(Object.values(DAILY_TASK_ART_URLS)).size).toBe(15);
    expect(Object.values(DAILY_TASK_ART_URLS).sort()).toEqual(
      ASSETS.map((asset) => `assets/art/ui/formal-pages/daily-tasks-v2/${asset.file}`).sort(),
    );
    const legacyRuntime = "public/assets/art/ui/formal-pages/daily-tasks-v1";
    expect(existsSync(`${legacyRuntime}/task-row.webp`)).toBe(false);
    if (existsSync(legacyRuntime)) expect(readdirSync(legacyRuntime)).toEqual([]);
    expect(manifest.assets.filter((row) => row.runtime.includes("daily-tasks-v1/"))).toEqual([]);
    expect(manifest.assets.filter((row) => row.key.startsWith("ui.formal.dailyTasks.")
      && row.source.includes("daily-tasks-v1/"))).toEqual([]);
    expect(existsSync("art-source/ui/formal-pages/daily-tasks-v1/task-row.png")).toBe(true);
  });

  it("exports new cutouts byte-for-byte and does not regenerate retired V1 images", () => {
    const optimizer = readFileSync("tools/optimize-assets.mjs", "utf8") as string;
    const section = optimizer.slice(optimizer.indexOf("const dailyTaskV2Assets ="), optimizer.indexOf("// Journey episode 1"));
    for (const asset of ASSETS) expect(section).toContain(`"${asset.file}"`);
    expect(section).toContain("await copyFile(source, target)");
    expect(section).not.toContain('"chest-ready.webp"');
    expect(section).not.toContain('"task-flag.webp"');
    expect(section).not.toContain('"title-plaque.webp"');
    expect(section).not.toContain('"task-row.webp"');
  });
});
