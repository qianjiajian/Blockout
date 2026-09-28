import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Narrow, prototype-only bridge used when a video correction changes only the
// opening/full palette scalars.  It deliberately starts from the accepted R9
// candidate and binds each emitted entry to the current per-level contract;
// the runtime assembler remains responsible for mechanism carrier assignment
// and exact validation.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractRelative = process.env.VIDEO_PARITY_CONTRACT_RELATIVE
  ?? "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json";
const candidatesRelative = process.env.VIDEO_PARITY_OPENING_REBIND_CANDIDATES_RELATIVE
  ?? ".codex-temp/numeric-deadline-peel-full-r9/report/formal-candidates.json";
const outputRelative = process.env.VIDEO_PARITY_OPENING_REBIND_OUTPUT_RELATIVE
  ?? ".codex-temp/video-parity-opening-color-rebind/base-overrides.json";
const ids = new Set(String(process.env.VIDEO_PARITY_OPENING_REBIND_LEVEL_IDS ?? "41,49,55,61,64")
  .split(",").map(Number).filter(Number.isInteger));
const sha256 = (text) => createHash("sha256").update(text).digest("hex").toUpperCase();

const [contractText, candidatesText] = await Promise.all([
  readFile(resolve(root, contractRelative), "utf8"),
  readFile(resolve(root, candidatesRelative), "utf8"),
]);
const contract = JSON.parse(contractText);
const candidates = JSON.parse(candidatesText);
const contractById = new Map(contract.levels.map((entry) => [
  Number(String(entry.level_id).replace(/^Lv/i, "")), entry.our_design_target,
]));
const levels = (candidates.levels ?? candidates)
  .filter((entry) => ids.has(Number(entry.level?.id ?? entry.id)))
  .map((entry) => {
    const copy = structuredClone(entry);
    const id = Number(copy.level?.id ?? copy.id);
    copy.level_id = `Lv${String(id).padStart(3, "0")}`;
    copy.target = structuredClone(contractById.get(id));
    return copy;
  });
if (levels.length !== ids.size) throw new Error(`Expected ${ids.size} entries, found ${levels.length}`);
const output = {
  schema_version: "blockout-video-parity-opening-color-rebind-v1",
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    contract: { path: contractRelative, sha256: sha256(contractText) },
    candidates: { path: candidatesRelative, sha256: sha256(candidatesText) },
  },
  levels,
};
const outputPath = resolve(root, outputRelative);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: outputRelative, ids: [...ids], contract_sha256: sha256(contractText) }, null, 2));
