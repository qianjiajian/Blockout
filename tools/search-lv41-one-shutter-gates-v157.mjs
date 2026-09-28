import fs from 'node:fs';
import { loadApi } from './native-block-repair-v143.mjs';
import { search as queueSearch } from '../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import { projectGeneratorOpening } from './remake41to50-generator-floor-v146.mjs';
import { checkSymmetryFloor } from './remake21to30-symmetry-floor-v139.mjs';

const INPUT = 'deliverables/remake41-v157-20260925/candidate41-normal-one-shutter-remove-cover14-v157.json';
const OUT = 'deliverables/remake41-v157-20260925';
const rng = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const shuffle = (a, r) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const edgeCells = (side, offset, size) => Array.from({ length: size }, (_, i) => side === 'left' ? [0, offset + i] : side === 'right' ? [6, offset + i] : side === 'top' ? [offset + i, 0] : [offset + i, 10]);

function gateSlots(level, color, occupied) {
  const pieces = level.blocks.filter(b => b.color === color && !b.id.includes('-q'));
  const slots = [];
  for (const side of ['bottom', 'left', 'right']) {
    const max = side === 'bottom' ? 7 : 11;
    for (const size of [1, 2, 3]) for (let offset = 0; offset + size <= max; offset++) {
      const cells = edgeCells(side, offset, size);
      if (cells.some(p => occupied.has(`${side}:${p[side === 'bottom' ? 0 : 1]}`))) continue;
      if (pieces.some(b => {
        const axis = side === 'bottom' ? 0 : 1;
        return Math.max(...b.shape.map(p => p[axis])) >= size;
      })) continue;
      slots.push({ side, offset, size });
    }
  }
  return slots;
}

const source = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const { api } = await loadApi();
const colors = ['purple', 'cyan', 'red', 'yellow', 'blue', 'green'];
const occupied = new Set();
// Two fixed top generators occupy rim slots 1..3 and 4..6.
for (const offset of [1, 2, 3, 4, 5, 6]) occupied.add(`top:${offset}`);
const options = Object.fromEntries(colors.map(c => [c, gateSlots(source.level, c, occupied)]));
const shapePlan = Object.fromEntries(source.level.gates.map(g => [g.color, { side: g.side, size: g.size }]));
for (const c of colors) options[c] = options[c].filter(s => s.side === shapePlan[c].side && s.size === shapePlan[c].size);
for (const c of colors) if (!options[c].length) throw new Error(`No gate slots for ${c}`);
console.log(JSON.stringify({options: Object.fromEntries(colors.map(c => [c, options[c]]))}));

let found = 0;
for (let seed = 1; seed <= 600; seed++) {
  const r = rng(seed), level = structuredClone(source.level), selected = new Set(), gates = [];
  const order = shuffle(colors, r);
  let okay = true;
  for (const color of order) {
    const choices = options[color].filter(s => ![...selected].some(k => {
      const [side, off, sz] = k.split(':');
      return side === s.side && Number(off) < s.offset + s.size && s.offset < Number(off) + Number(sz);
    }));
    if (!choices.length) { okay = false; break; }
    const s = choices[Math.floor(r() * choices.length)];
    selected.add(`${s.side}:${s.offset}:${s.size}`);
    gates.push({ id: `41-g-${color}`, color, ...s, ...(color === 'cyan' ? { frozen: 4 } : {}) });
  }
  if (!okay) continue;
  level.gates = gates;
  try { api.validateLevel(level); } catch { continue; }
  const upper = queueSearch(level, { floor: 16, maxStates: 160000, maxMilliseconds: 3000 });
  if (upper.status !== 'witness' || upper.cost < 11 || upper.cost > 15) continue;
  const projection = checkSymmetryFloor(projectGeneratorOpening(level, api).level, { floor: 11, maxStates: 150000, maxMilliseconds: 3000 });
  found += 1;
  const report = { seed, U: upper.cost, upperStates: upper.states, projection: { status: projection.status, thresholdProven: projection.thresholdProven, relaxedNonClearingDrags: projection.relaxedNonClearingDrags, exploredStates: projection.exploredStates, discoveredStates: projection.discoveredStates, termination: projection.termination }, gates };
  fs.writeFileSync(`${OUT}/gate-variant-${String(found).padStart(3, '0')}-seed${seed}.json`, JSON.stringify({ level, drags: upper.drags, U: upper.cost, found: upper, report }, null, 2) + '\n');
  console.log(JSON.stringify(report));
  if (projection.thresholdProven || (projection.status !== 'relaxed-shortcut' && found >= 12)) break;
}
console.log(JSON.stringify({ complete: true, found }));
