/*
 * Isolated second-pass source selection for the 100-level league batch.
 * This is a provenance/structure artifact only. It never writes production
 * LEVELS, league registries, selectors, or saves, and every row remains
 * formalEligibility=false until same-object route/L/U/score evidence exists.
 */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const outDir = 'deliverables/league-regeneration-20261005/round2';
const out = `${outDir}/mainline-reselected-candidates.json`;
const palette = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const cadence = index => ((index - 1) % 5 === 2 ? 'super' : 'hard');
const target = difficulty => difficulty === 'super' ? [21, 30] : [16, 20];
const unlock = { iceGate: 6, frozenBlock: 10, shell: 15, shutter: 20, generator: 35, axis: 50, lock: 60, lift: 65, star: 100, grid: 200 };
const hash = (seed, salt) => { let x = (seed ^ salt) >>> 0; x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0; return (x ^ (x >>> 16)) >>> 0; };
const clone = value => structuredClone(value);
const mechanisms = level => {
  const found = new Set();
  if ((level.gates ?? []).some(g => (g.frozen ?? 0) > 0)) found.add('iceGate');
  if ((level.blocks ?? []).some(b => (b.frozen ?? 0) > 0)) found.add('frozenBlock');
  if ((level.blocks ?? []).some(b => (b.layers?.length ?? 1) > 1)) found.add('shell');
  if ((level.shutters ?? []).length) found.add('shutter');
  if ((level.generators ?? []).length) found.add('generator');
  if ((level.blocks ?? []).some(b => b.movementAxis)) found.add('axis');
  if ((level.blocks ?? []).some(b => b.keyId || b.lockedBy)) found.add('lock');
  if ((level.elevators ?? []).length) found.add('lift');
  if ((level.blocks ?? []).some(b => b.star) || (level.gates ?? []).some(g => g.star)) found.add('star');
  if ((level.coloredGrids ?? []).length) found.add('grid');
  return [...found];
};
const clearLoad = level => (level.blocks ?? []).reduce((n, b) => n + (b.layers?.length ?? 1), 0);
const stats = level => {
  const hard = Number(level.parMoves ?? 0) - clearLoad(level);
  const mechanismWeight = (level.shutters?.length ?? 0) * 2 + (level.generators?.length ?? 0) * 3
    + (level.blocks ?? []).filter(b => (b.frozen ?? 0) > 0).length
    + (level.blocks ?? []).filter(b => (b.layers?.length ?? 1) > 1).length;
  const names = mechanisms(level);
  return { proxyNonClearing: hard, mechanismWeight, blocks: level.blocks?.length ?? 0, mechanisms: names,
    unlockCompatibleAt: Math.max(1, ...names.map(name => unlock[name] ?? 1)) };
};

const bundle = await build({ stdin: { resolveDir: process.cwd(), contents: "export { LEVELS } from './src/core/levels.ts'; export { validateLevel } from './src/core/PuzzleModel.ts';" }, bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const { LEVELS, validateLevel } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const pool = LEVELS.map(level => ({ level, stats: stats(level) }));
const recolor = (level, shift) => {
  const map = new Map(palette.map((c, i) => [c, palette[(i + shift) % palette.length]]));
  const paint = block => { if (block.color) block.color = map.get(block.color) ?? block.color; if (block.layers) block.layers = block.layers.map(c => map.get(c) ?? c); };
  for (const block of level.blocks ?? []) paint(block);
  for (const gate of level.gates ?? []) gate.color = map.get(gate.color) ?? gate.color;
  for (const door of level.flipDoors ?? []) door.color = map.get(door.color) ?? door.color;
  for (const grid of level.coloredGrids ?? []) grid.color = map.get(grid.color) ?? grid.color;
  return Object.fromEntries(map);
};
const rows = [];
const sourceUse = new Map();
for (let index = 1; index <= 100; index += 1) {
  const difficulty = cadence(index), [lo, hi] = target(difficulty);
  const compatible = pool.filter(item => item.stats.unlockCompatibleAt <= index);
  const ranked = compatible.slice().sort((a, b) => {
    const ad = Math.abs(a.stats.proxyNonClearing - ((lo + hi) / 2));
    const bd = Math.abs(b.stats.proxyNonClearing - ((lo + hi) / 2));
    return (Number(b.stats.proxyNonClearing >= lo && b.stats.proxyNonClearing <= hi) - Number(a.stats.proxyNonClearing >= lo && a.stats.proxyNonClearing <= hi)) || ad - bd || b.stats.mechanismWeight - a.stats.mechanismWeight || b.stats.proxyNonClearing - a.stats.proxyNonClearing || a.level.id - b.level.id;
  });
  const selected = ranked[0] ?? pool.slice().sort((a, b) => b.stats.mechanismWeight - a.stats.mechanismWeight)[0];
  const source = selected.level;
  const variant = (sourceUse.get(source.id) ?? 0);
  sourceUse.set(source.id, variant + 1);
  const candidate = clone(source);
  candidate.id = 910000 + index;
  candidate.name = `荣耀联赛${index}·重选主线${source.id}·变体${variant}`;
  candidate.difficulty = difficulty;
  candidate.mechanismRules = 'revised-2026-09-27-v1.5';
  candidate.timeSeconds = 180;
  candidate.reward = 0;
  const paletteShift = 1 + (hash(source.id, index * 7919) % (palette.length - 1));
  const paletteMap = recolor(candidate, paletteShift);
  let structural = true, structuralError = null;
  try { validateLevel(candidate); } catch (error) { structural = false; structuralError = String(error?.message ?? error).slice(0, 300); }
  const sourceStats = selected.stats;
  rows.push({ index, difficulty, source: { levelId: source.id, name: source.name, sourceDifficulty: source.difficulty }, proxy: { ...sourceStats, target: [lo, hi], inBand: sourceStats.proxyNonClearing >= lo && sourceStats.proxyNonClearing <= hi }, mechanismCompatibility: { requiredUnlockIndex: sourceStats.unlockCompatibleAt, compatible: sourceStats.unlockCompatibleAt <= index, mechanisms: sourceStats.mechanisms }, mutation: { kind: 'safe-palette-only', paletteShift, paletteMap, coordinatesPreserved: true, shapesPreserved: true, mechanismsPreserved: true }, level: candidate, structuralValidation: { status: structural ? 'PASS' : 'FAIL', error: structuralError }, formalEligibility: false, evidence: { route: 'PENDING_SAME_OBJECT_REPLAY', lowerBound: 'PENDING', upperBound: 'PENDING', scoreSettlement: 'PENDING' } });
}
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), source: 'src/core/levels.ts', range: [1, 100], cadence: 'hard, hard, super, hard, hard repeating', selection: 'highest proxy complexity within cadence band, filtered by mechanism unlock threshold; deterministic reuse allowed', proxyWarning: 'proxyNonClearing is a source-selection heuristic only and is not a route/L/U certificate', formalEligibility: false, thresholds: { hard: { lower: 16, upper: 20 }, super: { lower: 21, upper: 30 } }, summary: { total: rows.length, structuralPass: rows.filter(r => r.structuralValidation.status === 'PASS').length, structuralFail: rows.filter(r => r.structuralValidation.status !== 'PASS').length, proxyInBand: rows.filter(r => r.proxy.inBand).length, mechanismCompatible: rows.filter(r => r.mechanismCompatibility.compatible).length, uniqueSources: new Set(rows.map(r => r.source.levelId)).size }, rows };
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ out, summary: report.summary }, null, 2));
