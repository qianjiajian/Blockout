import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Build the narrow Lv84 key/lock timing seed.
 *
 * The v6 contract needs the third key in cover-1, but cover-1 opens only after
 * an earlier cover-4 peel.  The inherited route ranked the opening H2 lock
 * before that key and also thawed cover-4's colours too late.  This seed keeps
 * the exact board, piece ids/shapes/orientations/count, gates, stages and timer.
 * Its Lv84-only placements, four hidden body colours and route descriptors:
 *   - ranks b1-01, b1-02 and b2-04 before b1-05 for the exact key binding;
 *   - gives the four non-shell cover-4 bodies already-early gate colours; and
 *   - record a gate-use order of blue, pink, orange, red, purple, yellow,
 *     cyan so the frozen values 2/7/17/22/31 respect the runtime peel.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaults = {
  contract: "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
  baseCandidates: ".codex-temp/numeric-deadline-peel-full-r9/report/formal-candidates.json",
  outputDir: ".codex-temp/video-parity-lv84-keylock-seed",
};

const parseArgs = (argv) => {
  const parsed = { ...defaults };
  const keys = new Map([
    ["--contract", "contract"],
    ["--base-candidates", "baseCandidates"],
    ["--output-dir", "outputDir"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const key = keys.get(argv[index]);
    if (!key) throw new Error(`Unknown option: ${argv[index]}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argv[index]}`);
    parsed[key] = value;
    index += 1;
  }
  return parsed;
};

const options = parseArgs(process.argv.slice(2));
const absolute = (path) => resolve(root, path);
const displayPath = (path) => relative(root, path).replaceAll("\\", "/");
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
};
const pointKey = ([x, y]) => `${x},${y}`;
const shapeSignature = (shape) => {
  const minX = Math.min(...shape.map(([x]) => x));
  const minY = Math.min(...shape.map(([, y]) => y));
  return shape.map(([x, y]) => [x - minX, y - minY])
    .sort((left, right) => left[1] - right[1] || left[0] - right[0])
    .map(pointKey).join("|");
};
const histogram = (blocks) => Object.fromEntries([...blocks.reduce((counts, block) => {
  const key = shapeSignature(block.shape);
  counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}, new Map())].sort(([left], [right]) => left.localeCompare(right)));

const [contractText, candidatesText] = await Promise.all([
  readFile(absolute(options.contract), "utf8"),
  readFile(absolute(options.baseCandidates), "utf8"),
]);
const contract = JSON.parse(contractText);
const candidates = JSON.parse(candidatesText);
const contractEntry = contract.levels.find((entry) => entry.level_id === "Lv084");
const baseEntry = candidates.levels.find((entry) => Number(entry.level?.id ?? entry.id) === 84);
if (!contractEntry || !baseEntry?.level || !Array.isArray(baseEntry.route)) {
  throw new Error("Lv084 contract/base candidate/route is missing.");
}

const target = structuredClone(contractEntry.our_design_target);
const level = structuredClone(baseEntry.level);
const originalLevel = structuredClone(level);
const routeById = new Map(baseEntry.route.map((drag) => [drag.blockId, structuredClone(drag)]));
const requireDrag = (id) => {
  const drag = routeById.get(id);
  if (!drag) throw new Error(`Lv084 base route is missing ${id}.`);
  return drag;
};

const bodyColours = new Map([
  ["cc-084-b5-01", "blue"],
  ["cc-084-b5-02", "pink"],
  ["cc-084-b5-03", "blue"],
  ["cc-084-b5-05", "red"],
]);
for (const [id, color] of bodyColours) {
  const block = level.blocks.find((candidate) => candidate.id === id);
  if (!block) throw new Error(`Lv084 base level is missing ${id}.`);
  block.color = color;
}

// Give the opening and the early cover-4 cohort independent lanes.  The
// original lower-right knot required temporary parking before the key cycle
// could even begin; these positions preserve every shape/orientation while
// making the pre-cover peel monotonic.
const placements = new Map(Object.entries({
  "cc-084-b1-01": [6, 8],
  "cc-084-b1-02": [6, 3],
  "cc-084-b1-03": [5, 8],
  "cc-084-b1-04": [4, 8],
  "cc-084-b1-05": [4, 4],
  "cc-084-b1-06": [6, 6],
  "cc-084-b1-07": [6, 0],
  "cc-084-b1-08": [3, 0],
  "cc-084-b1-09": [3, 6],
  "cc-084-b1-10": [3, 8],
  "cc-084-b1-11": [0, 0],
  "cc-084-b1-12": [4, 6],
  "cc-084-b2-01": [0, 5],
  "cc-084-b2-02": [0, 9],
  "cc-084-b2-03": [3, 2],
  "cc-084-b2-04": [1, 2],
  "cc-084-b5-01": [1, 4],
  "cc-084-b5-02": [0, 3],
  "cc-084-b5-03": [0, 8],
  "cc-084-b5-04": [4, 2],
  "cc-084-b5-05": [2, 2],
}));
for (const [id, [x, y]] of placements) {
  const block = level.blocks.find((candidate) => candidate.id === id);
  if (!block) throw new Error(`Lv084 base level is missing placement target ${id}.`);
  Object.assign(block, { x, y });
}
const shutterPlacements = [[0, 9], [3, 9], [3, 4], [3, 5]];
level.shutters.forEach((shutter, index) => Object.assign(shutter, {
  x: shutterPlacements[index][0],
  y: shutterPlacements[index][1],
}));

// This route is an assignment/thaw seed.  Runtime assembly independently
// synthesizes and fresh-replays the physical interleaving after mechanisms are
// installed, so covered b2-04 may intentionally precede cover-4 in this list.
const routeOrder = [
  "cc-084-b1-01", // blue ordinary gate + opening key 1
  "cc-084-b1-02", // pink ordinary gate + opening key 2
  "cc-084-b2-04", // orange frozen 2 gate + staged key 3
  "cc-084-b1-08", // red frozen 7 gate
  "cc-084-b1-07", // yellow frozen 22 gate
  "cc-084-b1-11",
  "cc-084-b1-03",
  "cc-084-b1-04",
  "cc-084-b1-06",
  "cc-084-b1-09",
  "cc-084-b1-10",
  "cc-084-b1-12",
  "cc-084-b1-05", // opening H2 lock acts only after all three keys
  "cc-084-b2-01",
  "cc-084-b2-02",
  "cc-084-b2-03", // cyan can safely take the final frozen value 31
  "cc-084-b3-03",
  "cc-084-b3-01",
  "cc-084-b3-02",
  "cc-084-b4-01",
  "cc-084-b4-02",
  "cc-084-b5-02",
  "cc-084-b5-01",
  "cc-084-b5-03",
  "cc-084-b5-05",
  "cc-084-b5-04", // retained as the cover-4 shell carrier / purple final use
];
if (new Set(routeOrder).size !== level.blocks.length || routeOrder.length !== level.blocks.length) {
  throw new Error("Lv084 route order must contain every block exactly once.");
}
const route = routeOrder.map(requireDrag);
route.splice(route.findIndex((drag) => drag.blockId === "cc-084-b1-08") + 1, 0, {
  ...structuredClone(requireDrag("cc-084-b5-04")),
  path: [[1, 8]],
  exitSide: "bottom",
  purpose: "early-purple-thaw-timing-descriptor",
});
// The route is consumed as a clear-layer timing descriptor before the fresh
// dynamic witness is synthesized.  Point the purple outer shell at its actual
// purple gate so the thaw timeline sees purple before the later cyan core.
route.find((drag) => drag.blockId === "cc-084-b2-04").path = [[1, 0]];
Object.assign(route.find((drag) => drag.blockId === "cc-084-b2-02"), {
  path: [[0, 9]],
  exitSide: "bottom",
});

const mask = Array.from({ length: level.height }, (_, y) => Array.from(
  { length: level.width },
  (_, x) => level.playable.some(([cellX, cellY]) => cellX === x && cellY === y) ? "#" : ".",
).join(""));
const baseInvariants = {
  board_rows: level.height === originalLevel.height && level.height === target.board.rows,
  board_cols: level.width === originalLevel.width && level.width === target.board.cols,
  playable_mask: JSON.stringify(mask) === JSON.stringify(target.board.playable_mask),
  playable_cells: new Set(level.playable.map(pointKey)).size === target.board.playable_cell_count,
  block_ids: JSON.stringify(level.blocks.map(({ id }) => id)) === JSON.stringify(originalLevel.blocks.map(({ id }) => id)),
  block_orientations: level.blocks.every((block, index) => JSON.stringify(block.shape) === JSON.stringify(originalLevel.blocks[index].shape)),
  block_shapes: JSON.stringify(histogram(level.blocks)) === JSON.stringify(histogram(originalLevel.blocks)),
  gate_geometry_and_colours: JSON.stringify(level.gates) === JSON.stringify(originalLevel.gates),
  stage_ids_and_counts: level.shutters.every((shutter, index) => (
    shutter.id === originalLevel.shutters[index].id
    && shutter.count === originalLevel.shutters[index].count
  )),
  timer: level.timeSeconds === originalLevel.timeSeconds && level.timeSeconds === target.time_seconds,
  route_complete_membership: route.every((drag) => level.blocks.some((block) => block.id === drag.blockId)),
};
if (!Object.values(baseInvariants).every(Boolean)) {
  throw new Error(`Lv084 protected base invariant drift: ${JSON.stringify(baseInvariants)}.`);
}

const outputDir = absolute(options.outputDir);
const overridePath = resolve(outputDir, "base-overrides.json");
const auditPath = resolve(outputDir, "audit.json");
const generatedOn = new Date().toISOString();
const override = {
  schema_version: "blockout-video-parity-lv84-keylock-base-override-v1",
  generated_on: generatedOn,
  source: {
    contract: { path: options.contract, sha256: sha256(contractText) },
    base_candidates: { path: options.baseCandidates, sha256: sha256(candidatesText) },
  },
  policy: {
    scope: "Lv084 key-lock dependency and cover-4 thaw seed only",
    immutable: "board, mask, block ids/shapes/orientations/count, gate geometry/colors/count, stage groups/counts, timer, contract target",
    permitted_changes: "Lv084 block/device positions, authored route timing descriptors, and four cover-4 non-shell body colors within the exact seven-color palette",
    runtime_proof: "assemble-video-parity-runtime must report validate pass, exact contract pass, dependency-safe exact key/lock ids, and a fresh independent completion replay",
  },
  levels: [{
    level_id: "Lv084",
    target,
    level,
    route,
    validation: {
      protected_base_invariants: baseInvariants,
      recolored_block_ids: [...bodyColours.keys()],
      assignment_order: routeOrder,
      expected_key_block_ids: ["cc-084-b1-01", "cc-084-b1-02", "cc-084-b2-04"],
      expected_lock_block_id: "cc-084-b1-05",
    },
  }],
};
const overrideText = `${JSON.stringify(override, null, 2)}\n`;
const audit = {
  schema_version: "blockout-video-parity-lv84-keylock-seed-audit-v1",
  generated_on: generatedOn,
  source: override.source,
  output: {
    path: displayPath(overridePath),
    sha256: sha256(overrideText),
    canonical_level_sha256: sha256(JSON.stringify(canonical(level))),
    canonical_route_sha256: sha256(JSON.stringify(canonical(route))),
  },
  checks: baseInvariants,
  changes: {
    contract_scoped_only: true,
    body_colours: Object.fromEntries(bodyColours),
    placements: Object.fromEntries(placements),
    shutter_placements: shutterPlacements,
  },
};

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(overridePath, overrideText, "utf8"),
  writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8"),
]);
console.log(JSON.stringify(audit, null, 2));
