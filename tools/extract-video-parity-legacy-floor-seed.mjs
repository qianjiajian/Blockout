import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Narrow, prototype-only adapter for reusing an inventory-exact v5 geometry
// candidate as a v6 base override. The runtime assembler remains responsible
// for reinstalling and validating every current-contract mechanism.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractRelative = process.env.VIDEO_PARITY_CONTRACT_RELATIVE
  ?? "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json";
const candidatesRelative = process.env.VIDEO_PARITY_LEGACY_FLOOR_CANDIDATES_RELATIVE
  ?? ".codex-temp/video-parity-v6-floor-migration-final/legacy-migration/merged-base-candidates.json";
const ids = String(process.env.VIDEO_PARITY_LEGACY_FLOOR_LEVEL_IDS ?? "")
  .split(",").map((value) => Number(value.trim())).filter(Number.isInteger);
const outputRelative = process.env.VIDEO_PARITY_LEGACY_FLOOR_OUTPUT_RELATIVE
  ?? ".codex-temp/video-parity-legacy-floor-seed/overrides.json";
if (!ids.length) throw new Error("VIDEO_PARITY_LEGACY_FLOOR_LEVEL_IDS is required");

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
};
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const label = (id) => `Lv${String(id).padStart(3, "0")}`;

const [contractText, candidatesText] = await Promise.all([
  readFile(resolve(root, contractRelative), "utf8"),
  readFile(resolve(root, candidatesRelative), "utf8"),
]);
const contract = JSON.parse(contractText);
const candidates = JSON.parse(candidatesText);
const contractSha256 = sha256(contractText);
const contractById = new Map(contract.levels.map((entry) => [
  Number(entry.level_id.replace(/^Lv/i, "")), entry.our_design_target,
]));
const candidateById = new Map(candidates.levels.map((entry) => [entry.level.id, entry]));

const repackLv19 = (entry) => {
  const candidate = structuredClone(entry);
  const level = candidate.level;
  const byId = new Map(level.blocks.map((block) => [block.id, block]));
  const place = (id, x, y) => Object.assign(byId.get(id), { x, y });
  const squares = ["core-019-s1-f01", "core-019-s1-f02", "core-019-s1-f03",
    "core-019-s1-f04", "core-019-s2-f01", "core-019-s2-f02"];
  [[0, 0], [2, 0], [4, 0], [0, 5], [2, 5], [4, 5]]
    .forEach(([x, y], index) => {
      place(squares[index], x, y);
      byId.get(squares[index]).color = "purple";
    });
  const horizontals = ["core-019-s2-f03", "core-019-s2-f04", "core-019-s2-f05",
    "core-019-s2-f06", "core-019-s2-f07", "core-019-s2-f08", "core-019-s2-f09"];
  [[0, 2], [2, 2], [4, 2], [0, 3], [2, 3], [0, 4], [2, 4]]
    .forEach(([x, y], index) => place(horizontals[index], x, y));
  Object.assign(byId.get("core-019-s2-f03"), { color: "yellow" });
  Object.assign(byId.get("core-019-s2-f04"), { color: "purple" });
  Object.assign(byId.get("core-019-s2-f05"), { color: "purple" });
  Object.assign(byId.get("core-019-s2-f06"), { color: "blue" });
  Object.assign(byId.get("core-019-s2-f07"), { color: "pink" });
  Object.assign(byId.get("core-019-s2-f08"), { color: "purple" });
  Object.assign(byId.get("core-019-s2-f09"), { color: "purple" });
  place("core-019-s2-f10", 4, 3);
  place("core-019-s2-f11", 5, 3);
  byId.get("core-019-s2-f10").color = "purple";
  byId.get("core-019-s2-f11").color = "purple";
  place("core-019-s2-f12", 5, 8);
  byId.get("core-019-s2-f12").color = "green";
  level.gates = [
    { id: "vp-019-seed-green", side: "right", offset: 8, size: 1, color: "green" },
    { id: "vp-019-seed-cyan", side: "left", offset: 8, size: 1, color: "cyan" },
    { id: "vp-019-seed-blue", side: "left", offset: 0, size: 1, color: "blue", frozen: 8 },
    { id: "vp-019-seed-purple", side: "top", offset: 4, size: 2, color: "purple", frozen: 12 },
    { id: "vp-019-seed-yellow", side: "left", offset: 2, size: 1, color: "yellow", frozen: 12 },
    { id: "vp-019-seed-pink", side: "left", offset: 1, size: 1, color: "pink", frozen: 24 },
  ];
  delete level.shutters;
  for (const block of level.blocks) delete block.shutterId;
  const fillerFirst = {
    kind: "drag", blockId: "core-019-s2-f12", path: [], exitSide: "right",
  };
  const coreIds = new Set(Array.from({ length: 11 }, (_, index) => `core-019-c${String(index + 1).padStart(2, "0")}`));
  const coreRoute = candidate.route.filter((action) => coreIds.has(action.blockId));
  const rest = candidate.route.filter((action) => !coreIds.has(action.blockId)
    && action.blockId !== "core-019-s2-f12");
  candidate.route = [fillerFirst, ...coreRoute, ...rest];
  candidate.carrier_assignments = {
    numeric_ice: [
      ["core-019-s1-f01", 20, 0],
      ["core-019-s1-f04", 20, 1],
      ["core-019-s2-f01", 20, 2],
      ["core-019-s2-f02", 20, 3],
      ["core-019-s1-f02", 10, 4],
      ["core-019-s1-f03", 10, 5],
    ].map(([block_id, value, requirement_index]) => ({
      block_id, value, shape: "SQ2", requirement_index,
    })),
  };
  return candidate;
};

const levels = ids.map((id) => {
  const rawCandidate = candidateById.get(id);
  const candidate = id === 19 && rawCandidate ? repackLv19(rawCandidate) : rawCandidate;
  const target = contractById.get(id);
  if (!candidate || !target) throw new Error(`${label(id)} is absent from candidate/contract input`);
  if (!same(candidate.target, target)) {
    throw new Error(`${label(id)} legacy geometry candidate target is not exact for the active contract`);
  }
  if (!Array.isArray(candidate.route) || !candidate.route.length) {
    throw new Error(`${label(id)} legacy geometry candidate has no authored completion route`);
  }
  return {
    level_id: label(id),
    target,
    level: candidate.level,
    route: candidate.route,
    route_semantics: "base_geometry",
    ...(candidate.carrier_assignments ? { carrier_assignments: candidate.carrier_assignments } : {}),
    validation: {
      source_candidate: candidatesRelative,
      inventory_projection_exact: true,
      completion_route_role: "base-geometry seed only; runtime replay required after mechanism installation",
    },
  };
});

const output = {
  schema_version: "blockout-video-parity-base-overrides-v1",
  title: "Contract-bound legacy exact-geometry floor seeds",
  generated_on: new Date().toISOString(),
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    contract: { path: contractRelative, sha256: contractSha256 },
    candidates: { path: candidatesRelative, sha256: sha256(candidatesText) },
  },
  scope: levels.map((entry) => entry.level_id),
  levels,
};
const outputText = `${JSON.stringify(output, null, 2)}\n`;
const outputPath = resolve(root, outputRelative);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, outputText, "utf8");
console.log(JSON.stringify({
  output: outputRelative,
  contract_sha256: contractSha256,
  levels: levels.map((entry) => entry.level_id),
  sha256: sha256(outputText),
}, null, 2));
