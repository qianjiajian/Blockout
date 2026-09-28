import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const valueAfter = (name) => {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) throw new Error(`${name} is required`);
  return args[index + 1];
};

const input = resolve(ROOT, valueAfter("--input"));
const output = resolve(ROOT, valueAfter("--output"));
const levelNumber = Number(valueAfter("--level"));
const floors = valueAfter("--floors").split(",").map(Number);
if (!Number.isSafeInteger(levelNumber) || levelNumber < 1) throw new Error("--level must be a positive integer");
if (!floors.length || floors.some((floor) => !Number.isSafeInteger(floor) || floor < 0)) {
  throw new Error("--floors must be a comma-separated list of non-negative integers");
}

const artifact = JSON.parse(await readFile(input, "utf8"));
const levelId = `Lv${String(levelNumber).padStart(3, "0")}`;
const candidate = (artifact.levels ?? []).find((entry) => (
  entry.level_id === levelId || entry.level?.id === levelNumber
));
if (!candidate) throw new Error(`${levelId} is missing from ${input}`);
const result = structuredClone(artifact);
result.levels = [structuredClone(candidate)];
result.levels[0].level_id = levelId;
result.levels[0].audit = {
  ...(result.levels[0].audit ?? {}),
  strict_stage_floor_allocation: floors,
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ input, output, level_id: levelId, floors }, null, 2));
