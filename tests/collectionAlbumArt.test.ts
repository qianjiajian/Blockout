// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync, readdirSync } from "node:fs";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { resolve } from "node:path";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createHash } from "node:crypto";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import {
  COLLECTION_ALBUM_ART_URLS,
  COLLECTION_CARD_ATLAS_URLS,
  GAME_ART,
  type CollectionAlbumArtUrls,
  type CollectionCardAtlasUrls,
} from "../src/game/artManifest";

const sharp = createRequire(import.meta.url)("sharp");

const FORMAL_SOURCE_DIR = resolve("art-source/ui/formal-pages/collection-album-v1");
const FORMAL_RUNTIME_DIR = resolve("public/assets/art/ui/formal-pages/collection-album-v1");
const ATLAS_SOURCE_DIR = resolve("art-source/ui/formal-pages/collection-card-atlases-v1");
const ATLAS_RUNTIME_DIR = resolve("public/assets/art/ui/formal-pages/collection-card-atlases-v1");
const SUPPLIED_SOURCE_DIR = resolve("art-source/ui/formal-pages/collection-album-v3");
const SUPPLIED_RUNTIME_DIR = resolve("public/assets/art/ui/formal-pages/collection-album-v3");
const PREVIOUS_SOURCE_DIR = resolve("art-source/ui/formal-pages/collection-album-v2");
const PREVIOUS_RUNTIME_DIR = resolve("public/assets/art/ui/formal-pages/collection-album-v2");

const SUPPLIED_ASSETS = [
  { version: 3, property: "suppliedTabBlue", file: "tab-blue", width: 204, height: 77, sha256: "fc05e9f1bd68bb15be649a41ae3d4d54abec70f85dbd4eddbfe911d1174068ea" },
  { version: 3, property: "suppliedTabPurple", file: "tab-purple", width: 203, height: 80, sha256: "3ae5969273a25cf40349af7836aa72c3113387c7f5f79d9aa031e28495a05820" },
  { version: 3, property: "suppliedCardGray", file: "card-gray", width: 215, height: 269, sha256: "2609542bbc87c6f1fed8db634e9bcfad3fd3de4148db770247ce5042e9aa6d00" },
  { version: 3, property: "suppliedCardBlue", file: "card-blue", width: 194, height: 242, sha256: "c2e1099cd2efe97a957d83dc0e74728ca0ffc270365e813d2832de0325fab2d6" },
  { version: 3, property: "suppliedCardPurple", file: "card-purple", width: 194, height: 242, sha256: "364c85468fab330d43ae8657b6ff27032a86442fdcd65b7024c672eaeb01bfd2" },
  { version: 3, property: "suppliedCardGold", file: "card-gold", width: 215, height: 269, sha256: "2244127e87c12bb2174296cf5a7f5a49c768a78becc57ac4e3160e10cec78af5" },
  { version: 3, property: "suppliedProgressIcon", file: "progress-icon", width: 45, height: 46, sha256: "4339eb5b45017c11f9f9ec1cc34b63985a3c2e9986d4ede6a882527bffe3683b" },
  { version: 2, property: "suppliedProgressPanel", file: "progress-panel", width: 320, height: 60, sha256: "d3be39c04f5c1f01bc0d08bc934c146b6b2a39c81828411fed2420b6f4f69dc7" },
  { version: 3, property: "suppliedLock", file: "lock", width: 64, height: 75, sha256: "a1d10feded4186e7c44eb99d59f4db984729eb79a7818956de63481aa9d37073" },
  { version: 3, property: "suppliedMask", file: "mask", width: 159, height: 157, sha256: "274aa4c18a610e7637f9636d09251836b45497acf2e6907de7e272a49a06ba3a" },
  { version: 2, property: "detailPanel", file: "detail-panel", width: 679, height: 960, sha256: "cb440b93e5139b55f28a69f9ffd3d46e7e2e34e4b1de8d4beed3e97f463f6541" },
  { version: 3, property: "pagePrevious", file: "page-previous", width: 50, height: 58, sha256: "f079863c3a96769542422b8c5a3f03427d4a226cf20ef37d1608a2fc4a74f61e" },
  { version: 3, property: "pageNext", file: "page-next", width: 49, height: 57, sha256: "d495645dfa1c8a42fc679391ca61b50b0160105bd1fde074b8521cff2d54591d" },
  { version: 3, property: "pageIndicator", file: "page-indicator", width: 116, height: 45, sha256: "cf165b542181c314eac5f43348cfd19c9a9e7db82d0749374b46b64bd6ef72b0" },
  { version: 3, property: "starFilled", file: "star-filled", width: 36, height: 35, sha256: "2673706b163039dad1f2d709a4a7e52c5ebf754e8c0ed358df4d1f6da2eb0c19" },
  { version: 3, property: "starEmpty", file: "star-empty", width: 38, height: 37, sha256: "8369faa8366e75d26634d8431940cc2a82f1d5913f676095482bb3d36c9267d5" },
  { version: 3, property: "guideBook", file: "guide-book", width: 96, height: 103, sha256: "151e6212cc9eb9323dd7009a944888b79539eaa0cb36bebb20ebb4a51951c350" },
] as const;

