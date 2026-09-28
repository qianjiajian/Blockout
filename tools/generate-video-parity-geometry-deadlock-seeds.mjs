import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Build the three narrow geometry seeds found by the R10 exact-runtime audit.
 *
 * These are base-only substitutions. Runtime mechanisms remain owned by
 * assemble-video-parity-runtime.mjs and every emitted target is byte-for-byte
 * bound to the active v6 contract.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaults = {
  contract: "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
  baseCandidates: ".codex-temp/numeric-deadline-peel-full-r9/report/formal-candidates.json",
  outputDir: ".codex-temp/video-parity-geometry-deadlock-seeds",
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
const sha256 = (source) => createHash("sha256").update(source).digest("hex").toUpperCase();
const pointKey = ([x, y]) => `${x},${y}`;
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
};
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
const stageHistogram = (blocks) => Object.fromEntries([...blocks.reduce((counts, block) => {
  const stage = block.shutterId ?? "opening";
  const shapes = counts.get(stage) ?? new Map();
  const key = shapeSignature(block.shape);
  shapes.set(key, (shapes.get(key) ?? 0) + 1);
  counts.set(stage, shapes);
  return counts;
}, new Map())].sort(([left], [right]) => left.localeCompare(right)).map(([stage, shapes]) => [
  stage,
  Object.fromEntries([...shapes].sort(([left], [right]) => left.localeCompare(right))),
]));
const maskOf = (level) => {
  const playable = new Set(level.playable.map(pointKey));
  return Array.from({ length: level.height }, (_, y) => Array.from(
    { length: level.width },
    (_, x) => playable.has(`${x},${y}`) ? "#" : ".",
  ).join(""));
};
const blockById = (level, id) => {
  const block = level.blocks.find((candidate) => candidate.id === id);
  if (!block) throw new Error(`Lv${level.id}: missing block ${id}.`);
  return block;
};
const setPlacement = (level, id, [x, y]) => Object.assign(blockById(level, id), { x, y });
const setColor = (level, id, color) => Object.assign(blockById(level, id), { color });

const [contractText, candidatesText] = await Promise.all([
  readFile(absolute(options.contract), "utf8"),
  readFile(absolute(options.baseCandidates), "utf8"),
]);
const contract = JSON.parse(contractText);
const candidates = JSON.parse(candidatesText);
const contractSha = sha256(contractText);
const levelIds = [83, 98, 100];
const entries = [];
const sourceSlices = [];
const changes = {};

