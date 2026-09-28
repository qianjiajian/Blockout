// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { createHash } from "node:crypto";
// @ts-expect-error The app tsconfig intentionally excludes Node ambient types; Vitest still runs in Node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS } from "../src/core/levels";

interface CertificationEntry {
  levelId: number;
  canonicalLevelSpecSha256: string;
  parMoves: number;
  clearLoad: number;
  minimumRepositionOverhead: number;
  completionWitness: {
    actions: number;
    repositionOverhead: number;
    replayComplete: boolean;
    automaticEdgeExitSemanticsChecked: boolean;
    routeSource: string;
    routeSourceSha256: string;
  };
  floorProof: { certified: boolean; source: string; sourceSha256: string };
}

const CERTIFICATION = JSON.parse(readFileSync(new URL(
  "../deliverables/original-levels/pipeline/blockout-lv031-lv040-certification.json",
  import.meta.url,
), "utf8")) as {
  levelCount: number;
  allProductionSpecsBound: boolean;
  allCompletionWitnessesReplay: boolean;
  allFloorsCertified: boolean;
  entries: CertificationEntry[];
};

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  const object = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(object).sort()
    .filter((key) => object[key] !== undefined)
    .map((key) => [key, stableValue(object[key])]));
};
const hashValue = (value: unknown): string => createHash("sha256")
  .update(JSON.stringify(stableValue(value)))
  .digest("hex")
  .toUpperCase();
const hashRootFile = (relativePath: string): string => createHash("sha256")
  .update(readFileSync(new URL(`../${relativePath}`, import.meta.url)))
  .digest("hex")
  .toUpperCase();

describe("chapter four production certification", () => {
  it("binds every Lv31-Lv40 LevelSpec to a replayed route and strict floor proof", () => {
    expect(CERTIFICATION).toMatchObject({
      levelCount: 10,
      allProductionSpecsBound: true,
      allCompletionWitnessesReplay: true,
      allFloorsCertified: true,
    });
    expect(CERTIFICATION.entries.map((entry) => entry.levelId)).toEqual(
      Array.from({ length: 10 }, (_, index) => index + 31),
    );
    for (const entry of CERTIFICATION.entries) {
      const level = LEVELS[entry.levelId - 1];
      expect(hashValue(level), `Lv${entry.levelId} production SHA`).toBe(entry.canonicalLevelSpecSha256);
      expect(level.parMoves).toBe(entry.parMoves);
      expect(level.designTargets?.minimumRepositionOverhead).toBe(entry.minimumRepositionOverhead);
      expect(entry.completionWitness).toMatchObject({
        actions: entry.parMoves,
        repositionOverhead: entry.parMoves - entry.clearLoad,
        replayComplete: true,
        automaticEdgeExitSemanticsChecked: true,
      });
      expect(entry.completionWitness.repositionOverhead).toBeGreaterThanOrEqual(entry.minimumRepositionOverhead);
      expect(hashRootFile(entry.completionWitness.routeSource)).toBe(entry.completionWitness.routeSourceSha256);
      expect(entry.floorProof.certified).toBe(true);
      expect(hashRootFile(entry.floorProof.source)).toBe(entry.floorProof.sourceSha256);
    }
  });
});
