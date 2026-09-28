import { describe, expect, it, vi } from "vitest";
import { MECHANISM_GUIDE } from "../src/core/mechanismCatalog";
import { GAME_ART } from "../src/game/artManifest";
import { FeatureIntroIconArt, featureIntroIconPath, type FeatureIntroKind } from "../src/game/featureIntroIcon";

const mappings: [FeatureIntroKind, string][] = [
  ["ice-door", "frozen-exit"], ["ice-block", "numeric-ice"], ["layer", "multilayer-shell"],
  ["shutter", "shutter"], ["generator", "generator"], ["arrow-block", "axis-block"],
  ["key-lock", "key-lock"], ["lift", "layered-lift"], ["star", "star"],
  ["timed-generator", "generator"], ["staged-frame", "layered-lift"],
  ["elevator", "layered-lift"], ["conveyor", "axis-block"],
  ["bomb", "bomb"], ["flip-door", "flip-door"], ["colored-grid", "colored-grid"],
];

function fixture() {
  const requests: { path: string; resolve: (image: HTMLImageElement) => void; reject: (error: Error) => void }[] = [];
  const host = {
    createImage: vi.fn((path: string) => new Promise<HTMLImageElement>((resolve, reject) => requests.push({ path, resolve, reject }))),
    releaseImage: vi.fn(),
  };
  const changed = vi.fn();
  return { host, requests, changed, art: new FeatureIntroIconArt(host, changed) };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

describe("feature intro reuses mechanism guide icons", () => {
  it.each(mappings)("%s uses the exact guide %s asset", (kind, id) => {
    const entry = MECHANISM_GUIDE.find((item) => item.id === id)!;
    expect(featureIntroIconPath(kind)).toBe(GAME_ART.ui.formalPages.collection.itemImages[entry.atlasIndex]);
    expect(featureIntroIconPath(kind)).toContain(`/mechanism-guide-v2/icon-${id}.png`);
  });

  it("loads only the current icon, deduplicates pending renders, releases it after dismissal", async () => {
    const { art, requests, host, changed } = fixture();
    art.sync();
    expect(host.createImage).not.toHaveBeenCalled();
    art.sync("shutter");
    art.sync("shutter");
    expect(requests.map(({ path }) => path)).toEqual([featureIntroIconPath("shutter")]);
    const image = {} as HTMLImageElement;
    requests[0].resolve(image);
    await flush();
    expect(art.image).toBe(image);
    expect(changed).toHaveBeenCalledTimes(1);
    art.sync("shutter");
    art.sync();
    art.sync();
    expect(art.image).toBeUndefined();
    expect(host.releaseImage.mock.calls).toEqual([[image]]);
    expect(host.createImage).toHaveBeenCalledTimes(1);
  });

  it("releases stale images when switching to another card before load finishes", async () => {
    const { art, requests, host } = fixture();
    art.sync("shutter");
    art.sync("ice-block");
    const oldImage = {} as HTMLImageElement;
    const newImage = {} as HTMLImageElement;
    requests[1].resolve(newImage);
    requests[0].resolve(oldImage);
    await flush();
    expect(art.image).toBe(newImage);
    expect(host.releaseImage.mock.calls).toEqual([[oldImage]]);
    art.clear();
    expect(host.releaseImage.mock.calls).toEqual([[oldImage], [newImage]]);
  });

  it("discards an image arriving after leaving the intro", async () => {
    const { art, requests, host, changed } = fixture();
    art.sync("layer");
    art.sync();
    const image = {} as HTMLImageElement;
    requests[0].resolve(image);
    await flush();
    expect(art.image).toBeUndefined();
    expect(host.releaseImage).toHaveBeenCalledWith(image);
    expect(changed).not.toHaveBeenCalled();
  });

  it("allows explicit retry without issuing a failed request on every frame", async () => {
    const { art, requests, host } = fixture();
    art.sync("generator");
    requests[0].reject(new Error("offline"));
    await flush();
    expect(art.error).toBe(true);
    art.sync("generator");
    expect(host.createImage).toHaveBeenCalledTimes(1);
    art.retry("generator");
    expect(art.error).toBe(false);
    expect(host.createImage).toHaveBeenCalledTimes(2);
    const image = {} as HTMLImageElement;
    requests[1].resolve(image);
    await flush();
    expect(art.image).toBe(image);
    expect(art.error).toBe(false);
  });

  it("ignores stale failures after a new card has loaded", async () => {
    const { art, requests } = fixture();
    art.sync("shutter");
    art.sync("star");
    const image = {} as HTMLImageElement;
    requests[1].resolve(image);
    requests[0].reject(new Error("late failure"));
    await flush();
    expect(art.image).toBe(image);
    expect(art.error).toBe(false);
  });
});
