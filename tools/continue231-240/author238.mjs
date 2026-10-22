import fs from 'node:fs';
import assert from 'node:assert/strict';
import { ROOT, PROFILE, rect, ruleGate, loadApi, audit, digest, replay } from './common.mjs';
import { searchSpatial } from '../continue221-230/author-hard20260930/grid-witness.mjs';
import { lower238, qualify238, witness238 } from './author238-native.mjs';
ruleGate(); const { api } = await loadApi(); const out = ROOT + '/author238'; fs.mkdirSync(out, { recursive: true });
const L = [[0, 0], [0, 1], [1, 1]];
const original = [
  ['blue', rect(2, 2), 0, 0], ['yellow', [[0, 0], [1, 0], [0, 1]], 2, 0],
  ['green', [[1, 0], [0, 1], [1, 1]], 3, 0], ['red', rect(1, 2), 5, 0],
  ['purple', rect(2, 1), 0, 2], ['red', rect(3, 1), 2, 2], ['yellow', rect(1, 1), 5, 2],
  ['red', rect(1, 3), 0, 3, 'horizontal'], ['green', rect(2, 1), 2, 3],
  ['yellow', rect(1, 3), 4, 3], ['blue', rect(1, 3), 5, 3, 'horizontal'],
  ['yellow', rect(2, 1), 2, 4], ['blue', rect(2, 1), 2, 5], ['blue', rect(1, 2), 0, 6],
  ['green', rect(1, 2), 1, 6], ['red', rect(2, 2), 2, 6], ['green', rect(2, 1), 4, 6],
  ['purple', rect(2, 2), 4, 7], ['purple', rect(2, 1), 0, 8], ['blue', rect(2, 1), 2, 8],
].map(([color, shape, x, y, movementAxis], i) => ({ id: `source238-${i}`, color, shape, x, y, ...movementAxis ? { movementAxis } : {} }));
assert.equal(original.flatMap(b => b.shape).length, 51);
const sourceFile = out + '/source-block-transcription.json';
if (!fs.existsSync(sourceFile)) fs.writeFileSync(sourceFile, JSON.stringify({
  sourceFrame: ROOT + '/source/frame-727.png', sourceCorroboration: [728, 729, 750, 810], width: 6, height: 9,
  blocks: original, coloredGrids: [{ color: 'red', cells: [[1, 3], [1, 4], [1, 5]] }],
  gates: [{ color: 'green', side: 'top', offset: 2, size: 2, frozen: 4 }, { color: 'red', side: 'left', offset: 3, size: 3, frozen: 10 },
    { color: 'blue', side: 'right', offset: 3, size: 3, frozen: 9 }, { color: 'yellow', side: 'bottom', offset: 2, size: 2, frozen: 2 },
    { color: 'purple', side: 'right', offset: 7, size: 2 }],
  sourceOpeningBodyCount: 20, sourceOpeningOccupiedCells: 51, sourcePlayableCells: 54,
  adaptation: 'Three bare red-grid cells require actual red coverage; add one red V3, retain all source bodies and mechanisms. Source yellow/green L triominoes are physically reoriented to existing q0 L art; positions fully rebuilt.'
}, null, 2) + '\n', { flag: 'wx' });
function rng(seed) { let s = seed; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const touching = (a, b) => a.shape.some(([x, y]) => b.shape.some(([u, v]) => Math.abs(a.x + x - b.x - u) + Math.abs(a.y + y - b.y - v) === 1));
function make(seed) {
  const random = rng(seed), shuffle = a => a.map(v => ({ v, r: random() })).sort((a, b) => a.r - b.r).map(a => a.v);
  const pieces = original.map((b, i) => ({ id: `l238-b${i}`, color: b.color, shape: [1, 2].includes(i) ? L : b.shape,
    ...b.movementAxis ? { movementAxis: b.movementAxis } : {} }));
  pieces.push({ id: 'l238-grid-fill', color: 'red', shape: rect(1, 3) });
  const placed = [], used = new Set(), occupied = new Set(), mask = rect(6, 9);
  const fits = (b, x, y) => b.shape.every(([dx, dy]) => x + dx >= 0 && x + dx < 6 && y + dy >= 0 && y + dy < 9 && !occupied.has(`${x + dx},${y + dy}`));
  if (seed >= 2000) for (const [i, x, y] of [[17, 4, 6], [18, 2, 8], [19, 4, 8], [11, 2, 7], [16, 2, 6], [4, 0, 6], [15, 0, 7]]) {
    const b = { ...pieces[i], x, y }; assert(fits(b, x, y)); placed.push(b); used.add(i);
    for (const [dx, dy] of b.shape) occupied.add(`${x + dx},${y + dy}`);
  }
  let budget = 40000;
  function fill() {
    if (--budget < 0) return false; if (used.size === pieces.length) return true;
    const point = mask.find(p => !occupied.has(p.join(','))), seenShapes = new Set();
    const choices = shuffle(pieces.map((_, i) => i).filter(i => !used.has(i)));
    for (const i of choices) {
      const piece = pieces[i], sig = piece.color + JSON.stringify(piece.shape) + (piece.movementAxis ?? '');
      if (seenShapes.has(sig)) continue; seenShapes.add(sig);
      for (const [dx, dy] of piece.shape) {
        const x = point[0] - dx, y = point[1] - dy, b = { ...piece, x, y };
        if (!fits(piece, x, y) || placed.some(a => a.color === b.color && touching(a, b))) continue;
        // Keep both physical axis exits away from corners while preserving each axis.
        if (piece.movementAxis && (y < 1 || y > 5)) continue;
        if (i === 20 && (x < 1 || x > 4 || y < 1 || y > 5)) continue;
        placed.push(b); used.add(i); for (const [u, v] of b.shape) occupied.add(`${x + u},${y + v}`);
        if (fill()) return true;
        placed.pop(); used.delete(i); for (const [u, v] of b.shape) occupied.delete(`${x + u},${y + v}`);
      }
    }
    return false;
  }
  if (!fill()) return null;
  const red = placed.find(b => b.id === 'l238-b7'), blue = placed.find(b => b.id === 'l238-b10'), grid = placed.find(b => b.id === 'l238-grid-fill');
  if (seed >= 5000 && grid.y < blue.y + 3 && grid.y + 3 > blue.y && grid.x > blue.x) return null;
  const sideOptions = shuffle(['left', 'right']); let ordinary = seed >= 2000 ? { id: 'l238-g-purple', color: 'purple', side: 'right', offset: 6, size: 3 } : undefined;
  for (const side of sideOptions) {
    if (ordinary) break;
    const sideAxis = side === 'left' ? red : blue;
    const candidates = placed.filter(b => b.color === 'purple' && (side === 'left' ? b.x === 0 : b.x + Math.max(...b.shape.map(p => p[0])) === 5));
    for (const p of shuffle(candidates)) {
      const height = 1 + Math.max(...p.shape.map(q => q[1]));
      const offset = Math.max(0, Math.min(7, p.y));
      if (offset < sideAxis.y + 3 && offset + Math.max(2, height) > sideAxis.y) continue;
      ordinary = { id: 'l238-g-purple', color: 'purple', side, offset, size: Math.max(2, height) }; break;
    }
    if (ordinary) break;
  }
  if (!ordinary) return null;
  const gates = [
    { id: 'l238-g-red', color: 'red', side: 'left', offset: red.y, size: 3, frozen: 10 },
    { id: 'l238-g-blue', color: 'blue', side: 'right', offset: blue.y, size: 3, frozen: 9 },
    { id: 'l238-g-green', color: 'green', side: seed >= 4000 ? 'bottom' : 'top', offset: seed >= 4000 ? 4 : Math.floor(random() * 4), size: seed >= 4000 ? 2 : 3, frozen: 4 },
    { id: 'l238-g-yellow', color: 'yellow', side: 'bottom', offset: seed >= 2000 ? 2 : Math.floor(random() * 4), size: seed >= 2000 ? 2 : 3, frozen: 2 }, ordinary,
  ];
  return { id: 238, name: '彩径·横移双锁', difficulty: 'easy', width: 6, height: 9, playable: mask,
    mechanismRules: PROFILE, timeSeconds: 145, reward: 200, parMoves: 40, preservedMoveTarget: 40,
    designTargets: { formulaVersion: 'blockout-d1', minimumRepositionOverhead: 5, calibratedDifficulty: 5 },
    blocks: placed, gates, coloredGrids: [{ id: 'l238-red-grid', color: 'red', cells: grid.shape.map(([dx, dy]) => [grid.x + dx, grid.y + dy]) }],
    mechanismAdaptation: { sourceReference: sourceFile, change: '保6×9矩形、红蓝两个水平轴V3、红色三格彩格和绿4/红10/蓝9/黄2四冰门及紫普通门。20源体51格之外增加红V3填满原空彩格三格，共21体54格。两L形实体改为已有原向L素材；全部区块重排、门位置重新布局，非整体镜像或只换色。' } };
}
const start = Number(process.argv[2] ?? 1), count = Math.min(300, Number(process.argv[3] ?? 60)), run = out + `/run-${start}-${Date.now()}`;
fs.mkdirSync(run); fs.copyFileSync(new URL(import.meta.url), run + '/author-source.mjs');
let accepted; const rows = [];
for (let seed = start; seed < start + count; seed++) {
  const level = make(seed), row = { seed }; if (!level) { row.status = 'TILING_OR_GATE_BUDGET'; rows.push(row); continue; }
  row.levelSha256 = digest(level);
  try {
    row.audit = audit(level, api);
    row.route = seed >= 3000 ? witness238(level, api) : searchSpatial(level, api, { floor: 11, maxStates: 30000, maxMilliseconds: 1300, maxTransitions: 400000, orderSeed: seed % 21, symmetry: true });
    row.status = 'ROUTE_' + row.route.status;
    if (row.route.status === 'witness') {
      const verified = replay(level, row.route.drags, api, { complete: true, requirePointerCompatible: true });
      row.U = verified.nonClearingDrags; row.totalDrags = verified.effectiveDrags;
      if (row.U < 5) row.status = 'BELOW_DIFFICULTY';
      else {
        row.lower = lower238(level, api); row.status = row.lower.thresholdProven ? 'BOUNDS_MET' : 'LOWER_' + row.lower.status;
        if (row.lower.thresholdProven) {
          row.qualification = qualify238(level, row.route.drags, api);
          accepted = { level, drags: row.route.drags, lower: row.lower, U: row.U, totalDrags: row.totalDrags, qualification: row.qualification, row };
        }
      }
    }
  } catch (error) { row.status = 'REJECTED'; row.error = error.message; }
  fs.writeFileSync(run + `/candidate-${seed}.json`, JSON.stringify({ level, row }, null, 2) + '\n'); rows.push(row);
  console.log(JSON.stringify({ seed, status: row.status, U: row.U, error: row.error, clears: row.route?.maxClearsSeen }));
  if (accepted) break;
}
fs.writeFileSync(run + '/report.json', JSON.stringify({ accepted, rows }, null, 2) + '\n');
console.log(JSON.stringify({ run, accepted: Boolean(accepted), attempted: rows.length }));