for (const id of levelIds) {
  const label = `Lv${String(id).padStart(3, "0")}`;
  const contractEntry = contract.levels.find((entry) => entry.level_id === label);
  const baseEntry = candidates.levels.find((entry) => Number(entry.level?.id ?? entry.id) === id);
  if (!contractEntry?.our_design_target || !baseEntry?.level || !Array.isArray(baseEntry.route)) {
    throw new Error(`${label}: contract target, base level, or authored route is missing.`);
  }
  const target = structuredClone(contractEntry.our_design_target);
  const original = structuredClone(baseEntry.level);
  const level = structuredClone(baseEntry.level);
  let route = structuredClone(baseEntry.route);

  if (id === 83) {
    // Both countdown covers are permanent one-cell blockers at (0,0)/(1,0).
    // Keep them there, but reserve their two size-2 mouths for colours carried
    // only by hidden SINGLE blocks. Every opening SQ2 colour gets a reachable
    // size-2 mouth; hidden L3 carriers use those same five colours.
    level.shutters.forEach((shutter, index) => Object.assign(shutter, { x: index, y: 0 }));
    level.gates = [
      { id: "cc-083-gate-01", side: "right", offset: 3, size: 2, color: "green" },
      { id: "cc-083-gate-02", side: "top", offset: 0, size: 2, color: "blue" },
      { id: "cc-083-gate-03", side: "right", offset: 6, size: 2, color: "pink" },
      { id: "cc-083-gate-04", side: "top", offset: 3, size: 2, color: "cyan" },
      { id: "cc-083-gate-05", side: "right", offset: 0, size: 2, color: "purple" },
      { id: "cc-083-gate-06", side: "right", offset: 10, size: 1, color: "blue" },
      { id: "cc-083-gate-07", side: "left", offset: 0, size: 2, color: "orange" },
      { id: "cc-083-gate-08", side: "bottom", offset: 5, size: 2, color: "yellow" },
      { id: "cc-083-gate-09", side: "top", offset: 6, size: 1, color: "green" },
      { id: "cc-083-gate-10", side: "top", offset: 7, size: 1, color: "cyan" },
      { id: "cc-083-gate-11", side: "left", offset: 3, size: 1, color: "purple" },
      { id: "cc-083-gate-12", side: "left", offset: 4, size: 1, color: "blue" },
      { id: "cc-083-gate-13", side: "top", offset: 2, size: 1, color: "pink" },
      { id: "cc-083-gate-14", side: "top", offset: 5, size: 1, color: "yellow" },
      { id: "cc-083-gate-15", side: "right", offset: 2, size: 1, color: "red" },
      { id: "cc-083-gate-16", side: "right", offset: 5, size: 1, color: "orange" },
      { id: "cc-083-gate-17", side: "right", offset: 8, size: 1, color: "green" },
    ];
    const colors = {
      "cc-083-b1-01": "green", "cc-083-b1-02": "green",
      "cc-083-b1-03": "cyan", "cc-083-b1-04": "cyan",
      "cc-083-b1-05": "pink", "cc-083-b1-06": "green",
      "cc-083-b1-07": "green", "cc-083-b1-08": "purple",
      "cc-083-b1-09": "green", "cc-083-b1-10": "pink",
      "cc-083-b1-11": "pink", "cc-083-b1-12": "pink",
      "cc-083-b2-07": "green", "cc-083-b2-08": "pink",
      "cc-083-b3-07": "purple", "cc-083-b3-08": "green",
    };
    for (const [blockId, color] of Object.entries(colors)) setColor(level, blockId, color);
    changes[label] = {
      reason: "two permanent cover cells consume the original top SQ2 mouth",
      shutter_positions: level.shutters.map(({ x, y }) => [x, y]),
      gate_mapping: level.gates.map(({ side, offset, size, color }) => ({ side, offset, size, color })),
      block_colors: colors,
    };
  }

  if (id === 98) {
    // Move only hidden-stage bodies. The opening arrangement, numeric carriers,
    // route order and every stage count/histogram remain unchanged.
    const placements = {
      "cc-098-b2-02": [5, 0],
      "cc-098-b2-01": [5, 2],
      "cc-098-b3-01": [0, 1],
      "cc-098-b3-02": [2, 0],
      "cc-098-b3-03": [5, 8],
    };
    for (const [blockId, placement] of Object.entries(placements)) setPlacement(level, blockId, placement);
    changes[label] = {
      reason: "cover activation previously admitted hidden red L3 bodies into the active red CROSS5 cells",
      hidden_stage_placements: placements,
    };
  }

  if (id === 100) {
    // The board is necessarily a full 3x4 SQ2 tiling. Put three plain cyan
    // blocks on the bottom row so the ordinary cyan mouth can produce clears
    // 1-3 and thaw the first star gate. Route rank controls the exact seven
    // same-shape star carriers selected later by the runtime assembler.
    setColor(level, "cc-100-b1-07", "cyan");
    const routeById = new Map(route.map((drag) => [drag.blockId, structuredClone(drag)]));
    const routeOrder = [
      "cc-100-b1-02", "cc-100-b1-01", "cc-100-b1-07", "cc-100-b1-10", "cc-100-b1-12",
      "cc-100-b1-11", "cc-100-b1-05", "cc-100-b1-09", "cc-100-b1-06", "cc-100-b1-04",
      "cc-100-b1-08", "cc-100-b1-03",
    ];
    route = routeOrder.map((blockId) => {
      const inherited = routeById.get(blockId);
      if (!inherited) throw new Error(`Lv100: base route is missing ${blockId}.`);
      return inherited;
    });
    Object.assign(route[0], { path: [], exitSide: "bottom" });
    Object.assign(route[1], { path: [[1, 6], [2, 6]], exitSide: "bottom" });
    Object.assign(route[2], { path: [[3, 6], [2, 6]], exitSide: "bottom" });
    changes[label] = {
      reason: "the original full pack exposed a star cyan carrier to the only unfrozen ordinary cyan mouth",
      recolored_block: { "cc-100-b1-07": "cyan" },
      plain_rank_prefix: routeOrder.slice(0, 5),
      expected_star_rank_suffix: routeOrder.slice(5),
      opening_clear_prefix: route.slice(0, 3),
    };
  }

  const invariants = {
    board_rows: level.height === original.height && level.height === target.board.rows,
    board_cols: level.width === original.width && level.width === target.board.cols,
    playable_mask: JSON.stringify(maskOf(level)) === JSON.stringify(target.board.playable_mask),
    playable_cell_count: new Set(level.playable.map(pointKey)).size === target.board.playable_cell_count,
    block_ids: JSON.stringify(level.blocks.map(({ id: blockId }) => blockId))
      === JSON.stringify(original.blocks.map(({ id: blockId }) => blockId)),
    block_count: level.blocks.length === target.full_level_block_count,
    shape_histogram: JSON.stringify(histogram(level.blocks)) === JSON.stringify(histogram(original.blocks)),
    stage_shape_histograms: JSON.stringify(stageHistogram(level.blocks)) === JSON.stringify(stageHistogram(original.blocks)),
    stage_ids_and_counts: JSON.stringify((level.shutters ?? []).map(({ id: shutterId, count }) => ({ shutterId, count })))
      === JSON.stringify(original.shutters?.map(({ id: shutterId, count }) => ({ shutterId, count })) ?? []),
    timer: level.timeSeconds === original.timeSeconds && level.timeSeconds === target.time_seconds,
    route_membership: route.every((drag) => level.blocks.some((block) => block.id === drag.blockId)),
    route_covers_every_block: new Set(route.map((drag) => drag.blockId)).size === level.blocks.length,
  };
  if (!Object.values(invariants).every(Boolean)) {
    throw new Error(`${label}: protected invariant drift: ${JSON.stringify(invariants)}.`);
  }
  entries.push({ level_id: label, target, level, route, validation: { protected_base_invariants: invariants } });
  sourceSlices.push({
    ...structuredClone(baseEntry),
    level_id: label,
    target,
  });
}

