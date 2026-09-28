import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Isolated Lv17 opening-stage design probe.
 *
 * It searches colour assignments against a deliberately stronger relaxation:
 * an internal drag may remove a block into an infinite off-board parking area.
 * A purple block parked this way is also allowed to clear immediately.  All
 * geometrically routeable purple blocks clear for zero cost.  Consequently the
 * exact minimum below is a sound lower bound on real internal drags needed to
 * reach the first frozen-gate deadline (8 clears), but this tool is only a
 * candidate probe; the accepted result still goes through PuzzleModel replay.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = resolve(root, process.argv[2]
  ?? ".codex-temp/video-parity-lv17-lv32-floor-seeds/runtime.generated.ts");
const iterations = Number(process.argv[3] ?? 200);
const perCandidateStateCap = Number(process.argv[4] ?? 250_000);
const outputDir = resolve(root, process.argv[5]
  ?? ".codex-temp/video-parity-lv17-opening-stage-search");
const gateArg = process.argv.find((argument) => argument.startsWith("--gate="))?.slice("--gate=".length);
const forcedIdArgs = process.argv.find((argument) => argument.startsWith("--force="))?.slice("--force=".length)
  .split(",").filter(Boolean) ?? [];

const bundle = await build({
  entryPoints: [inputPath],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const imported = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const source = structuredClone(imported.VIDEO_PARITY_LEVELS.find((level) => level.id === 17));
if (!source) throw new Error("Lv17 missing from input");

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const allMask = (1 << source.blocks.length) - 1;
const cellKey = (x, y) => y * source.width + x;
const edgeSpan = (shape, side) => {
  const coordinates = shape.map(([dx, dy]) => side === "left" || side === "right" ? dy : dx);
  return Math.max(...coordinates) - Math.min(...coordinates) + 1;
};
const fits = (block, x, y) => block.shape.every(([dx, dy]) => {
  const cellX = x + dx;
  const cellY = y + dy;
  return cellX >= 0 && cellX < source.width && cellY >= 0 && cellY < source.height;
});
const atGate = (block, x, y, gate) => {
  const cells = block.shape.map(([dx, dy]) => [x + dx, y + dy]);
  const minX = Math.min(...cells.map(([cellX]) => cellX));
  const maxX = Math.max(...cells.map(([cellX]) => cellX));
  const minY = Math.min(...cells.map(([, cellY]) => cellY));
  const maxY = Math.max(...cells.map(([, cellY]) => cellY));
  if (gate.side === "left") return minX === 0 && minY >= gate.offset && maxY < gate.offset + gate.size;
  if (gate.side === "right") return maxX === source.width - 1 && minY >= gate.offset && maxY < gate.offset + gate.size;
  if (gate.side === "top") return minY === 0 && minX >= gate.offset && maxX < gate.offset + gate.size;
  return maxY === source.height - 1 && minX >= gate.offset && maxX < gate.offset + gate.size;
};

function canReachGate(mask, blockIndex, gate) {
  const block = source.blocks[blockIndex];
  const occupied = new Set();
  for (let index = 0; index < source.blocks.length; index += 1) {
    if (index === blockIndex || !(mask & (1 << index))) continue;
    const other = source.blocks[index];
    for (const [dx, dy] of other.shape) occupied.add(cellKey(other.x + dx, other.y + dy));
  }
  const canPlace = (x, y) => fits(block, x, y)
    && block.shape.every(([dx, dy]) => !occupied.has(cellKey(x + dx, y + dy)));
  const start = `${block.x},${block.y}`;
  const queue = [[block.x, block.y]];
  const seen = new Set([start]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    if (atGate(block, x, y, gate)) return true;
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const nextX = x + dx;
      const nextY = y + dy;
      const key = `${nextX},${nextY}`;
      if (seen.has(key) || !canPlace(nextX, nextY)) continue;
      seen.add(key);
      queue.push([nextX, nextY]);
    }
  }
  return false;
}

function closeFree(mask, purpleMask, gate, cache) {
  let next = mask;
  while (true) {
    let removed = false;
    for (let index = 0; index < source.blocks.length; index += 1) {
      const bit = 1 << index;
      if (!(next & bit) || !(purpleMask & bit)) continue;
      const key = `${next}:${index}`;
      let reachable = cache.get(key);
      if (reachable === undefined) {
        reachable = canReachGate(next, index, gate);
        cache.set(key, reachable);
      }
      if (!reachable) continue;
      next &= ~bit;
      removed = true;
    }
    if (!removed) return next;
  }
}

function relaxedMinimum(purpleIndices, gate) {
  const purpleMask = purpleIndices.reduce((mask, index) => mask | (1 << index), 0);
  const cache = new Map();
  const start = closeFree(allMask, purpleMask, gate, cache);
  if ((start & purpleMask) === 0) return { status: "solved", minimum: 0, states: 1, removed: [] };
  const queue = [{ mask: start, cost: 0 }];
  const seen = new Set([start]);
  const parent = new Map();
  for (let cursor = 0; cursor < queue.length && cursor < perCandidateStateCap; cursor += 1) {
    const current = queue[cursor];
    for (let index = 0; index < source.blocks.length; index += 1) {
      const bit = 1 << index;
      if (!(current.mask & bit)) continue;
      const next = closeFree(current.mask & ~bit, purpleMask, gate, cache);
      if (seen.has(next)) continue;
      seen.add(next);
      parent.set(next, { previous: current.mask, removed: index });
      if ((next & purpleMask) === 0) {
        const removed = [index];
        let back = current.mask;
        while (back !== start) {
          const entry = parent.get(back);
          removed.push(entry.removed);
          back = entry.previous;
        }
        removed.reverse();
        return { status: "solved", minimum: current.cost + 1, states: seen.size, removed };
      }
      queue.push({ mask: next, cost: current.cost + 1 });
    }
  }
  return { status: "cap", minimum: null, states: seen.size, removed: null };
}

let randomState = 0x17f10009;
const random = () => {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) / 0x1_0000_0000;
};
const shuffle = (values) => {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
};

