import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Promote the solver-validated Lv20 original outline without rewriting the
// immutable competitor-video truth or regenerating unrelated contract levels.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRelative = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json";
const outputRelative = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v7.json";
const expectedSourceSha256 = "4C6618C1D66192693C1E7711C987EF4810A15BA4A2DC620E78716840E2BD5A7B";
const expectedTruthSha256 = "20CA38CBD36E6543E99A1C8A972880D16CCAE0B119581802CFA47C569DFC1D7E";
const lv20Mask = [
  "##.#.",
  "#####",
  "#####",
  ".###.",
  "#####",
  "#.###",
  "####.",
  "#..##",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
};
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const maskCount = (mask) => mask.reduce(
  (sum, row) => sum + [...row].filter((cell) => cell === "#").length,
  0,
);
const componentCount = (mask) => {
  const rows = mask.length;
  const cols = mask[0]?.length ?? 0;
  const pending = new Set();
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (mask[row][col] === "#") pending.add(`${row},${col}`);
    }
  }
  let components = 0;
  while (pending.size) {
    components += 1;
    const seed = pending.values().next().value;
    pending.delete(seed);
    const queue = [seed];
    while (queue.length) {
      const [row, col] = queue.shift().split(",").map(Number);
      for (const [nextRow, nextCol] of [
        [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1],
      ]) {
        const key = `${nextRow},${nextCol}`;
        if (pending.delete(key)) queue.push(key);
      }
    }
  }
  return components;
};
const spansEnvelope = (mask) => (
  mask[0].includes("#")
  && mask.at(-1).includes("#")
  && mask.some((row) => row[0] === "#")
  && mask.some((row) => row.at(-1) === "#")
);

const sourcePath = resolve(root, sourceRelative);
const outputPath = resolve(root, outputRelative);
const sourceText = await readFile(sourcePath, "utf8");
const sourceSha256 = sha256(sourceText);
if (sourceSha256 !== expectedSourceSha256) {
  throw new Error(`Unexpected v6 contract SHA-256: ${sourceSha256}`);
}
const source = JSON.parse(sourceText);
if (source.truth_sha256 !== expectedTruthSha256) {
  throw new Error(`Unexpected immutable truth SHA-256: ${source.truth_sha256}`);
}
if (!Array.isArray(source.levels) || source.levels.length !== 100) {
  throw new Error("The v6 source contract must contain exactly 100 levels.");
}

const contract = structuredClone(source);
contract.schema_version = "blockout-video-parity-design-contract-v7";
contract.title = "Block Out! Lv1-100 competitor-video composition parity + original board contract v7";
contract.generated_on = "2026-09-16";
contract.revision = {
  parent_contract: { path: sourceRelative, sha256: sourceSha256 },
  immutable_truth_preserved: true,
  changed_level_ids: ["Lv020"],
  reason: "Lv20 original outline approved under the user's explicit outer-frame adjustment allowance and validated against its strict reposition floor.",
};

const lv20 = contract.levels.find((entry) => entry.level_id === "Lv020");
const sourceLv20 = source.levels.find((entry) => entry.level_id === "Lv020");
if (!lv20 || !sourceLv20) throw new Error("Lv020 is missing from the source contract.");
const board = lv20.our_design_target?.board;
if (!board || board.rows !== 8 || board.cols !== 5 || board.playable_cell_count !== 32) {
  throw new Error("Lv020 scalar board contract is not the expected 8x5 / 32-cell target.");
}
if (lv20Mask.length !== board.rows
  || lv20Mask.some((row) => row.length !== board.cols || !/^[.#]+$/.test(row))
  || maskCount(lv20Mask) !== board.playable_cell_count
  || componentCount(lv20Mask) !== 1
  || !spansEnvelope(lv20Mask)) {
  throw new Error("Lv020 promoted mask is not a connected envelope-spanning 8x5 / 32-cell outline.");
}
if (same(lv20Mask, sourceLv20.competitor_reference.board.source_playable_mask)
  || same(lv20Mask, sourceLv20.our_design_target.board.playable_mask)) {
  throw new Error("Lv020 promoted mask must differ from both the competitor outline and the v6 target.");
}
board.playable_mask = lv20Mask;
board.connected_component_count = 1;
board.originality_status = "generated_v6_physical_cover_prefix_floor11";
board.competitor_mask_comparison = "different";

for (const [index, entry] of contract.levels.entries()) {
  if (entry.level_id === "Lv020") {
    const expected = structuredClone(source.levels[index]);
    expected.our_design_target.board.playable_mask = lv20Mask;
    expected.our_design_target.board.connected_component_count = 1;
    expected.our_design_target.board.originality_status = "generated_v6_physical_cover_prefix_floor11";
    expected.our_design_target.board.competitor_mask_comparison = "different";
    if (!same(entry, expected)) throw new Error("Lv020 changed outside the approved board-outline fields.");
  } else if (!same(entry, source.levels[index])) {
    throw new Error(`${entry.level_id}: unrelated contract entry changed during v7 promotion.`);
  }
}

const outputText = `${JSON.stringify(contract, null, 2)}\n`;
await writeFile(outputPath, outputText, "utf8");
console.log(JSON.stringify({
  output: relative(root, outputPath).replaceAll("\\", "/"),
  sha256: sha256(outputText),
  parent_sha256: sourceSha256,
  truth_sha256: contract.truth_sha256,
  changed_level_ids: contract.revision.changed_level_ids,
  lv20_board: {
    rows: board.rows,
    cols: board.cols,
    playable_cell_count: maskCount(board.playable_mask),
    connected_component_count: componentCount(board.playable_mask),
    spans_envelope: spansEnvelope(board.playable_mask),
    differs_from_competitor: !same(board.playable_mask, lv20.competitor_reference.board.source_playable_mask),
    differs_from_v6: !same(board.playable_mask, sourceLv20.our_design_target.board.playable_mask),
  },
}, null, 2));
