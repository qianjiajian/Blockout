/*
 * Build isolated league candidates from the current mainline LEVELS.
 *
 * This is an authoring/audit tool. It never writes src/core/leagueLevelData.ts
 * or changes the league selector. Each candidate keeps the source mechanisms
 * and board mask, then applies a deterministic layout permutation and a
 * palette permutation. Formal league adoption still requires the independent
 * same-object route, L/U and late score-block evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { gameplayFingerprint } from './finite-search-policy.mjs';

const output = 'deliverables/league-regeneration-20261005/template/mainline-template-candidates.json';
const reportOutput = 'deliverables/league-regeneration-20261005/template/mainline-template-summary.json';
const palette = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const cadence = index => ((index - 1) % 5 === 2 ? 'super' : 'hard');
const hashSeed = (seed, salt) => {
  let value = (seed ^ salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
};
const clone = value => structuredClone(value);
const cellKey = ([x, y]) => `${x},${y}`;
const blockCells = block => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
const shapeKey = block => JSON.stringify(block.shape);
const mechanismKey = block => JSON.stringify({
  shutterId: block.shutterId ?? null,
  movementAxis: block.movementAxis ?? null,
  layers: block.layers ?? null,
  frozen: block.frozen ?? 0,
  keyId: block.keyId ?? null,
  lockedBy: block.lockedBy ?? null,
  lockCount: block.lockCount ?? null,
  timedBombSeconds: block.timedBombSeconds ?? null,
  rotationBadge: block.rotationBadge ?? false,
  star: block.star ?? false,
});
const filledRectangle = shape => {
  if (!shape?.length) return false;
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return shape.length === (maxX - minX + 1) * (maxY - minY + 1)
    && new Set(shape.map(cellKey)).size === shape.length;
};

const bundle = await build({
  stdin: { resolveDir: process.cwd(), contents: "export { LEVELS } from './src/core/levels.ts'; export { validateLevel } from './src/core/PuzzleModel.ts';" },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const { LEVELS, validateLevel } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

function rotatePalette(level, shift) {
  const map = new Map(palette.map((color, index) => [color, palette[(index + shift) % palette.length]]));
  const recolor = block => {
    if (block.color) block.color = map.get(block.color) ?? block.color;
    if (block.layers) block.layers = block.layers.map(color => map.get(color) ?? color);
  };
  for (const block of level.blocks ?? []) recolor(block);
  for (const gate of level.gates ?? []) gate.color = map.get(gate.color) ?? gate.color;
  for (const door of level.flipDoors ?? []) door.color = map.get(door.color) ?? door.color;
  for (const grid of level.coloredGrids ?? []) grid.color = map.get(grid.color) ?? grid.color;
  return Object.fromEntries(map);
}

function swapTemplatePositions(level, seed) {
  const swaps = [];
  // Generator queues intentionally share their rim spawn anchor. They are not
  // active board occupants, so moving one of them together with an active
  // block would turn a valid template into an overlap at the initial state.
  // Keep queued blocks attached to their generator and only permute blocks
  // that are present on the board at the start of the level.
  const queuedIds = new Set((level.generators ?? []).flatMap(generator => generator.queueBlockIds));
  const groups = new Map();
  for (const block of level.blocks ?? []) {
    if (queuedIds.has(block.id)) continue;
    // Mechanism-bearing blocks stay attached to their mechanism instance. Only
    // equivalent physical bodies are position-swapped.
    const key = `${shapeKey(block)}|${mechanismKey(block)}`;
    const group = groups.get(key) ?? [];
    group.push(block);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const offset = hashSeed(seed, group.length) % group.length;
    // Try deterministic pairs until one preserves all structural constraints.
    // A source template may contain deliberately staged/hidden geometry, and
    // a same-shape swap is only safe when the validator accepts the complete
    // resulting level. Revert failed trials instead of emitting a bad layout.
    for (let step = 0; step < group.length - 1 && swaps.length < 3; step += 1) {
      const a = group[step];
      const b = group[(step + offset + 1) % group.length];
      if (a === b) continue;
      [a.x, b.x] = [b.x, a.x];
      [a.y, b.y] = [b.y, a.y];
      try {
        validateLevel(level);
        swaps.push({ a: a.id, b: b.id });
      } catch {
        [a.x, b.x] = [b.x, a.x];
        [a.y, b.y] = [b.y, a.y];
      }
    }
    if (swaps.length >= 3) break;
  }
  return swaps;
}

function mutateTemplate(source, index, variant) {
  const level = clone(source);
  const seed = hashSeed(source.id, index * 97 + variant * 7919);
  level.id = 900000 + index;
  level.name = `荣耀联赛${index}·主线模板${source.id}·变体${variant}`;
  level.difficulty = cadence(index);
  // League runs on the revised v1.5 runtime even when the corresponding
  // campaign template is one of the legacy early levels without an explicit
  // mechanismRules field. The board/mechanism payload remains template-owned;
  // this only selects the league runtime contract.
  level.mechanismRules = 'revised-2026-09-27-v1.5';
  level.timeSeconds = 180;
  level.reward = 0;
  const swaps = swapTemplatePositions(level, seed);
  const colorShift = 1 + (seed % (palette.length - 1));
  const colorMap = rotatePalette(level, colorShift);
  return {
    level,
    templateSource: { levelId: source.id, name: source.name, difficulty: source.difficulty },
    mutation: {
      kind: 'mainline-template-layout',
      variant,
      seed,
      positionSwaps: swaps,
      paletteShift: colorShift,
      paletteMap: colorMap,
      mechanismsPreserved: true,
      boardMaskPreserved: true,
      layoutChanged: swaps.length > 0,
    },
  };
}

function selectScoreBlocks(level) {
  return (level.blocks ?? [])
    .filter(block => !block.shutterId && filledRectangle(block.shape))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .slice(0, 3)
    .map(block => block.id);
}

const entries = [];
const summary = { generatedAt: new Date().toISOString(), source: 'src/core/levels.ts', range: [1, 100], cadence: 'hard, hard, super, hard, hard repeating', attemptsPerTemplate: 4, acceptedForFormal: 0, rows: [] };
for (let index = 1; index <= 100; index += 1) {
  const source = LEVELS[index - 1];
  const attempts = [];
  let accepted;
  for (let variant = 0; variant < 4; variant += 1) {
    const candidate = mutateTemplate(source, index, variant);
    const fingerprint = gameplayFingerprint(candidate.level);
    const row = { variant, fingerprint, mutation: candidate.mutation, status: 'BLOCKED', reasons: [] };
    try {
      validateLevel(candidate.level);
      const specials = selectScoreBlocks(candidate.level);
      row.status = specials.length >= 1 ? 'TEMPLATE_STRUCTURALLY_VALID' : 'NO_RECTANGULAR_SCORE_BLOCK';
      row.specials = specials;
      row.formalEligibility = false;
      if (!accepted && specials.length >= 1) accepted = { ...candidate, fingerprint, specials };
    } catch (error) {
      row.reasons.push(`structural:${String(error?.message ?? error).slice(0, 300)}`);
    }
    attempts.push(row);
    if (accepted) break;
  }
  if (accepted) {
    entries.push({ index, difficulty: cadence(index), templateSource: accepted.templateSource, mutation: accepted.mutation, level: accepted.level, specials: accepted.specials, fingerprint: accepted.fingerprint, formalEligibility: false });
    summary.rows.push({ index, templateSourceId: source.id, status: 'TEMPLATE_STRUCTURALLY_VALID', attempts: attempts.length, specials: accepted.specials, formalEligibility: false });
  } else {
    summary.rows.push({ index, templateSourceId: source.id, status: 'TEMPLATE_BLOCKED', attempts: attempts.length, reasons: attempts.flatMap(row => row.reasons), formalEligibility: false });
  }
}
summary.validTemplateCount = entries.length;
summary.blockedTemplateCount = 100 - entries.length;
summary.formalEligibility = 'none; independent same-object route/L/U/late-score proof still required';
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify({ ...summary, entries }, null, 2) + '\n');
fs.writeFileSync(reportOutput, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ output, reportOutput, validTemplateCount: entries.length, blockedTemplateCount: summary.blockedTemplateCount }, null, 2));
