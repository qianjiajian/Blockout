import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRelative = process.env.VIDEO_PARITY_HILL_RUNTIME_RELATIVE;
const outputRelative = process.env.VIDEO_PARITY_HILL_OUTPUT_RELATIVE;
const levelId = Number(process.env.VIDEO_PARITY_HILL_LEVEL_ID);
const attempts = Number(process.env.VIDEO_PARITY_HILL_ATTEMPTS ?? 500);
const maxStates = Number(process.env.VIDEO_PARITY_HILL_MAX_STATES ?? 50000);
const relaxStage = process.env.VIDEO_PARITY_HILL_RELAX_STAGE_KEY?.trim() || null;
const crossStageAnchors = process.env.VIDEO_PARITY_HILL_CROSS_STAGE_ANCHORS === "1";
const repackRelaxedStage = process.env.VIDEO_PARITY_HILL_REPACK_STAGE === "1";
const resumeRelative = process.env.VIDEO_PARITY_HILL_RESUME_RELATIVE?.trim() || null;
const evaluator = process.env.VIDEO_PARITY_HILL_EVALUATOR?.trim() || "optimal_gameplay";
const mutationsPerAttempt = Math.max(1, Number.parseInt(
  process.env.VIDEO_PARITY_HILL_MUTATIONS_PER_ATTEMPT ?? "1",
  10,
) || 1);
if (!new Set(["optimal_gameplay", "infinite_parking_relaxation"]).has(evaluator)) {
  throw new Error(`unsupported VIDEO_PARITY_HILL_EVALUATOR ${evaluator}`);
}
const seed = Number(process.env.VIDEO_PARITY_HILL_SEED ?? levelId * 49979687 + 31) >>> 0;
if (!runtimeRelative || !outputRelative || !Number.isSafeInteger(levelId)) throw new Error("runtime/output/level env required");
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const sourcePath = resolve(root, runtimeRelative);
const outputPath = resolve(root, outputRelative);
await mkdir(dirname(outputPath), { recursive: true });
const sourceText = await readFile(sourcePath, "utf8");
const resumeArtifact = resumeRelative
  ? JSON.parse(await readFile(resolve(root, resumeRelative), "utf8"))
  : null;
const sourceIsJson = extname(sourcePath).toLowerCase() === ".json";
const bundle = await build({ stdin: { contents: `${sourceIsJson ? "" : `export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(sourcePath)};`} export { validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))}; export { solveLevelOptimally } from ${JSON.stringify(resolve(root, "src/core/levelSolver.ts"))};`, resolveDir: root, loader: "ts" }, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const source = sourceIsJson
  ? (() => {
      const artifact = JSON.parse(sourceText);
      const entry = (artifact.levels ?? artifact).find((candidate) => Number(
        candidate.level?.id ?? candidate.id ?? String(candidate.level_id ?? "").replace(/^Lv/i, ""),
      ) === levelId);
      return entry?.level ?? entry;
    })()
  : runtime.levels.find((level) => level.id === levelId);
if (!source) throw new Error(`Lv${levelId} missing`);
let state = seed || 1;
const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 2 ** 32; };
const chooseTwo = (values) => {
  if (values.length < 2) return null;
  const left = Math.floor(random() * values.length);
  let right = Math.floor(random() * (values.length - 1));
  if (right >= left) right += 1;
  return [values[left], values[right]];
};
const shapeKey = (block) => block.shape.map(([x, y]) => `${x},${y}`).sort().join(";");
const queuedStageByBlock = new Map((source.generators ?? []).flatMap((generator) => (
  generator.queueBlockIds.map((blockId) => [blockId, `generator:${generator.id}`])
)));
const stageKey = (block) => block.shutterId
  ? block.shutterId
  : queuedStageByBlock.get(block.id) ?? "opening";
