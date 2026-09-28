import fs from 'node:fs';
import { loadApi } from './native-block-repair-v143.mjs';
import { pack, rng } from './author41-43-v157.mjs';
import { search as queueSearch } from '../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import { projectGeneratorOpening } from './remake41to50-generator-floor-v146.mjs';
import { checkSymmetryFloor } from './remake21to30-symmetry-floor-v139.mjs';

const SOURCE = JSON.parse(fs.readFileSync('deliverables/remake41-v157-20260925/candidate41-normal-v157.json', 'utf8'));
const OUT = 'deliverables/remake41-v157-20260925';
const cells = (s) => Array.from({ length: s.width * s.height }, (_, i) => [s.x + i % s.width, s.y + Math.floor(i / s.width)]);
const key = (p) => p.join(',');
const queuedIds = new Set(SOURCE.level.generators.flatMap(g => g.queueBlockIds));

function repack(removed, seed) {
  const level = structuredClone(SOURCE.level);
  const remain = level.shutters.find(s => s.id !== removed);
  level.shutters = level.shutters.filter(s => s.id !== removed);
  const remainingCells = new Set(cells(remain).map(key));
  const allCells = level.playable.map(key);
  const visibleCells = allCells.filter(p => !remainingCells.has(p)).map(p => p.split(',').map(Number));
  const hiddenCells = [...remainingCells].map(p => p.split(',').map(Number));
  const old = new Map(level.blocks.map(b => [b.id, b]));
  const normal = level.blocks.filter(b => !queuedIds.has(b.id) && b.shutterId !== remain.id);
  const early = level.blocks.filter(b => !queuedIds.has(b.id) && b.shutterId === removed).map(b => ({ ...b, shutterId: undefined }));
  const visibleItems = [...normal, ...early].map(b => ({ id: b.id, color: b.color, shape: b.shape, kind: b.id }));
  const hiddenItems = level.blocks.filter(b => !queuedIds.has(b.id) && b.shutterId === remain.id).map(b => ({ id: b.id, color: b.color, shape: b.shape, kind: b.id }));
  const r = rng(seed);
  const vis = pack({ playable: visibleCells }, visibleItems, r, true);
  if (!vis) return null;
  const hid = pack({ playable: hiddenCells }, hiddenItems, r, false);
  if (!hid) return null;
  const positions = new Map([...vis, ...hid].map(b => [b.id, b]));
  level.blocks = level.blocks.map(b => {
    const p = positions.get(b.id);
    return p ? { ...b, x: p.x, y: p.y, ...(b.shutterId === removed ? {} : {}) } : b;
  }).filter(b => b.shutterId !== removed);
  level.mechanismAdaptation = { userAuthorized: '2026-09-26', removedShutter: removed, repackedSeed: seed, preservedShutter: remain.id };
  return level;
}

const { api } = await loadApi();
let found = 0;
for (const removed of ['41-cover14', '41-cover8']) {
  for (let seed = 1; seed <= 1200; seed++) {
    const level = repack(removed, seed);
    if (!level) continue;
    try { api.validateLevel(level); } catch { continue; }
    const upper = queueSearch(level, { floor: 16, maxStates: 150000, maxMilliseconds: 2500 });
    if (upper.status !== 'witness' || upper.cost < 11 || upper.cost > 15) continue;
    const projection = checkSymmetryFloor(projectGeneratorOpening(level, api).level, { floor: 11, maxStates: 120000, maxMilliseconds: 2500 });
    found += 1;
    const result = { removed, seed, U: upper.cost, projection: { status: projection.status, thresholdProven: projection.thresholdProven, relaxedNonClearingDrags: projection.relaxedNonClearingDrags, exploredStates: projection.exploredStates, discoveredStates: projection.discoveredStates, termination: projection.termination } };
    const file = `${OUT}/candidate41-one-shutter-packed-${removed === '41-cover14' ? 'keep-cover8' : 'keep-cover14'}-${seed}-v157.json`;
    fs.writeFileSync(file, JSON.stringify({ level, drags: upper.drags, U: upper.cost, found: upper, result }, null, 2) + '\n');
    console.log(JSON.stringify({ file, ...result }));
    if (projection.thresholdProven || (projection.status !== 'relaxed-shortcut' && found >= 8)) process.exit(0);
  }
}
console.log(JSON.stringify({ complete: true, found }));