let gates = ["left", "right"].flatMap((side) => [1, 2, 3].flatMap((size) => (
  Array.from({ length: source.height - size + 1 }, (_, offset) => ({ side, offset, size }))
))).concat(["top", "bottom"].flatMap((side) => [1, 2, 3].flatMap((size) => (
  Array.from({ length: source.width - size + 1 }, (_, offset) => ({ side, offset, size }))
))));
if (gateArg) {
  const [side, offset, size] = gateArg.split(",");
  gates = [{ side, offset: Number(offset), size: Number(size) }];
}
const results = [];
for (let iteration = 0; iteration < iterations; iteration += 1) {
  const gate = gates[iteration % gates.length];
  const eligible = source.blocks.map((block, index) => ({ block, index }))
    .filter(({ block }) => edgeSpan(block.shape, gate.side) <= gate.size
      && Number(block.frozen ?? 0) < 8
      && Math.max(...block.shape.map(([, dy]) => block.y + dy)) < 6)
    .map(({ index }) => index);
  if (eligible.length < 8) continue;
  const directlyRouteableAtFullBoard = eligible.filter((index) => canReachGate(allMask, index, gate));
  if (!directlyRouteableAtFullBoard.length) continue;
  const requestedForced = forcedIdArgs.map((id) => source.blocks.findIndex((block) => block.id === id));
  if (requestedForced.some((index) => index < 0 || !eligible.includes(index))) continue;
  const forcedOpening = requestedForced.find((index) => directlyRouteableAtFullBoard.includes(index))
    ?? directlyRouteableAtFullBoard[Math.floor(random() * directlyRouteableAtFullBoard.length)];
  const forced = [...new Set([forcedOpening, ...requestedForced])];
  if (forced.length > 8) continue;
  const purpleIndices = [...forced, ...shuffle(eligible.filter((index) => !forced.includes(index))).slice(0, 8 - forced.length)]
    .sort((left, right) => left - right);
  const proof = relaxedMinimum(purpleIndices, gate);
  results.push({
    iteration,
    gate,
    purple_indices: purpleIndices,
    purple_ids: purpleIndices.map((index) => source.blocks[index].id),
    proof,
  });
  results.sort((left, right) => (right.proof.minimum ?? -1) - (left.proof.minimum ?? -1)
    || left.proof.states - right.proof.states);
  if (results.length > 25) results.length = 25;
  // A playable full board must expose at least one of the eight opening
  // layers, so seven is the theoretical maximum for this first deadline.
  if (proof.minimum >= 7) break;
}

await mkdir(outputDir, { recursive: true });
const artifact = {
  schema: "blockout-lv17-opening-stage-magic-parking-probe-v1",
  input: inputPath,
  input_sha256: sha256(bundle.outputFiles[0].contents),
  iterations,
  state_cap_per_candidate: perCandidateStateCap,
  relaxation: "one internal drag may erase a block into infinite parking; matching purple layers may then clear immediately",
  target: "all eight opening purple layers clear before frozen-8 gate",
  results,
};
await writeFile(resolve(outputDir, "search.json"), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ output: resolve(outputDir, "search.json"), best: results[0] ?? null }, null, 2));
