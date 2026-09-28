import { describe, expect, it } from "vitest";
import { MUSIC_CATALOG, isMusicTrack, musicCatalogEntry, musicTrackForScene } from "../src/audio/musicCatalog";

describe("music library catalog", () => {
  it("keeps unique ids, playable paths, and unlock order", () => {
    const ids = MUSIC_CATALOG.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(MUSIC_CATALOG).toHaveLength(7);
    for (const entry of MUSIC_CATALOG) {
      expect(entry.assetPath).toMatch(/\.mp3$/);
      expect(entry.loopEndSeconds).toBeGreaterThan(entry.loopStartSeconds);
      expect(entry.unlockLevel).toBeGreaterThanOrEqual(1);
    }
    expect(MUSIC_CATALOG.slice(2).map((entry) => entry.unlockLevel)).toEqual([15, 30, 45, 60, 75]);
  });

  it("preserves legacy scene mapping until a player explicitly selects a track", () => {
    expect(musicTrackForScene("menu")).toBe("menu");
    expect(musicTrackForScene("gameplay")).toBe("challenge");
    expect(musicTrackForScene("silent")).toBeUndefined();
    expect(musicTrackForScene("gameplay", "smile")).toBe("smile");
  });

  it("rejects corrupted save ids", () => {
    expect(isMusicTrack("dreamscape")).toBe(true);
    expect(isMusicTrack("missing-track")).toBe(false);
    expect(musicCatalogEntry("splash").artist).toBe("Roa");
  });
});
