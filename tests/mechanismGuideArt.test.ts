// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { readFileSync, readdirSync } from "node:fs";
// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { resolve } from "node:path";
// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { createHash } from "node:crypto";
// @ts-expect-error The app tsconfig excludes Node ambient types; Vitest runs in Node.
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { GAME_ART, COLLECTION_ALBUM_ART_URLS } from "../src/game/artManifest";
import { MECHANISM_GUIDE } from "../src/core/mechanismCatalog";

const sharp = createRequire(import.meta.url)("sharp");
const SOURCE = resolve("art-source/ui/formal-pages/mechanism-guide-v2");
const RUNTIME = resolve("public/assets/art/ui/formal-pages/mechanism-guide-v2");
const URL_ROOT = "assets/art/ui/formal-pages/mechanism-guide-v2/";
const ASSETS = [
  {
    "file": "card.png",
    "width": 158,
    "height": 198,
    "sha": "b2f854a41796592f3698716c84fbc9f1df7ad9460361bb7004e64c49b4750772",
    "bytes": 19047,
    "runtime": 18678
  },
  {
    "file": "detail-body.png",
    "width": 484,
    "height": 157,
    "sha": "8b5d65b013d4f74042ea34bb475e6133e0463afd8556f8af23450588dd24ea91",
    "bytes": 8370,
    "runtime": 8088
  },
  {
    "file": "detail-panel.png",
    "width": 571,
    "height": 294,
    "sha": "50c31aa1988e58c660bb85ecd92377e4e61a05bc22c670bfe240cc6fbd6fe260",
    "bytes": 7814,
    "runtime": 7369
  },
  {
    "file": "detail-title.png",
    "width": 281,
    "height": 49,
    "sha": "fe4c49c4bf13b9f390ab3e4dfda8968245e8bc08e5574d5bcbef93c5b1ca3217",
    "bytes": 909,
    "runtime": 634
  },
  {
    "file": "icon-axis-block.png",
    "width": 135,
    "height": 98,
    "sha": "8327a8fc284d49c1331a21d6fddeb4ab2fe3b23c502fb95a1cc287c5de2ee5c6",
    "bytes": 19353,
    "runtime": 19078
  },
  {
    "file": "icon-color-exit.png",
    "width": 84,
    "height": 100,
    "sha": "315826489e476bd1f3bca474fcf63f5264784e0b5af57abbc9414ce9a7a5adc9",
    "bytes": 16499,
    "runtime": 16463
  },
  {
    "file": "icon-frozen-exit.png",
    "width": 107,
    "height": 95,
    "sha": "0ee4ca7668bc9eccbb5e64812bc9a1317f36af9179a7298420dbc99bec612cb7",
    "bytes": 17356,
    "runtime": 17212
  },
  {
    "file": "icon-generator.png",
    "width": 81,
    "height": 92,
    "sha": "53501a1fb9c64122289a62eab802b53e02190f7cf14c0ecbc6090e77337de5c3",
    "bytes": 12586,
    "runtime": 12510
  },
  {
    "file": "icon-irregular-block.png",
    "width": 82,
    "height": 83,
    "sha": "f76dcd79ed7194ddd58737176e19edf76a40f153ef7846c507ec492ccef0af8c",
    "bytes": 10916,
    "runtime": 10846
  },
  {
    "file": "icon-irregular-board.png",
    "width": 93,
    "height": 97,
    "sha": "a96b397b2007b245e891c83079f863be62de8dea71cb5205de4a732747a10d20",
    "bytes": 15200,
    "runtime": 15093
  },
  {
    "file": "icon-key-lock.png",
    "width": 109,
    "height": 108,
    "sha": "385a65baae0982d982db0c3643fa2edd144601cdc51f695913b39973afcbb45f",
    "bytes": 19232,
    "runtime": 19026
  },
  {
    "file": "icon-layered-lift.png",
    "width": 91,
    "height": 107,
    "sha": "ccdad207f3634a5231a6ff3fffb9a8cbd073646bbd642155905d065f88de0a1e",
    "bytes": 18174,
    "runtime": 18006
  },
  {
    "file": "icon-multilayer-shell.png",
    "width": 94,
    "height": 98,
    "sha": "d053e6e3cb30e4f9afd602f02146c292b06f09398deda1533aa508288cd0b51f",
    "bytes": 15619,
    "runtime": 15444
  },
  {
    "file": "icon-numeric-ice.png",
    "width": 98,
    "height": 106,
    "sha": "4bdd196c517ac927a4662c1142b5f04352af457db0764acc4796c0d86faa2106",
    "bytes": 17205,
    "runtime": 17099
  },
  {
    "file": "icon-shutter.png",
    "width": 98,
    "height": 97,
    "sha": "3072822a38363fe857dff3e795a231c82d022863199155a7da21eb1e661d594d",
    "bytes": 16846,
    "runtime": 16690
  },
  {
    "file": "icon-star.png",
    "width": 115,
    "height": 109,
    "sha": "bf6288286f091988a76604f67563f951033f4adfaea348f702d13724deaed906",
    "bytes": 21147,
    "runtime": 20984
  },
  {
    "file": "lock.png",
    "width": 64,
    "height": 77,
    "sha": "8a8a42b5bb1c3fb54ba4c148151fb40b697538e9bf99a15d37f835f3cd6b0d9d",
    "bytes": 7360,
    "runtime": 7277
  },
  {
    "file": "locked-overlay.png",
    "width": 159,
    "height": 197,
    "sha": "e0dba8883d6199f4f6ead3493d244acd2edce00aa5304bac246dacbcc2a3408f",
    "bytes": 3278,
    "runtime": 3163
  },
  {
    "file": "panel.png",
    "width": 677,
    "height": 1152,
    "sha": "4465063b7dd8cfc689286eeb1c37af01409e2ef9e826dc20acd3547d640b883d",
    "bytes": 53134,
    "runtime": 49845
  },
  {
    "file": "selected.png",
    "width": 174,
    "height": 212,
    "sha": "ebba1a4e6cef55c6d5f2bec73abf46fda64bfc7c6e19f39ae442f73f5e6251c2",
    "bytes": 12840,
    "runtime": 12360
  },
  {
    "file": "icon-flip-door.png",
    "width": 101,
    "height": 106,
    "sha": "ce0555ef225387b0a964fe2a3fef6106b702a1fa9b6f7097f9361a7b14ddef5b",
    "bytes": 17740,
    "runtime": 17474
  },
  {
    "file": "icon-colored-grid.png",
    "width": 136,
    "height": 95,
    "sha": "9a605ba3c9f6b71ad38f71a004772ac680391347e8063645b681f0265c4c358f",
    "bytes": 20509,
    "runtime": 20331
  },
  {
    "file": "icon-bomb.png",
    "width": 97,
    "height": 117,
    "sha": "66b79ba16ef4684757a90f6b695e1e36bcc9c4d60197166a0d72f579c1840663",
    "bytes": 21924,
    "runtime": 21761
  }
] as const;
const SOURCE_ONLY = [
  {
    "file": "close.png",
    "width": 94,
    "height": 98,
    "sha": "fd6df9c51e81220161239dd0e405ce5ab8080827c22b7bd703650150659167ec",
    "bytes": 10556,
    "runtime": null
  },
  {
    "file": "reference-layout.png",
    "width": 720,
    "height": 1584,
    "sha": "df2a20aa26d55963c0e2dbf92adc8b45eb15027a6756deafbcc5b7bd03e4f710",
    "bytes": 499331,
    "runtime": null
  },
  {
    "file": "unused-icon-bomb.png",
    "width": 97,
    "height": 117,
    "sha": "66b79ba16ef4684757a90f6b695e1e36bcc9c4d60197166a0d72f579c1840663",
    "bytes": 21924,
    "runtime": null
  },
  {
    "file": "unused-icon-color-floor.png",
    "width": 136,
    "height": 95,
    "sha": "9a605ba3c9f6b71ad38f71a004772ac680391347e8063645b681f0265c4c358f",
    "bytes": 20509,
    "runtime": null
  },
  {
    "file": "unused-icon-flip-gate.png",
    "width": 101,
    "height": 106,
    "sha": "ce0555ef225387b0a964fe2a3fef6106b702a1fa9b6f7097f9361a7b14ddef5b",
    "bytes": 17740,
    "runtime": null
  },
  {
    "file": "unused-icon-toggle-block.png",
    "width": 110,
    "height": 108,
    "sha": "8a28f73b12edc141e1c5a80aa67e447645baa1a24c69887d9823c210829fc906",
    "bytes": 19311,
    "runtime": null
  }
] as const;
const ICONS = [
  ["generator", "icon-generator"],
  ["axis-block", "icon-axis-block"],
  ["key-lock", "icon-key-lock"],
  ["star", "icon-star"],
  ["flip-door", "icon-flip-door"],
  ["colored-grid", "icon-colored-grid"],
  ["bomb", "icon-bomb"],
  ["shutter", "icon-shutter"],
  ["layered-lift", "icon-layered-lift"],
  ["color-exit", "icon-color-exit"],
  ["irregular-block", "icon-irregular-block"],
  ["irregular-board", "icon-irregular-board"],
  ["frozen-exit", "icon-frozen-exit"],
  ["numeric-ice", "icon-numeric-ice"],
  ["multilayer-shell", "icon-multilayer-shell"],
] as const;
const OLD_FILES = [
  "title-shadow.png", "title.png", "detail-panel.png", "detail-body.png",
  "card.png", "locked-overlay.png", "lock.png", "selected.png",
  ...Array.from({ length: 11 }, (_, index) => `mechanism-${String(index + 1).padStart(2, "0")}.png`),
];
const manifest = JSON.parse(readFileSync(resolve("art-source/manifest.json"), "utf8")) as {
  assets: { key: string; source: string; runtime: string; width: number; height: number; alpha: boolean; transform: string; loadGroup: string }[];
};
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

