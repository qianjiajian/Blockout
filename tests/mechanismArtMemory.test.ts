import { describe, expect, it, vi } from "vitest";
import { getLevel, LEVELS } from "../src/core/levels";
import { usesRevisedMechanisms } from "../src/core/mechanismRules";
import type { LevelSpec } from "../src/core/types";
import { ColorEscapeGame } from "../src/game/ColorEscapeGame";
import { ACTIVE_REVISED_MECHANISM_ART_PATHS, REVISED_MECHANISM_ART_URLS as urls, requiredMechanismArtPaths } from "../src/game/revisedMechanismArt";
import { SHUTTER_NINE_SLICE_PATHS } from "../src/game/shutterNineSlice";

const flush = async () => { for (let n = 0; n < 8; n++) await Promise.resolve(); };
function fixture(level: LevelSpec) {
  const requests: { paths: string[]; resolve(images: HTMLImageElement[]): void; reject(error: Error): void }[] = [];
  const game = Object.create(ColorEscapeGame.prototype) as any;
  Object.assign(game, {
    model: { level }, revisedArt: new Map(), revisedArtPaths: [], revisedArtRequestToken: 0,
    revisedArtLoading: false, revisedArtRetryAt: 0, revisedArtFailures: 0,
    host: { releaseImage: vi.fn() }, scheduleFrame: vi.fn(),
    loadImages: vi.fn((paths: string[]) => new Promise<HTMLImageElement[]>((resolve, reject) => requests.push({ paths, resolve, reject }))),
  });
  return { game, requests };
}
const imagesFor = (paths: string[]) => paths.map(src => ({ src }) as HTMLImageElement);

describe("mechanism images follow the complete current level inventory", () => {
  it("loads hidden/queued markers and every physical flip portal, including long-door remainders", () => {
    const level: LevelSpec = {
      ...getLevel(21), shutters: [{ id: "hidden", x: 0, y: 0, width: 1, height: 1, count: 5, skin: "lift" }],
      blocks: [{ id: "queued", x: 0, y: 0, shape: [[0, 0]], color: "red", shutterId: "hidden", movementAxis: "vertical", timedBombSeconds: 5 }],
      coloredGrids: [{ id: "grid", color: "blue", cells: [[0, 0]] }],
      flipDoors: [{ id: "door", side: "left", offset: 0, size: 1, color: "red", initiallyOpen: false, frozen: 10,
        portals: [{ side: "top", origin: [0, 0], size: 5 }, { side: "right", origin: [2, 0], size: 4 }] }],
    };
    expect(new Set(requiredMechanismArtPaths(level))).toEqual(new Set([
      ...Object.values(urls.lift), urls.axis.vertical, urls.bombFace, urls.coloredGrids.blue,
      urls.flipDoors.red.horizontal[3], urls.flipDoors.red.horizontal[2],
      urls.flipDoors.red.vertical[3], urls.flipDoors.red.vertical[1],
    ]));
  });

  it("covers the authored mechanisms across all 200 production levels without adding unrelated images", () => {
    for (const level of LEVELS) {
      const paths = requiredMechanismArtPaths(level);
      expect(paths.length).toBe(new Set(paths).size);
      for (const path of paths) expect(ACTIVE_REVISED_MECHANISM_ART_PATHS).toContain(path);
      if (!usesRevisedMechanisms(level)) continue;
      for (const block of level.blocks) {
        if (block.movementAxis) expect(paths).toContain(urls.axis[block.movementAxis]);
        if (block.timedBombSeconds !== undefined) expect(paths).toContain(urls.bombFace);
      }
      for (const door of level.flipDoors ?? []) for (const portal of door.portals?.length ? door.portals : [door]) {
        const orientation = ["top", "bottom"].includes(portal.side) ? "horizontal" : "vertical";
        const spans = portal.size <= 3 ? [portal.size] : [3, ...(portal.size % 3 ? [portal.size % 3] : [])];
        for (const span of spans) expect(paths).toContain(urls.flipDoors[door.color][orientation][span as 1 | 2 | 3]);
      }
    }
    expect(requiredMechanismArtPaths(getLevel(1))).toEqual([]);
  });

  it("reuses shared curtain images, prunes unrelated images, and empties the cache on a plain level", async () => {
    const { game, requests } = fixture(getLevel(20));
    game.ensureRevisedMechanismArt();
    const images = imagesFor(requests[0].paths);
    requests[0].resolve(images); await flush();
    expect(game.revisedArt.size).toBe(9);
    const next = { ...getLevel(21), shutters: getLevel(20).shutters, blocks: [], flipDoors: [], coloredGrids: [] };
    game.model = { level: next }; game.ensureRevisedMechanismArt();
    expect(game.loadImages).toHaveBeenCalledTimes(1);
    expect(game.host.releaseImage).not.toHaveBeenCalled();
    game.model = { level: getLevel(1) }; game.syncRevisedMechanismArtPlan();
    expect(game.revisedArt.size).toBe(0);
    expect(game.host.releaseImage.mock.calls.flat()).toEqual(images);
  });

  it("releases late results without overwriting the newer request or its loading state", async () => {
    const { game, requests } = fixture(getLevel(20));
    game.ensureRevisedMechanismArt();
    game.model = { level: { ...getLevel(21), shutters: [], blocks: [{ ...getLevel(21).blocks[0], movementAxis: "horizontal" }], flipDoors: [], coloredGrids: [] } };
    game.ensureRevisedMechanismArt();
    const oldImages = imagesFor(requests[0].paths);
    requests[0].resolve(oldImages); await flush();
    expect(game.host.releaseImage.mock.calls.flat()).toEqual(oldImages);
    expect(game.revisedArtLoading).toBe(true);
    const current = imagesFor(requests[1].paths);
    requests[1].resolve(current); await flush();
    expect([...game.revisedArt.values()]).toEqual(current);
    expect(game.revisedArtLoading).toBe(false);
  });

  it("does not let old failures poison the new scene's retry state", async () => {
    const { game, requests } = fixture(getLevel(20));
    game.ensureRevisedMechanismArt();
    game.model = { level: getLevel(1) }; game.syncRevisedMechanismArtPlan();
    requests[0].reject(new Error("old request")); await flush();
    expect(game.revisedArtError).toBeUndefined();
    expect(game.revisedArtFailures).toBe(0);
    expect(game.revisedArtRetryAt).toBe(0);
    expect(game.revisedArtLoading).toBe(false);
  });

  it("backs off a current failure and retries without duplicate in-flight loads", async () => {
    const { game, requests } = fixture(getLevel(20));
    game.ensureRevisedMechanismArt(); game.ensureRevisedMechanismArt();
    expect(requests).toHaveLength(1);
    requests[0].reject(new Error("temporary")); await flush();
    game.ensureRevisedMechanismArt(); expect(requests).toHaveLength(1);
    game.revisedArtRetryAt = 0; game.ensureRevisedMechanismArt();
    expect(requests[1].paths).toEqual(SHUTTER_NINE_SLICE_PATHS);
    requests[1].resolve(imagesFor(requests[1].paths)); await flush();
    expect(game.revisedArtError).toBeUndefined();
    expect(game.revisedArtFailures).toBe(0);
  });
});