const playable = new Set(source.playable.map(([x, y]) => `${x},${y}`));
const shuffled = (values) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};
const anchorCache = new Map();
const legalAnchors = (shape) => {
  const key = shapeKey({ shape });
  if (anchorCache.has(key)) return anchorCache.get(key);
  const anchors = [];
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      if (shape.every(([dx, dy]) => playable.has(`${x + dx},${y + dy}`))) anchors.push([x, y]);
    }
  }
  anchorCache.set(key, anchors);
  return anchors;
};
const randomRepackStage = (level) => {
  if (!relaxStage) return false;
  const selected = level.blocks.filter((block) => stageKey(block) === relaxStage);
  const ordered = shuffled(selected).sort((left, right) => (
    right.shape.length - left.shape.length
    || legalAnchors(left.shape).length - legalAnchors(right.shape).length
  ));
  const occupied = new Set();
  const placements = new Map();
  const place = (index) => {
    if (index === ordered.length) return true;
    const block = ordered[index];
    for (const [x, y] of shuffled(legalAnchors(block.shape))) {
      const cells = block.shape.map(([dx, dy]) => `${x + dx},${y + dy}`);
      if (cells.some((cell) => occupied.has(cell))) continue;
      cells.forEach((cell) => occupied.add(cell));
      placements.set(block.id, [x, y]);
      if (place(index + 1)) return true;
      placements.delete(block.id);
      cells.forEach((cell) => occupied.delete(cell));
    }
    return false;
  };
  if (!place(0)) return false;
  for (const block of selected) [block.x, block.y] = placements.get(block.id);
  return true;
};
const relaxForEvaluation = (level) => {
  if (!relaxStage) return level;
  const copy = structuredClone(level);
  copy.name = `${level.name} hillclimb relaxed stage ${relaxStage}`;
  copy.blocks = copy.blocks
    .filter((block) => stageKey(block) === relaxStage)
    .map((block) => {
      const activeColor = block.layers?.[0] ?? block.color;
      block.color = activeColor;
      block.layers = [activeColor];
      delete block.frozen;
      delete block.shutterId;
      delete block.keyId;
      delete block.lockedBy;
      delete block.lockCount;
      delete block.star;
      return block;
    });
  copy.gates = copy.gates.map((gate) => {
    delete gate.frozen;
    delete gate.star;
    return gate;
  });
  copy.blocked = [];
  delete copy.shutters;
  delete copy.generators;
  delete copy.elevators;
  delete copy.conveyors;
  delete copy.designTargets;
  delete copy.onboardingHint;
  delete copy.strategyNudge;
  delete copy.strategyFocus;
  delete copy.featureIntro;
  return copy;
};
const swapDescriptor = (left, right) => {
  const descriptor = (value) => ({ color: value.color, frozen: value.frozen, star: value.star });
  const [a, b] = [descriptor(left), descriptor(right)];
  for (const [target, sourceValue] of [[left, b], [right, a]]) {
    target.color = sourceValue.color;
    if (sourceValue.frozen === undefined) delete target.frozen; else target.frozen = sourceValue.frozen;
    if (sourceValue.star === undefined) delete target.star; else target.star = sourceValue.star;
  }
};
const mutate = (level) => {
  const copy = structuredClone(level);
  const kind = Math.floor(random() * (repackRelaxedStage ? 5 : 4));
  if (kind === 0) {
    const buckets = new Map();
    for (const block of copy.blocks) {
      const key = `${crossStageAnchors ? "any-stage" : stageKey(block)}|${shapeKey(block)}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(block);
    }
    const eligible = [...buckets.values()].filter((items) => items.length >= 2);
    const pair = chooseTwo(eligible[Math.floor(random() * eligible.length)] ?? []);
    if (!pair) return copy;
    const leftAnchor = [pair[0].x, pair[0].y];
    pair[0].x = pair[1].x; pair[0].y = pair[1].y;
    pair[1].x = leftAnchor[0]; pair[1].y = leftAnchor[1];
  } else if (kind === 1) {
    const buckets = new Map();
    for (const block of copy.blocks.filter((item) => (item.layers?.length ?? 1) === 1 && !item.keyId && !item.lockedBy)) {
      const key = stageKey(block);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(block);
    }
    const eligible = [...buckets.values()].filter((items) => items.length >= 2);
    const pair = chooseTwo(eligible[Math.floor(random() * eligible.length)] ?? []);
    if (!pair) return copy;
    [pair[0].color, pair[1].color] = [pair[1].color, pair[0].color];
    pair[0].layers = [pair[0].color]; pair[1].layers = [pair[1].color];
  } else if (kind === 2) {
    const pair = chooseTwo(copy.gates);
    if (pair) swapDescriptor(...pair);
  } else if (kind === 3) {
    const gate = copy.gates[Math.floor(random() * copy.gates.length)];
    if (!gate) return copy;
    const side = ["top", "right", "bottom", "left"][Math.floor(random() * 4)];
    const span = side === "top" || side === "bottom" ? copy.width : copy.height;
    const maximumSize = Math.max(2, Math.min(3, span));
    const size = 2 + Math.floor(random() * (maximumSize - 1));
    gate.side = side;
    gate.size = size;
    gate.offset = Math.floor(random() * (span - size + 1));
  } else {
    randomRepackStage(copy);
  }
  return copy;
};
const infiniteParkingMinimum = (level, stateCap) => {
  const count = level.blocks.length;
  if (count > 30) return null;
  const all = (2 ** count) - 1;
  const playable = new Set(level.playable.map(([x, y]) => `${x},${y}`));
  const activeColor = (block) => block.layers?.[0] ?? block.color;
  const cellsAt = (block, x, y) => block.shape.map(([dx, dy]) => [x + dx, y + dy]);
  const atGate = (block, x, y, gate) => {
    const cells = cellsAt(block, x, y);
    const xs = cells.map(([cellX]) => cellX);
    const ys = cells.map(([, cellY]) => cellY);
    const minX = Math.min(...xs); const maxX = Math.max(...xs);
    const minY = Math.min(...ys); const maxY = Math.max(...ys);
    if (gate.side === "top") return minY === 0 && minX >= gate.offset && maxX < gate.offset + gate.size;
    if (gate.side === "bottom") return maxY === level.height - 1 && minX >= gate.offset && maxX < gate.offset + gate.size;
    if (gate.side === "left") return minX === 0 && minY >= gate.offset && maxY < gate.offset + gate.size;
    return maxX === level.width - 1 && minY >= gate.offset && maxY < gate.offset + gate.size;
  };
  const occupiedMasks = level.blocks.map((block) => new Set(cellsAt(block, block.x, block.y).map(([x, y]) => `${x},${y}`)));
  const exitCache = new Map();
  const canExit = (removed, blockIndex) => {
    const cacheKey = `${removed}:${blockIndex}`;
    if (exitCache.has(cacheKey)) return exitCache.get(cacheKey);
    const block = level.blocks[blockIndex];
    const gates = level.gates.filter((gate) => gate.color === activeColor(block) && !gate.star);
    if (!gates.length) { exitCache.set(cacheKey, false); return false; }
    const occupied = new Set();
    for (let index = 0; index < count; index += 1) {
      if (index === blockIndex || (removed & 2 ** index) !== 0) continue;
      for (const cell of occupiedMasks[index]) occupied.add(cell);
    }
    const canPlace = (x, y) => cellsAt(block, x, y).every(([cellX, cellY]) => (
      playable.has(`${cellX},${cellY}`) && !occupied.has(`${cellX},${cellY}`)
    ));
    const queue = [[block.x, block.y]];
    const seen = new Set([`${block.x},${block.y}`]);
    let result = false;
    for (let cursor = 0; cursor < queue.length && !result; cursor += 1) {
      const [x, y] = queue[cursor];
      if (gates.some((gate) => atGate(block, x, y, gate))) { result = true; break; }
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const nextX = x + dx; const nextY = y + dy; const key = `${nextX},${nextY}`;
        if (seen.has(key) || !canPlace(nextX, nextY)) continue;
        seen.add(key); queue.push([nextX, nextY]);
      }
    }
    exitCache.set(cacheKey, result);
    return result;
  };
  const closureCache = new Map();
  const close = (sourceMask) => {
    if (closureCache.has(sourceMask)) return closureCache.get(sourceMask);
    let removed = sourceMask;
    while (true) {
      let changed = false;
      for (let index = 0; index < count; index += 1) {
        const bit = 2 ** index;
        if ((removed & bit) !== 0 || !canExit(removed, index)) continue;
        removed += bit; changed = true;
      }
      if (!changed) { closureCache.set(sourceMask, removed); return removed; }
    }
  };
  let frontier = new Set([close(0)]);
  const seen = new Set(frontier);
  for (let cost = 0; frontier.size && seen.size <= stateCap; cost += 1) {
    if (frontier.has(all)) return { overhead: cost, explored: seen.size, route: null };
    const next = new Set();
    for (const mask of frontier) for (let index = 0; index < count; index += 1) {
      const bit = 2 ** index;
      if ((mask & bit) !== 0) continue;
      const closed = close(mask + bit);
      if (seen.has(closed)) continue;
      seen.add(closed); next.add(closed);
      if (seen.size > stateCap) return null;
    }
    frontier = next;
  }
  return null;
};
const evaluate = (level) => {
  try { runtime.validateLevel(level); } catch { return null; }
  const evaluated = relaxForEvaluation(level);
  try { runtime.validateLevel(evaluated); } catch { return null; }
  if (evaluator === "infinite_parking_relaxation") return infiniteParkingMinimum(evaluated, maxStates);
  const solved = runtime.solveLevelOptimally(evaluated, maxStates);
  return solved.solved ? { overhead: solved.repositionOverhead, explored: solved.exploredStates, route: solved.drags } : null;
};
const resumeLevel = resumeArtifact?.best?.level;
if (resumeLevel && resumeLevel.id !== levelId) {
  throw new Error(`resume level ${resumeLevel.id} does not match Lv${levelId}`);
}
let current = structuredClone(resumeLevel ?? source);
let currentScore = evaluate(current);
if (!currentScore) throw new Error("source did not solve within cap");
let best = { attempt: -1, level: structuredClone(current), ...currentScore };
let solvedAttempts = 1;
for (let attempt = 0; attempt < attempts; attempt += 1) {
  if (attempt > 0 && attempt % 100 === 0) current = structuredClone(best.level);
  let candidate = current;
  for (let mutation = 0; mutation < mutationsPerAttempt; mutation += 1) candidate = mutate(candidate);
  const score = evaluate(candidate);
  if (!score) continue;
  solvedAttempts += 1;
  const accept = score.overhead > currentScore.overhead
    || (score.overhead === currentScore.overhead && random() < 0.35)
    || (score.overhead + 1 === currentScore.overhead && random() < 0.03);
  if (accept) { current = candidate; currentScore = score; }
  if (score.overhead > best.overhead || (score.overhead === best.overhead && score.explored < best.explored)) {
    best = { attempt, level: structuredClone(candidate), ...score };
    console.log(`attempt=${attempt} best=${best.overhead} states=${best.explored}`);
    const checkpoint = {
      schema_version: "blockout-video-parity-floor-hillclimb-checkpoint-v1",
      source_binding: { runtime: { path: runtimeRelative, sha256: sha256(sourceText) } },
      level_id: `Lv${String(levelId).padStart(3, "0")}`,
      seed,
      attempts_requested: attempts,
      attempts_completed: attempt + 1,
      max_states: maxStates,
      relaxed_stage_key: relaxStage,
      cross_stage_anchor_swaps: crossStageAnchors,
      evaluator,
      mutations_per_attempt: mutationsPerAttempt,
      solved_attempts: solvedAttempts,
      best: {
        attempt: best.attempt,
        reposition_overhead: best.overhead,
        explored_states: best.explored,
        level: best.level,
        route: best.route,
      },
    };
    await writeFile(outputPath, `${JSON.stringify(checkpoint, null, 2)}\n`, "utf8");
  }
  // solveLevelOptimally allocates large per-attempt frontiers.  Long search
  // batches otherwise retain enough garbage between iterations to hit V8's
  // default heap ceiling even though only the current/best candidates survive.
  globalThis.gc?.();
}
const output = { schema_version: "blockout-video-parity-floor-hillclimb-v1", source_binding: { runtime: { path: runtimeRelative, sha256: sha256(sourceText) } }, level_id: `Lv${String(levelId).padStart(3, "0")}`, seed, attempts, max_states: maxStates, relaxed_stage_key: relaxStage, cross_stage_anchor_swaps: crossStageAnchors, random_stage_repack: repackRelaxedStage, evaluator, mutations_per_attempt: mutationsPerAttempt, solved_attempts: solvedAttempts, best: { attempt: best.attempt, reposition_overhead: best.overhead, explored_states: best.explored, level: best.level, route: best.route } };
const text = `${JSON.stringify(output, null, 2)}\n`;
await writeFile(outputPath, text, "utf8");
console.log(JSON.stringify({ output: outputRelative, sha256: sha256(text), solved_attempts: solvedAttempts, best: best.overhead }, null, 2));