const LEGACY_SOURCE_ASSETS = [
  { property: "panel", file: "panel", width: 144, height: 216 },
  { property: "titlePlaque", file: "title-plaque", width: 192, height: 64 },
  { property: "tabBlue", file: "tab-blue", width: 96, height: 36 },
  { property: "tabGold", file: "tab-gold", width: 96, height: 36 },
  { property: "tabInactive", file: "tab-inactive", width: 96, height: 36 },
  { property: "progressPill", file: "progress-pill", width: 128, height: 40 },
  { property: "cardCommon", file: "card-common", width: 80, height: 104 },
  { property: "cardRare", file: "card-rare", width: 80, height: 104 },
  { property: "cardEpic", file: "card-epic", width: 80, height: 104 },
  { property: "cardLocked", file: "card-locked", width: 80, height: 104 },
  { property: "close", file: "close", width: 48, height: 48 },
  { property: "lock", file: "lock", width: 48, height: 48 },
  { property: "pageButton", file: "page-button", width: 48, height: 48 },
  { property: "inspiration", file: "inspiration", width: 48, height: 48 },
  { property: "guideBook", file: "guide-book", width: 128, height: 128 },
  { property: "newBadge", file: "new-badge", width: 72, height: 30 },
  { property: "star", file: "star", width: 32, height: 32 },
] as const;
const FORMAL_ASSETS = LEGACY_SOURCE_ASSETS.filter((asset): asset is Extract<typeof LEGACY_SOURCE_ASSETS[number], {
  property: "newBadge" | "inspiration";
}> => asset.property === "newBadge" || asset.property === "inspiration");
const RETIRED_ASSETS = LEGACY_SOURCE_ASSETS.filter((asset) => !FORMAL_ASSETS.some(({ file }) => file === asset.file));

const LEVEL_ATLASES = Array.from({ length: 8 }, (_, index) => `level-${String(index + 1).padStart(2, "0")}`);
const MASTERPIECE_ATLASES = Array.from({ length: 2 }, (_, index) => `masterpiece-${String(index + 1).padStart(2, "0")}`);
const CARD_ATLASES = [...LEVEL_ATLASES, ...MASTERPIECE_ATLASES];

interface ManifestAsset {
  key: string;
  source: string;
  runtime: string;
  width: number;
  height: number;
  alpha: boolean;
  grid: readonly number[];
  transform?: string;
  loadGroup?: string;
}

const manifest = JSON.parse(readFileSync(resolve("art-source/manifest.json"), "utf8")) as {
  assets: ManifestAsset[];
};

