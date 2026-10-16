import fs from 'node:fs';
import path from 'node:path';
import {loadApi} from './tools/remake181to190-v146.mjs';
import {auditOpeningCoverage} from './tools/revised-opening-coverage.mjs';

const {api} = await loadApi();
const base = JSON.parse(fs.readFileSync('deliverables/star-targets181-187-20260929/formal-packets/level181.json', 'utf8')).level;
const outDir = 'deliverables/star-targets181-187-20260929/finite-181-20260930';
fs.mkdirSync(outDir, {recursive: true});
const clone = (v) => structuredClone(v);
const noBombs = (level) => { const c = clone(level); for (const b of c.blocks) delete b.timedBombSeconds; return c; };
const key = (level) => JSON.stringify(level.blocks.map(b => [b.id,b.color,b.x,b.y,b.shape]));
const candidates = [];
const add = (name, mutate) => { const level = clone(base); mutate(level); candidates.push({name, level}); };

// Opening repair around the previously valid cyan horizontal-3 near-solution.
const h3 = [[0,0],[1,0],[2,0]];
for (const b of base.blocks) {
  if (b.shutterId || b.shape.length !== 1 || (b.x === 0 && b.y === 1)) continue;
  add(`h3-move-${b.id}`, level => {
    const cyan = level.blocks.find(x => x.id === 'r147-181-open-cyan-l4');
    cyan.shape = clone(h3);
    const moved = level.blocks.find(x => x.id === b.id);
    moved.x = 0; moved.y = 1;
  });
}

// Chain the top-left vacancy through neighboring opening pieces so H3 keeps
// full coverage instead of leaving a second hole.
add('h3-chain-top-left', level => {
  const cyan = level.blocks.find(x => x.id === 'r147-181-open-cyan-l4');
  cyan.shape = clone(h3);
  const pink = level.blocks.find(x => x.id === 'r147-181-open-pink-s3');
  pink.x = 0; pink.y = 1;
  const green = level.blocks.find(x => x.id === 'r147-181-open-green-v2');
  green.x = 1; green.y = 1;
  const yellow = level.blocks.find(x => x.id === 'r147-181-open-yellow-v2-adapt');
  yellow.x = 2; yellow.y = 2;
});
add('h3-chain-top-left-color', level => {
  const cyan = level.blocks.find(x => x.id === 'r147-181-open-cyan-l4');
  cyan.shape = clone(h3);
  const pink = level.blocks.find(x => x.id === 'r147-181-open-pink-s3');
  pink.x = 0; pink.y = 1; pink.color = 'cyan';
  const green = level.blocks.find(x => x.id === 'r147-181-open-green-v2');
  green.x = 1; green.y = 1; green.color = 'pink';
  const yellow = level.blocks.find(x => x.id === 'r147-181-open-yellow-v2-adapt');
  yellow.x = 2; yellow.y = 2;
});
add('h3-chain-top-left-four', level => {
  const cyan = level.blocks.find(x => x.id === 'r147-181-open-cyan-l4');
  cyan.shape = clone(h3);
  const pink = level.blocks.find(x => x.id === 'r147-181-open-pink-s3');
  pink.x = 0; pink.y = 1;
  const green = level.blocks.find(x => x.id === 'r147-181-open-green-v2');
  green.x = 1; green.y = 1;
  const red = level.blocks.find(x => x.id === 'r147-181-open-red-v2');
  red.x = 2; red.y = 1;
  const yellow = level.blocks.find(x => x.id === 'r147-181-open-yellow-v2-adapt');
  yellow.x = 3; yellow.y = 2;
});
add('h3-fill-by-yellow-v2', level => {
  const cyan = level.blocks.find(x => x.id === 'r147-181-open-cyan-l4');
  cyan.shape = clone(h3);
  const pink = level.blocks.find(x => x.id === 'r147-181-open-pink-s3');
  pink.x = 0; pink.y = 1;
  const yellow = level.blocks.find(x => x.id === 'r147-181-open-yellow-v2-adapt');
  yellow.x = 1; yellow.y = 1; yellow.shape = [[0,0],[0,1]];
});
add('h3-fill-by-yellow-v2-color', level => {
  const cyan = level.blocks.find(x => x.id === 'r147-181-open-cyan-l4');
  cyan.shape = clone(h3);
  const pink = level.blocks.find(x => x.id === 'r147-181-open-pink-s3');
  pink.x = 0; pink.y = 1; pink.color = 'cyan';
  const yellow = level.blocks.find(x => x.id === 'r147-181-open-yellow-v2-adapt');
  yellow.x = 1; yellow.y = 1; yellow.shape = [[0,0],[0,1]]; yellow.color = 'pink';
});

