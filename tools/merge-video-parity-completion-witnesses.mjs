import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputs = String(process.env.VIDEO_PARITY_WITNESS_INPUTS ?? "")
  .split(";").map((value) => value.trim()).filter(Boolean);
const selectedIds = new Set(String(process.env.VIDEO_PARITY_WITNESS_LEVEL_IDS ?? "")
  .split(",")
  .flatMap((token) => {
    const range = token.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (!range) return [Number.parseInt(token.trim(), 10)];
    const from = Number(range[1]);
    const to = Number(range[2]);
    return Array.from({ length: Math.abs(to - from) + 1 }, (_, index) => Math.min(from, to) + index);
  })
  .filter((value) => Number.isInteger(value) && value > 0));
const output = resolve(root, process.env.VIDEO_PARITY_WITNESS_OUTPUT_RELATIVE
  ?? ".codex-temp/video-parity-completion-witnesses-merged.json");
if (!inputs.length) throw new Error("VIDEO_PARITY_WITNESS_INPUTS must list at least one JSON artifact");

const byId = new Map();
for (const relativePath of inputs) {
  const path = resolve(root, relativePath);
  const parsed = JSON.parse(await readFile(path, "utf8"));
  const entries = Array.isArray(parsed) ? parsed : parsed.levels ?? parsed.routes ?? [];
  for (const entry of entries) {
    const id = Number(String(entry.level_id ?? entry.levelId ?? entry.id ?? "").replace(/^Lv/i, ""));
    if (selectedIds.size && !selectedIds.has(id)) continue;
    if (!Number.isInteger(id) || !entry.replayed) continue;
    if (byId.has(id)) throw new Error(`Duplicate replayed witness Lv${String(id).padStart(3, "0")}`);
    byId.set(id, structuredClone(entry));
  }
}
const merged = [...byId].sort(([left], [right]) => left - right).map(([, entry]) => entry);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, replayed: merged.length, ids: [...byId.keys()].sort((a, b) => a - b) }, null, 2));
