import assert from "node:assert/strict";
import { lstat, readFile, realpath, rm } from "node:fs/promises";
import { relative, resolve } from "node:path";

// Exact reviewed exceptions only. Keep these files in public for authoring,
// provenance and the Web editor; the WeChat runtime has no consumer for them.
// source is relative to public/assets; output is the final package location.
export const WECHAT_RESOURCE_EXCLUSIONS = Object.freeze([
  {
    source: "art/gameplay/mechanics/revised-reference-v1/README.md",
    output: "gameplay-art/revised-mechanisms/README.md",
    reason: "authoring-documentation",
  },
  {
    source: "art/gameplay/mechanics/revised-reference-v1/manifest.json",
    output: "gameplay-art/revised-mechanisms/manifest.json",
    reason: "authoring-provenance",
  },
  {
    source: "art/gameplay/mechanics/shutter-nine-slice-v1/README.md",
    output: "gameplay-art/shutter-nine-slice/README.md",
    reason: "authoring-documentation",
  },
  {
    source: "art/gameplay/mechanics/shutter-nine-slice-v1/manifest.json",
    output: "gameplay-art/shutter-nine-slice/manifest.json",
    reason: "authoring-provenance",
  },
  {
    source: "audio/sfx/manifest.json",
    output: "audio/sfx/manifest.json",
    reason: "authoring-provenance",
  },
  ...["neutral-rail-1-cell.png", "neutral-corner-inner.png", "neutral-corner-outer.png"].map((name) => ({
    source: `art/gameplay/board/formal-border-v1/${name}`,
    output: `assets/art/gameplay/board/formal-border-v1/${name}`,
    reason: "web-editor-only",
  })),
].map((entry) => Object.freeze(entry)));

function checkedRelativePath(path) {
  assert(typeof path === "string" && /^[a-zA-Z0-9._/-]+$/.test(path)
    && path.split("/").every((part) => part && part !== "." && part !== ".."),
  `Unsafe resource policy path: ${path}`);
  return path;
}

const excludedSources = new Set(WECHAT_RESOURCE_EXCLUSIONS.map(({ source }) => checkedRelativePath(source)));
const excludedOutputs = new Set(WECHAT_RESOURCE_EXCLUSIONS.flatMap(({ source, output }) => [
  checkedRelativePath(output), `assets/${source}`,
]));

// Only filter source expectations. Never filter built snapshots: an excluded
// file accidentally reintroduced into a package must remain a verifier error.
export function filterWechatAssetSnapshot(snapshot, sourcePrefix = "") {
  if (sourcePrefix) checkedRelativePath(sourcePrefix);
  return snapshot.filter(({ path }) => {
    checkedRelativePath(path);
    return !excludedSources.has(sourcePrefix ? `${sourcePrefix}/${path}` : path);
  });
}

export function assertWechatResourcesExcluded(snapshot) {
  for (const { path } of snapshot) {
    checkedRelativePath(path);
    assert(!excludedOutputs.has(path), `Non-runtime resource was shipped: ${path}`);
  }
}

export async function removeGeneratedWechatExcludedResources(projectRoot, output) {
  const actualRoot = await realpath(projectRoot);
  const actualOutput = await realpath(output);
  const outputRelative = relative(actualRoot, actualOutput).replaceAll("\\", "/");
  assert(outputRelative === "dist-wechat"
    || (outputRelative.startsWith(".codex-temp/") && !outputRelative.split("/").includes("..")),
  "Unsafe generated resource output");

  const targets = [];
  for (const { source, output: outputPath } of WECHAT_RESOURCE_EXCLUSIONS) {
    const expected = resolve(actualOutput, checkedRelativePath(outputPath));
    const actual = await realpath(expected);
    assert(actual === expected && (await lstat(expected)).isFile(), "Symlinked or non-file generated resource");
    assert(relative(actualOutput, actual).replaceAll("\\", "/") === outputPath,
      "Generated resource escapes output");
    const original = await readFile(resolve(actualRoot, "public/assets", source));
    assert(original.equals(await readFile(actual)), `Generated exclusion differs from its source: ${source}`);
    targets.push(actual);
  }
  // Validate all exact generated copies before deleting any; never remove
  // a directory or authored resource, and never suppress missing-file errors.
  for (const target of targets) await rm(target);
  return WECHAT_RESOURCE_EXCLUSIONS;
}