// Try all legal L4 orientations at the original anchor and a few square/line alternatives.
const shapeVariants = [
  [[0,0],[1,0],[2,0],[2,1]],
  [[0,0],[1,0],[0,1],[0,2]],
  [[0,0],[1,0],[1,1],[1,2]],
  [[0,0],[0,1],[1,1],[2,1]],
  [[0,0],[1,0],[0,1],[1,1]],
  [[0,0],[1,0],[2,0],[3,0]],
];
for (const [i, shape] of shapeVariants.entries()) add(`cyan-shape-${i}`, level => {
  level.blocks.find(x => x.id === 'r147-181-open-cyan-l4').shape = shape;
});

// Color reassignments around the top-right obstruction. Keep color vocabulary and block count.
const colorTargets = ['r147-181-open-red-v2','r147-181-open-blue-v2','r147-181-open-cyan-s2','r147-181-open-green-s'];
for (const id of colorTargets) for (const color of ['cyan','blue','red','green','pink']) add(`color-${id}-${color}`, level => {
  const b = level.blocks.find(x => x.id === id); b.color = color;
});
for (let i = 0; i < colorTargets.length; i++) for (let j = i + 1; j < colorTargets.length; j++) add(`swap-${colorTargets[i]}-${colorTargets[j]}`, level => {
  const a = level.blocks.find(x => x.id === colorTargets[i]);
  const b = level.blocks.find(x => x.id === colorTargets[j]);
  [a.color,b.color] = [b.color,a.color];
});

const seen = new Set();
const summary = [];
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
for (const {name, level} of candidates) {
  if (only && ![...only].some(prefix => name.startsWith(prefix))) continue;
  if (seen.has(key(level))) continue;
  seen.add(key(level));
  let opening;
  try { opening = auditOpeningCoverage(new api.PuzzleModel(noBombs(level)).snapshot()); } catch (error) { summary.push({name,status:'invalid-opening',error:String(error)}); continue; }
  if (!opening.passed) { summary.push({name,status:'opening-fail',uncovered:opening.uncoveredCells,issues:opening.issues.slice(0,3)}); continue; }
  let search;
  try { search = api.searchRevisedLevel(noBombs(level), {maxStates:12000,maxDragStates:900,maxTransitions:350000,maxMilliseconds:6000}); }
  catch (error) { summary.push({name,status:'search-error',error:String(error)}); continue; }
  const row = {name,status:search.status,termination:search.termination,states:search.discoveredStates,transitions:search.attemptedTransitions};
  if (search.witnessFound) {
    row.drags = search.drags.length; row.replay = search.replay;
    if (search.drags.length <= 43 && search.replay?.nonClearingDrags >= 11 && search.replay.nonClearingDrags <= 15) {
      const file = path.join(outDir, `candidate-${summary.length}.json`);
      fs.writeFileSync(file, JSON.stringify({source:'formal-packets/level181.json',name,level,drags:search.drags,search,opening,newMoveTarget:43,timeTargetSeconds:79}, null, 2)+'\n');
      row.acceptableSpatial = true; row.file = file; console.log(JSON.stringify(row));
    }
  }
  summary.push(row);
}
fs.writeFileSync(path.join(outDir,'summary.json'), JSON.stringify({createdAt:new Date().toISOString(),count:candidates.length,unique:seen.size,rows:summary},null,2)+'\n');
console.log(JSON.stringify({count:candidates.length,unique:seen.size,acceptable:summary.filter(x=>x.acceptableSpatial).length,output:outDir}));
