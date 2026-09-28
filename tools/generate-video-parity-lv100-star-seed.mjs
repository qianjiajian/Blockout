import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = resolve(root, process.env.VIDEO_PARITY_CONTRACT_RELATIVE
  ?? "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json");
const candidatesPath = resolve(root, process.env.VIDEO_PARITY_LV100_BASE_CANDIDATES_RELATIVE
  ?? ".codex-temp/numeric-deadline-peel-full-r9/report/formal-candidates.json");
const outputDir = resolve(root, process.env.VIDEO_PARITY_LV100_SEED_OUTPUT_DIR
  ?? ".codex-temp/video-parity-lv100-star-seed");
const repairedPath = process.env.VIDEO_PARITY_LV100_REPAIRED_ROUTE_RELATIVE
  ? resolve(root, process.env.VIDEO_PARITY_LV100_REPAIRED_ROUTE_RELATIVE)
  : null;
const [contractText, candidatesText] = await Promise.all([
  readFile(contractPath, "utf8"), readFile(candidatesPath, "utf8"),
]);
const sourceArtifact = JSON.parse(candidatesText);
const source = (sourceArtifact.levels ?? sourceArtifact).find((entry) => Number(entry.level?.id ?? entry.id) === 100);
if (!source) throw new Error("Lv100 base candidate is missing");
const entry = structuredClone(source);
const level = entry.level ?? entry;
// The opening is a complete 6x8 tiling of twelve SQ2 blocks. Therefore the
// only legal first clear must already touch the one unfrozen ordinary exit.
// Put that exit below the cyan SQ2 at (2,6); its early route rank then keeps it
// outside the seven highest-rank star carriers selected by the assembler.
level.gates = [
  { id: "cc-100-gate-1", side: "bottom", offset: 2, size: 2, color: "cyan" },
  { id: "cc-100-gate-2", side: "top", offset: 3, size: 2, color: "pink" },
];
entry.route = [];
await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "candidate.json"), `${JSON.stringify({ levels: [entry] }, null, 2)}\n`, "utf8");
await writeFile(resolve(outputDir, "routes.json"), `${JSON.stringify([{
  level_id: "Lv100", replayed: false, events: [],
}], null, 2)}\n`, "utf8");
await writeFile(resolve(outputDir, "source.json"), `${JSON.stringify({
  contract_sha256: createHash("sha256").update(contractText).digest("hex").toUpperCase(),
  source_candidates_sha256: createHash("sha256").update(candidatesText).digest("hex").toUpperCase(),
  invariant: "same 6x8/48 playable/12 SQ2/2 base colors; only base exit geometry changes",
}, null, 2)}\n`, "utf8");
if (repairedPath) {
  const repaired = JSON.parse(await readFile(repairedPath, "utf8"));
  const witness = repaired.find((item) => String(item.level_id) === "Lv100" && item.replayed);
  if (!witness) throw new Error("Lv100 repaired witness is missing or not replayed");
  await writeFile(resolve(outputDir, "base-overrides.json"), `${JSON.stringify({
    schema_version: "blockout-video-parity-lv100-star-base-override-v1",
    generated_on: new Date().toISOString(),
    source: {
      contract: {
        path: "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
        sha256: createHash("sha256").update(contractText).digest("hex").toUpperCase(),
      },
    },
    scope: ["Lv100"],
    levels: [{
      level_id: "Lv100",
      level,
      route: witness.events,
      validation: { base_route_fresh_replayed: true },
    }],
  }, null, 2)}\n`, "utf8");
}
console.log(outputDir);
