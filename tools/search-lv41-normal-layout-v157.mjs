import fs from 'node:fs';
import assert from 'node:assert/strict';
import {search as queueSearch} from '../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import {loadApi} from './native-block-repair-v143.mjs';
import {checkFullGeneratorFloor} from './remake41to50-full-generator-floor-v146.mjs';
import {digest} from './revised-preview-validation-v160.mjs';

const INPUT = 'deliverables/remake41-47-v151-20260925/candidate41-competitor-regenerated-v151-1790308522304.json';
const OUT = 'deliverables/remake41-v157-20260925';
const base = JSON.parse(fs.readFileSync(INPUT)).level;

function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffle(a, r) { for (let i = a.length - 1; i; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const cellKey = ([x, y]) => `${x},${y}`;

function packVisible(level, r) {
  const cover = new Set(level.shutters.flatMap(s => Array.from({ length: s.width * s.height }, (_, i) => cellKey([s.x + i % s.width, s.y + Math.floor(i / s.width)]))));
  const cells = level.playable.filter(p => !cover.has(cellKey(p)));
  const free = new Set(cells.map(cellKey));
  const movable = level.blocks.filter(b => !b.shutterId && !level.generators.some(g => g.queueBlockIds.includes(b.id)));
  const order = shuffle(movable.slice().sort((a, b) => b.shape.length - a.shape.length), r);
  const placed = new Map(); let budget = 20_000;
  const rec = i => {
    if (!i) return true;
    if (--budget < 0) return false;
    const b = order[i - 1];
    const anchors = shuffle(cells.slice(), r);
    for (const [x, y] of anchors) {
      const foot = b.shape.map(([dx, dy]) => [x + dx, y + dy]);
      if (!foot.every(p => free.has(cellKey(p)))) continue;
      for (const p of foot) free.delete(cellKey(p));
      placed.set(b.id, [x, y]);
      if (rec(i - 1)) return true;
      placed.delete(b.id); for (const p of foot) free.add(cellKey(p));
    }
    return false;
  };
  if (!rec(order.length) || free.size) return null;
  return level.blocks.map(b => {
    const p = placed.get(b.id); return p ? { ...b, x: p[0], y: p[1] } : b;
  });
}

const apiPack = await loadApi();
const { api } = apiPack;
let best = { cost: Infinity };
for (let seed = 1; seed <= Number(process.env.COUNT ?? 300); seed++) {
  const level = structuredClone(base);
  level.difficulty = 'normal';
  const blocks = packVisible(level, rng(seed * 7919 + 41));
  if (!blocks) continue;
  level.blocks = blocks;
  try { api.validateLevel(level); } catch { continue; }
  const found = queueSearch(level, { floor: 16, maxStates: 180_000, maxMilliseconds: 900, maxTransitions: 2_000_000, weight: 1000, orderSeed: seed % 11 });
  if (found.status !== 'witness' || found.cost < 11 || found.cost > 15) continue;
  const replay = api.replayRevisedRoute(level, found.drags);
  if (!replay.valid || !replay.complete || replay.nonClearingDrags < 11 || replay.nonClearingDrags > 15) continue;
  const fullFloor = checkFullGeneratorFloor(level, api, { floor: 11, maxStates: 180_000, maxMilliseconds: 2000, maxTransitions: 2_000_000 });
  const score = (fullFloor.status === 'threshold-proven' ? 0 : fullFloor.status === 'unknown' ? 1 : 2) * 100 + replay.nonClearingDrags;
  if (score < (best.score ?? Infinity)) {
    best = { seed, score, level, found, replay, fullFloor };
    const out = `${OUT}/variant41-normal-${seed}.json`;
    fs.writeFileSync(out, JSON.stringify({ level, drags: found.drags, replay, found, fullFloor, source: INPUT, activeRuleVersion: '1.57.0', levelSha256: digest(level) }, null, 2) + '\n');
    console.log(JSON.stringify({ seed, out, U: replay.nonClearingDrags, floor: fullFloor.status, floorCost: fullFloor.relaxedNonClearingDrags ?? null, states: found.states }));
  }
}
console.log(JSON.stringify({ best: { seed: best.seed, score: best.score, U: best.replay?.nonClearingDrags, floor: best.fullFloor?.status, floorCost: best.fullFloor?.relaxedNonClearingDrags } }));