describe("independent Collection Album art contract", () => {
  it.each(SUPPLIED_ASSETS)("preserves supplied $property source and all native RGBA pixels", async (asset) => {
    const source = readFileSync(resolve(asset.version === 3 ? SUPPLIED_SOURCE_DIR : PREVIOUS_SOURCE_DIR, `${asset.file}.png`));
    const runtime = readFileSync(resolve(asset.version === 3 ? SUPPLIED_RUNTIME_DIR : PREVIOUS_RUNTIME_DIR, `${asset.file}.png`));
    expect(createHash("sha256").update(source).digest("hex")).toBe(asset.sha256);
    expect(await sharp(source).metadata()).toMatchObject({ width: asset.width, height: asset.height, hasAlpha: true });
    expect(await sharp(runtime).metadata()).toMatchObject({ width: asset.width, height: asset.height, hasAlpha: true });
    const sourcePixels = await sharp(source).ensureAlpha().raw().toBuffer();
    const runtimePixels = await sharp(runtime).ensureAlpha().raw().toBuffer();
    expect(runtimePixels.equals(sourcePixels), "including RGB under zero alpha").toBe(true);
    expect(runtime.length).toBeLessThanOrEqual(source.length);
    expect(COLLECTION_ALBUM_ART_URLS[asset.property]).toBe(`assets/art/ui/formal-pages/collection-album-v${asset.version}/${asset.file}.png`);
    const entries = manifest.assets.filter(({ key }) => key === `ui.formal.collectionAlbum.${asset.property}`);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      source: `ui/formal-pages/collection-album-v${asset.version}/${asset.file}.png`,
      runtime: `../public/assets/art/ui/formal-pages/collection-album-v${asset.version}/${asset.file}.png`,
      width: asset.width, height: asset.height, alpha: true, grid: [1, 1],
      transform: "png-lossless-no-resize", loadGroup: "formal-collection-album",
    });
  });

  it("keeps di0 and the annotated layouts source-only and imports no unrequested illustrations", () => {
    const expected = SUPPLIED_ASSETS.filter(({ version }) => version === 3).map(({ file }) => `${file}.png`).sort();
    expect(readdirSync(SUPPLIED_RUNTIME_DIR).sort()).toEqual(expected);
    expect(readdirSync(SUPPLIED_SOURCE_DIR).filter((file: string) => file.endsWith(".png")).sort()).toEqual([
      ...expected, "reference-album-layout.png", "unused-panel-di0.png", "detail-close.png", "progress-panel.png",
    ].sort());
    expect(createHash("sha256").update(readFileSync(resolve(SUPPLIED_SOURCE_DIR, "unused-panel-di0.png"))).digest("hex"))
      .toBe("4465063b7dd8cfc689286eeb1c37af01409e2ef9e826dc20acd3547d640b883d");
    expect(createHash("sha256").update(readFileSync(resolve(SUPPLIED_SOURCE_DIR, "reference-album-layout.png"))).digest("hex"))
      .toBe("0da0263fb8967756d7a0b716b99dfefd4f70108950b540c6b797611234bd613f");
    expect(manifest.assets.some(({ source, runtime }) => /unused-panel-di0|reference-album-layout|reference-detail-layout/.test(source + runtime))).toBe(false);
    expect(readdirSync(PREVIOUS_RUNTIME_DIR).sort()).toEqual(["detail-panel.png", "progress-panel.png"]);
    for (const file of ["tab-blue", "tab-purple", "card-blue", "card-purple", "progress-icon", "lock", "mask", "detail-close"]) {
      expect(readFileSync(resolve(PREVIOUS_SOURCE_DIR, `${file}.png`)).length).toBeGreaterThan(0);
      expect(manifest.assets.some(({ runtime }) => runtime === `../public/assets/art/ui/formal-pages/collection-album-v2/${file}.png`)).toBe(false);
    }
    for (const [file, sha] of [
      ["reference-album-layout.png", "92742460e914af395f3024508bf2299e184de1366a19b4088a42097552ba0dde"],
      ["reference-detail-layout.png", "0a6fdffc20f45f7024a6707154d85955d584564fd052d1db89fbe04093fe9b29"],
    ]) {
      expect(createHash("sha256").update(readFileSync(resolve(PREVIOUS_SOURCE_DIR, file))).digest("hex")).toBe(sha);
      expect(manifest.assets.some(({ source, runtime }) => source.endsWith(file) || runtime.endsWith(file))).toBe(false);
    }
  });

  it("deduplicates the exact new progress panel and close while preserving source proof", async () => {
    const newProgress = readFileSync(resolve(SUPPLIED_SOURCE_DIR, "progress-panel.png"));
    expect(newProgress.equals(readFileSync(resolve(PREVIOUS_SOURCE_DIR, "progress-panel.png")))).toBe(true);
    const newClose = readFileSync(resolve(SUPPLIED_SOURCE_DIR, "detail-close.png"));
    expect(createHash("sha256").update(newClose).digest("hex")).toBe("fd6df9c51e81220161239dd0e405ce5ab8080827c22b7bd703650150659167ec");
    expect(newClose.equals(readFileSync(resolve("art-source/ui/formal-pages/daily-tasks-v2/close.png")))).toBe(true);
    expect(newClose.equals(readFileSync(resolve("public", COLLECTION_ALBUM_ART_URLS.detailClose)))).toBe(true);
    expect(await sharp(newClose).metadata()).toMatchObject({ width: 94, height: 98, hasAlpha: true });
    expect(COLLECTION_ALBUM_ART_URLS.detailClose).toBe(GAME_ART.ui.dailyTasks.close);
    for (const url of [COLLECTION_ALBUM_ART_URLS.detailClose, COLLECTION_ALBUM_ART_URLS.suppliedProgressPanel]) {
      expect(manifest.assets.filter(({ runtime }) => runtime === `../public/${url}`)).toHaveLength(1);
    }
  });

  it("preserves the supplied translucent mask and alpha borders of both star states", async () => {
    for (const [file, expectedMax] of [["mask", 161], ["star-filled", 255], ["star-empty", 255]] as const) {
      const pixels = await sharp(readFileSync(resolve(SUPPLIED_RUNTIME_DIR, `${file}.png`))).ensureAlpha().raw().toBuffer();
      let min = 255;
      let max = 0;
      for (let i = 3; i < pixels.length; i += 4) { min = Math.min(min, pixels[i]); max = Math.max(max, pixels[i]); }
      expect([min, max]).toEqual([0, expectedMax]);
    }
  });

  it("reuses the three existing formal collection backdrop URLs without duplicate files", () => {
    for (const property of ["background", "topHeader", "titlePanel"] as const) {
      expect(COLLECTION_ALBUM_ART_URLS[property]).toBe(GAME_ART.ui.formalPages.collection[property]);
      const runtime = `../public/${COLLECTION_ALBUM_ART_URLS[property]}`;
      expect(manifest.assets.filter((entry) => entry.runtime === runtime)).toHaveLength(1);
    }
  });

  it("anchors the album title panel to the shared formal-page header", () => {
    const renderer = readFileSync(resolve("src/game/ColorEscapeGame.ts"), "utf8");
    const start = renderer.indexOf("private drawCollectionAlbum(): void");
    const end = renderer.indexOf("private drawDailyTasks(): void", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const albumRenderer = renderer.slice(start, end);
    expect(albumRenderer).toContain(
      "ctx.drawImage(art.titlePanel, COLLECTION_ALBUM_ART_LAYOUT.title.x, COLLECTION_ALBUM_ART_LAYOUT.title.y)",
    );
    expect(albumRenderer).not.toContain("ctx.drawImage(art.titlePanel, FORMAL_COLLECTION_LAYOUT.titlePanel");
  });

  it("keeps all legacy PNG sources and only the retained badge and restored inspiration WebP runtime", () => {
    expect(readdirSync(FORMAL_SOURCE_DIR).sort()).toEqual(
      LEGACY_SOURCE_ASSETS.map(({ file }) => `${file}.png`).sort(),
    );
    expect(readdirSync(FORMAL_RUNTIME_DIR).sort()).toEqual(
      FORMAL_ASSETS.map(({ file }) => `${file}.webp`).sort(),
    );

    const sourceEntry = readFileSync(resolve("art-source/ui/home-v3/collection-album-entry.png"));
    const runtimeEntry = readFileSync(resolve("public/assets/art/ui/home-v3/collection-album-entry.png"));
    expect([...sourceEntry.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(runtimeEntry.equals(sourceEntry)).toBe(true);

    for (const { file } of FORMAL_ASSETS) {
      const source = readFileSync(resolve(FORMAL_SOURCE_DIR, `${file}.png`));
      const runtime = readFileSync(resolve(FORMAL_RUNTIME_DIR, `${file}.webp`));
      expect([...source.subarray(0, 8)], `${file} source format`).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      expect([...runtime.subarray(0, 4)], `${file} RIFF header`).toEqual([82, 73, 70, 70]);
      expect([...runtime.subarray(8, 12)], `${file} WebP header`).toEqual([87, 69, 66, 80]);
    }
    for (const { file, property } of RETIRED_ASSETS) {
      const source = readFileSync(resolve(FORMAL_SOURCE_DIR, `${file}.png`));
      expect([...source.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      expect(manifest.assets.some(({ runtime }) => runtime === `../public/assets/art/ui/formal-pages/collection-album-v1/${file}.webp`)).toBe(false);
      if (property !== "guideBook") {
        expect(manifest.assets.some(({ key }) => key === `ui.formal.collectionAlbum.${property}`)).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(COLLECTION_ALBUM_ART_URLS, property)).toBe(false);
      }
    }
  });

  it("declares one Home entry and one mutually-exclusive formal page group", () => {
    const entry = manifest.assets.find(({ key }) => key === "ui.home.collectionAlbumEntry");
    expect(entry).toEqual({
      key: "ui.home.collectionAlbumEntry",
      source: "ui/home-v3/collection-album-entry.png",
      runtime: "../public/assets/art/ui/home-v3/collection-album-entry.png",
      width: 72,
      height: 72,
      alpha: true,
      grid: [1, 1],
      transform: "copy",
    });

    const formalKeys = new Set(FORMAL_ASSETS.map(({ property }) => `ui.formal.collectionAlbum.${property}`));
    const formalEntries = manifest.assets.filter(({ key }) => formalKeys.has(key));
    expect(formalEntries).toHaveLength(FORMAL_ASSETS.length);
    expect(formalEntries.map(({ key }) => key).sort()).toEqual(
      FORMAL_ASSETS.map(({ property }) => `ui.formal.collectionAlbum.${property}`).sort(),
    );
    for (const expected of FORMAL_ASSETS) {
      const asset = formalEntries.find(({ key }) => key === `ui.formal.collectionAlbum.${expected.property}`);
      expect(asset).toMatchObject({
        source: `ui/formal-pages/collection-album-v1/${expected.file}.png`,
        runtime: `../public/assets/art/ui/formal-pages/collection-album-v1/${expected.file}.webp`,
        width: expected.width,
        height: expected.height,
        alpha: true,
        grid: [1, 1],
        transform: "webp-q72",
        loadGroup: "formal-collection-album",
      });
    }
  });

  it("restores the original 48px palette source as the unchanged-size formal inspiration asset", async () => {
    const source = readFileSync(resolve(FORMAL_SOURCE_DIR, "inspiration.png"));
    const runtime = readFileSync(resolve(FORMAL_RUNTIME_DIR, "inspiration.webp"));
    expect(createHash("sha256").update(source).digest("hex"))
      .toBe("7f40c3bfb431d0221ee800eb0d0457d985bba943a1c9ed2eb36b68f9d30d161e");
    expect(await sharp(source).metadata()).toMatchObject({ format: "png", width: 48, height: 48, hasAlpha: true });
    expect(await sharp(runtime).metadata()).toMatchObject({ format: "webp", width: 48, height: 48, hasAlpha: true });
    expect(COLLECTION_ALBUM_ART_URLS.inspiration)
      .toBe("assets/art/ui/formal-pages/collection-album-v1/inspiration.webp");
    const optimizer = readFileSync(resolve("tools/optimize-assets.mjs"), "utf8");
    expect(optimizer).toMatch(/"collection-album-v1":\s*\[[^\]]*"inspiration\.png"/);
  });

  it("keeps the palette in the album lazy-load/release lifecycle and draws it only beside the masterpiece balance", () => {
    const renderer = readFileSync(resolve("src/game/ColorEscapeGame.ts"), "utf8");
    const method = (start: string, end: string): string => {
      const first = renderer.indexOf(start);
      const last = renderer.indexOf(end, first + start.length);
      expect(first).toBeGreaterThanOrEqual(0);
      expect(last).toBeGreaterThan(first);
      return renderer.slice(first, last);
    };
    const startup = method("private async loadArt(): Promise<void>", "private formalBlockAssetPath(");
    expect(startup).not.toContain("GAME_ART.ui.collectionAlbum");
    const request = method("private requestCollectionAlbumArt(): void", "private requestWinArt(): void");
    expect(request).toContain("const paths = GAME_ART.ui.collectionAlbum;");
    expect(request).toContain("Object.keys(paths)");
    expect(request).toContain("this.loadImages(keys.map((key) => paths[key]))");
    expect(request).toContain("!this.collectionAlbumVisible()");
    const release = method("private collectionAlbumArtImages(", "private releaseAchievementArt(): void");
    expect(release).toContain("return Object.values(art);");
    expect(release).toContain("this.host.releaseImage?.(image)");
    const album = method("private drawCollectionAlbum(): void", "private drawDailyTasks(): void");
    const balance = album.slice(album.indexOf('if (this.collectionAlbumTab === "masterpieces")'), album.indexOf("for (const card of layout.cards)"));
    expect(balance).toContain("this.drawCollectionImageContained(art.inspiration, progress.inspirationIcon)");
    expect(balance).toContain("const balanceText = progress.inspirationText;");
    expect(balance).toContain('this.albumText("inspirationBalance", { amount: this.save.collectionProgress.inspiration })');
    expect(balance).toContain("balanceText.x + balanceText.width / 2, balanceText.y + balanceText.height / 2");
    expect(balance).toContain("undefined, 0, balanceText.width - 8 * scale");
    expect(album.match(/art\.inspiration\b/g)).toHaveLength(1);
    expect(album).toContain("ctx.drawImage(art.suppliedProgressIcon, progress.icon.x, progress.icon.y, progress.icon.width, progress.icon.height)");
    expect(album).toContain('this.albumText("collectionProgress", categoryProgress)');
  });

  it("keeps all 200 level and 40 masterpiece illustrations in replaceable 5x5 atlases", () => {
    expect(readdirSync(ATLAS_SOURCE_DIR).filter((file: string) => file.endsWith(".png")).sort()).toEqual(
      CARD_ATLASES.map((file) => `${file}.png`).sort(),
    );
    expect(readdirSync(ATLAS_RUNTIME_DIR).sort()).toEqual(
      CARD_ATLASES.map((file) => `${file}.jpg`).sort(),
    );

    for (const file of CARD_ATLASES) {
      const source = readFileSync(resolve(ATLAS_SOURCE_DIR, `${file}.png`));
      const runtime = readFileSync(resolve(ATLAS_RUNTIME_DIR, `${file}.jpg`));
      expect([...source.subarray(0, 8)], `${file} source format`).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      expect([...runtime.subarray(0, 3)], `${file} JPEG header`).toEqual([255, 216, 255]);
    }

    const atlasEntries = manifest.assets.filter(({ key }) => /(?:level|masterpiece)Atlas\d{2}$/.test(key));
    expect(atlasEntries).toHaveLength(10);
    for (const [index, file] of CARD_ATLASES.entries()) {
      const family = index < LEVEL_ATLASES.length ? "levelAtlas" : "masterpieceAtlas";
      const ordinal = index < LEVEL_ATLASES.length ? index + 1 : index - LEVEL_ATLASES.length + 1;
      const asset = atlasEntries.find(({ key }) => key === `ui.formal.collectionAlbum.${family}${String(ordinal).padStart(2, "0")}`);
      expect(asset).toMatchObject({
        source: `ui/formal-pages/collection-card-atlases-v1/${file}.png`,
        runtime: `../public/assets/art/ui/formal-pages/collection-card-atlases-v1/${file}.jpg`,
        width: 1000,
        height: 1000,
        alpha: false,
        grid: [5, 5],
        transform: "jpeg-1000-q60",
        loadGroup: "formal-collection-album",
      });
    }
  });

  it("exports typed standalone URLs without changing the records collection", () => {
    const typedUrls: CollectionAlbumArtUrls = COLLECTION_ALBUM_ART_URLS;
    const typedAtlases: CollectionCardAtlasUrls = COLLECTION_CARD_ATLAS_URLS;
    expect(GAME_ART.ui.collectionAlbum).toBe(COLLECTION_ALBUM_ART_URLS);
    expect(GAME_ART.ui.collectionCardAtlases).toBe(COLLECTION_CARD_ATLAS_URLS);
    expect(GAME_ART.ui.home.collectionAlbumEntry).toBe("assets/art/ui/home-v3/collection-album-entry.png");
    expect(Object.keys(typedUrls).sort()).toEqual([
      "background", "topHeader", "titlePanel", "detailClose",
      ...SUPPLIED_ASSETS.map(({ property }) => property),
      ...FORMAL_ASSETS.map(({ property }) => property),
    ].sort());
    for (const asset of FORMAL_ASSETS) {
      expect(typedUrls[asset.property]).toBe(
        `assets/art/ui/formal-pages/collection-album-v1/${asset.file}.webp`,
      );
    }

    expect(typedAtlases.levels).toEqual(
      LEVEL_ATLASES.map((file) => `assets/art/ui/formal-pages/collection-card-atlases-v1/${file}.jpg`),
    );
    expect(typedAtlases.masterpieces).toEqual(
      MASTERPIECE_ATLASES.map((file) => `assets/art/ui/formal-pages/collection-card-atlases-v1/${file}.jpg`),
    );

    expect(GAME_ART.ui.formalPages.journey.episodes).toEqual(
      Array.from({ length: 10 }, (_, index) => (
        `assets/art/ui/formal-pages/journey/episode-${String(index + 1).padStart(2, "0")}.webp`
      )),
    );

    expect(GAME_ART.ui.formalPages.collection.background).toBe(
      "assets/art/ui/formal-pages/collection/background.png",
    );
    expect(GAME_ART.ui.formalPages.collection.itemImages).toHaveLength(15);
  });
});