const outputDir = absolute(options.outputDir);
const overridesPath = resolve(outputDir, "base-overrides.json");
const baseSlicePath = resolve(outputDir, "r9-base-current-contract-slice.json");
const auditPath = resolve(outputDir, "audit.json");
const generatedOn = new Date().toISOString();
const artifact = {
  schema_version: "blockout-video-parity-geometry-deadlock-base-overrides-v1",
  generated_on: generatedOn,
  source: {
    contract: { path: options.contract, sha256: contractSha },
    base_candidates: { path: options.baseCandidates, sha256: sha256(candidatesText) },
  },
  policy: {
    scope: "Lv083, Lv098, and Lv100 exact-runtime geometry deadlocks only",
    immutable: "contract targets; board dimensions/masks; block ids/count/shapes; stage counts/histograms; mechanism counts/values; timers",
    permitted_changes: "Lv083 gate/color carriers, Lv098 hidden-stage placements, and Lv100 colors/star rank descriptors/authored route",
    runtime_proof: "each level must pass validateLevel, exact contract audit, and a fresh independent PuzzleModel completion replay",
  },
  levels: entries,
};
const artifactText = `${JSON.stringify(artifact, null, 2)}\n`;
const baseSlice = {
  schema_version: "blockout-video-parity-r9-base-current-contract-slice-v1",
  generated_on: generatedOn,
  source_contract: { path: options.contract, sha256: contractSha },
  source_base_candidates: { path: options.baseCandidates, sha256: sha256(candidatesText) },
  scope: "isolated exact-runtime replay for Lv083, Lv098, and Lv100; not a whole-season base artifact",
  levels: sourceSlices,
};
const baseSliceText = `${JSON.stringify(baseSlice, null, 2)}\n`;
const audit = {
  schema_version: "blockout-video-parity-geometry-deadlock-seed-audit-v1",
  generated_on: generatedOn,
  source: artifact.source,
  output: {
    path: displayPath(overridesPath),
    sha256: sha256(artifactText),
    isolated_base_slice_path: displayPath(baseSlicePath),
    isolated_base_slice_sha256: sha256(baseSliceText),
    canonical_levels_sha256: Object.fromEntries(entries.map((entry) => [
      entry.level_id,
      sha256(JSON.stringify(canonical(entry.level))),
    ])),
    canonical_routes_sha256: Object.fromEntries(entries.map((entry) => [
      entry.level_id,
      sha256(JSON.stringify(canonical(entry.route))),
    ])),
  },
  checks: Object.fromEntries(entries.map((entry) => [entry.level_id, entry.validation.protected_base_invariants])),
  changes,
};

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(overridesPath, artifactText, "utf8"),
  writeFile(baseSlicePath, baseSliceText, "utf8"),
  writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8"),
]);
console.log(JSON.stringify(audit, null, 2));
