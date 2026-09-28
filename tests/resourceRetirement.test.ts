// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest runs in Node.
import { existsSync, readFileSync } from "node:fs";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest runs in Node.
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GAME_ART } from "../src/game/artManifest";
import { REVISED_MECHANISM_ART_PATHS } from "../src/game/revisedMechanismArt";

const root = resolve(".");
const retired = [
  "assets/art/fx/block-blocked-halo-v1.png",
  "assets/art/fx/victory-halo-v1.png",
  "assets/art/gameplay/board/formal-border-v1/direction-arrow.png",
  "assets/art/gameplay/board/formal-border-v1/exit-blue-1-cell.png",
  "assets/art/gameplay/board/formal-border-v1/exit-cyan-1-cell.png",
  "assets/art/gameplay/board/formal-border-v1/exit-green-1-cell.png",
  "assets/art/gameplay/board/formal-border-v1/exit-orange-1-cell.png",
  "assets/art/gameplay/board/formal-border-v1/exit-pink-1-cell.png",
  "assets/art/gameplay/board/formal-border-v1/exit-purple-1-cell.png",
  "assets/art/gameplay/board/formal-border-v1/exit-red-1-cell.png",
  "assets/art/gameplay/board/formal-border-v1/exit-yellow-1-cell.png",
  "assets/art/gameplay/board/formal-border-v1/neutral-rail-2-cell.png",
  "assets/art/gameplay/board/formal-border-v1/neutral-rail-corner-adjacent.png",
  "assets/art/gameplay/board/irregular-cell-v1.png",
  "assets/art/gameplay/mechanics/mechanism-guide-icons-atlas-v1.png",
  "assets/art/ui/formal-pages/journey/locked-frame.png",
  "assets/art/ui/formal-pages/overlays/win/perfect-title.png",
  "assets/art/ui/navigation-v3/five-tab-icons-atlas-v1.png"
];
const editorOnly = ["neutral-rail-1-cell.png", "neutral-corner-inner.png", "neutral-corner-outer.png"]
  .map((name) => `assets/art/gameplay/board/formal-border-v1/${name}`);
function urls(value: unknown): string[] {
  if (typeof value === "string") return value.startsWith("assets/") ? [value] : [];
  return value && typeof value === "object" ? Object.values(value).flatMap(urls) : [];
}

describe("reviewed unused-resource cleanup", () => {
  it("removes only the 18 retired runtime images, not the source archives", () => {
    expect(retired).toHaveLength(18);
    for (const url of retired) {
      expect(existsSync(resolve(root, "public", url)), url).toBe(false);
      expect(existsSync(resolve(root, "art-source", url.replace("assets/art/", ""))), url).toBe(true);
    }
  });
  it("does not re-export or regenerate retired images", () => {
    const runtimeUrls = urls(GAME_ART);
    const manifest = JSON.parse(readFileSync(resolve(root, "art-source/manifest.json"), "utf8"));
    const optimizer = readFileSync(resolve(root, "tools/optimize-assets.mjs"), "utf8");
    for (const url of retired) {
      expect(runtimeUrls, url).not.toContain(url);
      expect(manifest.assets.some((asset: { runtime: string }) => asset.runtime === `../public/${url}`), url).toBe(false);
      expect(optimizer, url).not.toContain(`"${url.split("/").at(-1)}"`);
      expect(optimizer, url).not.toContain(`"public/${url}"`);
    }
  });
  it("keeps every exported runtime image and the 63 revised mechanism images", () => {
    expect(REVISED_MECHANISM_ART_PATHS).toHaveLength(63);
    for (const url of [...urls(GAME_ART), ...REVISED_MECHANISM_ART_PATHS]) {
      expect(existsSync(resolve(root, "public", url)), url).toBe(true);
    }
  });
  it("preserves the three authored Web editor border dependencies", () => {
    for (const url of editorOnly) expect(existsSync(resolve(root, "public", url)), url).toBe(true);
  });
});