describe("supplied mechanism guide art", () => {
  it.each(ASSETS)("preserves $file original hash, native dimensions and every RGBA byte", async (asset) => {
    const source = readFileSync(resolve(SOURCE, asset.file));
    const runtime = readFileSync(resolve(RUNTIME, asset.file));
    expect(hash(source)).toBe(asset.sha);
    expect(source.length).toBe(asset.bytes);
    expect(runtime.length).toBe(asset.runtime);
    expect(runtime.length).toBeLessThanOrEqual(source.length);
    for (const image of [source, runtime]) {
      expect(await sharp(image).metadata()).toMatchObject({
        width: asset.width, height: asset.height, hasAlpha: true,
      });
    }
    const sourcePixels = await sharp(source).ensureAlpha().raw().toBuffer();
    const runtimePixels = await sharp(runtime).ensureAlpha().raw().toBuffer();
    expect(runtimePixels.equals(sourcePixels), "including transparent RGB").toBe(true);
    const entries = manifest.assets.filter(({ runtime: path }) => path === `../public/${URL_ROOT}${asset.file}`);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      source: `ui/formal-pages/mechanism-guide-v2/${asset.file}`,
      width: asset.width, height: asset.height, alpha: true,
      transform: "png-lossless-no-resize", loadGroup: "formal-collection",
    });
  });

  it("keeps the historical extras and reference archived while matching the fifteen workbook entries", () => {
    expect(readdirSync(RUNTIME).sort()).toEqual(ASSETS.map(({ file }) => file).sort());
    expect(readdirSync(SOURCE).filter((file: string) => file.endsWith(".png")).sort()).toEqual(
      [...ASSETS, ...SOURCE_ONLY].map(({ file }) => file).sort(),
    );
    for (const asset of SOURCE_ONLY) {
      expect(hash(readFileSync(resolve(SOURCE, asset.file)))).toBe(asset.sha);
      expect(manifest.assets.some(({ source, runtime }) =>
        source === `ui/formal-pages/mechanism-guide-v2/${asset.file}`
        || runtime === `../public/${URL_ROOT}${asset.file}`)).toBe(false);
    }
    expect([...MECHANISM_GUIDE].sort((a, b) => a.atlasIndex - b.atlasIndex)
      .map(({ id }) => id)).toEqual(ICONS.map(([id]) => id));
  });

  it("retains workbook asset indexes independently of guide display order", () => {
    const urls = GAME_ART.ui.formalPages.collection;
    expect(urls.itemImages).toEqual(ICONS.map(([, file]) => `${URL_ROOT}${file}.png`));
    for (const entry of MECHANISM_GUIDE) {
      expect(urls.itemImages[entry.atlasIndex]).toContain(ICONS.find(([id]) => id === entry.id)![1]);
    }
    expect(Object.prototype.hasOwnProperty.call(urls, "colorImage")).toBe(false);
    expect(urls.retiredItemImages).toEqual([]);
    expect(Object.prototype.hasOwnProperty.call(urls, "title")).toBe(false);
    // Removed catalogue references must not delete globally used gameplay art.
    for (const file of ["timed-feeder-v1.png", "staged-frame-v1.png"]) {
      expect(readFileSync(resolve("public/assets/art/gameplay/mechanics/video-parity-v1", file)).length).toBeGreaterThan(0);
    }
  });

  it("reuses the exact Daily close image without deleting shared collection backgrounds", () => {
    const urls = GAME_ART.ui.formalPages.collection;
    const suppliedClose = readFileSync(resolve(SOURCE, "close.png"));
    expect(urls.close).toBe(GAME_ART.ui.dailyTasks.close);
    expect(suppliedClose.equals(readFileSync(resolve("public", urls.close)))).toBe(true);
    expect(manifest.assets.filter(({ runtime }) => runtime === `../public/${urls.close}`)).toHaveLength(1);
    for (const key of ["background", "topHeader", "titlePanel"] as const) {
      expect(urls[key]).toBe(COLLECTION_ALBUM_ART_URLS[key]);
      expect(readFileSync(resolve("public", urls[key])).length).toBeGreaterThan(0);
      expect(manifest.assets.filter(({ runtime }) => runtime === `../public/${urls[key]}`)).toHaveLength(1);
    }
  });

  it("exports the exact modal chrome keys and retains old source PNGs, not old runtimes", () => {
    const urls = GAME_ART.ui.formalPages.collection;
    for (const [key, file] of [
      ["panel", "panel"], ["card", "card"], ["titleShadow", "detail-title"],
      ["detailPanel", "detail-panel"], ["detailBody", "detail-body"],
      ["lockedOverlay", "locked-overlay"], ["lock", "lock"], ["selected", "selected"],
    ] as const) expect(urls[key]).toBe(`${URL_ROOT}${file}.png`);
    expect(readdirSync(resolve("public/assets/art/ui/formal-pages/collection")).sort())
      .toEqual(["background.png", "title-panel.png", "top-header.png"]);
    for (const file of OLD_FILES) {
      expect(readFileSync(resolve("art-source/ui/formal-pages/collection", file)).length).toBeGreaterThan(0);
      expect(manifest.assets.some(({ runtime }) => runtime === `../public/assets/art/ui/formal-pages/collection/${file}`)).toBe(false);
    }
    const instances = [urls.panel, urls.close, urls.titleShadow, urls.card,
      urls.lockedOverlay, urls.lock, urls.selected, urls.detailPanel, urls.detailBody, ...urls.itemImages];
    expect(instances).toHaveLength(24);
    expect(new Set(instances).size).toBe(24);
    expect(ASSETS.reduce((sum, { runtime }) => sum + runtime, 0)).toBe(365431);
  });
});
