import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { WELFARE_SUPPLIED_ART } from "../src/game/welfareSuppliedArt";

describe("supplied welfare PNG provenance", () => {
  it("preserves all 23 supplied PNGs as byte-identical archived and runtime copies", () => {
    const provenance = JSON.parse(readFileSync("art-source/ui/shop-supplied-v1/provenance.json", "utf8"));
    expect(provenance.assets).toHaveLength(23);
    expect(provenance.assets.map(asset => asset.key).sort()).toEqual(Object.keys(WELFARE_SUPPLIED_ART).sort());
    const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
    for (const asset of provenance.assets) {
      expect(asset.runtime).toBe(`public/${WELFARE_SUPPLIED_ART[asset.key]}`);
      const archive = readFileSync(asset.archive), runtime = readFileSync(asset.runtime);
      expect(archive.equals(runtime), `${asset.key} must retain the supplied PNG bytes`).toBe(true);
      expect(runtime.length).toBe(asset.bytes);
      expect(runtime.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(runtime.readUInt32BE(16)).toBe(asset.width);
      expect(runtime.readUInt32BE(20)).toBe(asset.height);
      expect(sha256(archive)).toBe(asset.archiveSha256);
      expect(sha256(runtime)).toBe(asset.runtimeSha256);
      expect(asset.archiveSha256).toBe(asset.sourceSha256);
      expect(asset.runtimeSha256).toBe(asset.sourceSha256);
      // External source folders are optional on CI; repository copies and their hashes are required.
      if (existsSync(asset.source)) expect(sha256(readFileSync(asset.source))).toBe(asset.sourceSha256);
    }
  });
});
