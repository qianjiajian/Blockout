import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { build } from 'esbuild';

export const FACTORY_VERSION = 'league-whole-board-exact-cover-rim-colouring-v2.2';
let mountRuntime;
export async function withDesignGeometry(runtime){
  mountRuntime??=(async()=>{
    const built=await build({stdin:{contents:'export {auditGeneratorMounts} from "./src/core/generatorMountContract.ts";',loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
    return import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
  })();
  return{...runtime,...await mountRuntime};
}
export const canonical = x => Array.isArray(x) ? x.map(canonical) : x && typeof x === 'object'
  ? Object.fromEntries(Object.keys(x).sort().filter(k => x[k] !== undefined).map(k => [k, canonical(x[k])])) : x;
export const digest = x => createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
export const random = seed => () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const shuffle = (xs, r) => xs.map(x => ({ x, n: r() })).sort((a, b) => a.n - b.n).map(x => x.x);
const key = p => p.join(',');
export const absoluteCells = b => b.shape.map(([x, y]) => [b.x + x, b.y + y]);
export const bodyFootprint = b => JSON.stringify(absoluteCells(b).sort((a, b) => a[1] - b[1] || a[0] - b[0]));
export const boardCells = level => {
  const blocked = new Set((level.blocked ?? []).map(key));
  return (level.playable ?? Array.from({ length: level.width * level.height }, (_, i) => [i % level.width, Math.floor(i / level.width)]))
    .filter(p => !blocked.has(key(p)));
};
export const rectangular = shape => shape.length === (1 + Math.max(...shape.map(p => p[0]))) * (1 + Math.max(...shape.map(p => p[1])));
const artExistsCache=new Map();
export const nativeArtAvailable=(runtime,color,shapeId)=>{
  const path=runtime.GAME_ART.gameplay.formalBlocks[color]?.solid?.[shapeId];
  if(!path)return false;
  if(!artExistsCache.has(path))artExistsCache.set(path,fs.existsSync(`public/${path}`));
  return artExistsCache.get(path);
};
const rect = (w, h) => Array.from({ length: w * h }, (_, i) => [i % w, Math.floor(i / w)]);
// Original sprite orientations, never transformed to create more layouts.
export const RECTANGLE_SHAPES = [[1, 1], [1, 2], [2, 1], [1, 3], [3, 1], [2, 2], [2, 3], [3, 2], [3, 3], [4, 1]].map(([w, h]) => rect(w, h));
export const IRREGULAR_SHAPES = [
  [[0,0],[0,1],[1,1]], [[0,0],[1,0],[1,1],[2,1]], [[1,0],[0,1],[1,1],[2,1]],
  [[0,0],[1,0],[2,0],[0,1]], [[1,0],[2,0],[0,1],[1,1]],
  [[1,0],[0,1],[1,1],[2,1],[1,2]], [[0,0],[0,1],[1,1],[2,1],[0,2]],
  [[3,0],[0,1],[1,1],[2,1],[3,1]], [[0,0],[0,1],[1,1],[2,1],[0,2],[0,3]],
  [[0,0],[0,1],[1,1],[2,1]], [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2]],
];
export const plainGameplayFingerprint = level => digest({ width:level.width,height:level.height,
  playable:boardCells(level).map(key).sort(),blocks:level.blocks.map(b=>[bodyFootprint(b),b.color]).sort(),
  gates:level.gates.map(g=>[g.color,g.side,g.offset,g.size]).sort() });

export function inventorySummary(level, runtime) {
  const queued = new Set((level.generators ?? []).flatMap(g => g.queueBlockIds));
  const opening = level.blocks.filter(b => !queued.has(b.id) && !b.shutterId);
  const q0Issues = level.blocks.flatMap(b => {
    const match = runtime.matchFormalBlockShape(b.shape, 'native-only');
    const colors = b.layers ?? [b.color];
    return match?.quarterTurns === 0 && colors.every(c => nativeArtAvailable(runtime,c,match.shapeId)) ? [] : [b.id];
  });
  const cells = boardCells(level), set = new Set(cells.map(key)), seen = new Set();
  let components = 0;
  for (const p of cells) if (!seen.has(key(p))) {
    components++; const queue = [p]; seen.add(key(p));
    for (const [x, y] of queue) for (const q of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) if (set.has(key(q)) && !seen.has(key(q))) { seen.add(key(q)); queue.push(q); }
  }
  return { bodyCount: level.blocks.length, openingCount: opening.length,
    hiddenCount: level.blocks.filter(b => b.shutterId).length, queuedCount: queued.size,
    shellCount: level.blocks.filter(b => (b.layers?.length ?? 1) > 1).length,
    openingBodyArea: opening.reduce((n, b) => n + b.shape.length, 0), fullBodyArea: level.blocks.reduce((n, b) => n + b.shape.length, 0),
    playableCells: cells.length, rectangularBoard: cells.length === level.width * level.height,
    components, nonNativeOrMissingArtIds: q0Issues,
    hasSeams: Boolean(level.seams?.length), mechanisms: runtime.mechanismsUsedByDailyLevel(level),
    constraints: { iceDoors: [...(level.gates ?? []), ...(level.flipDoors ?? [])].filter(g => g.frozen > 0).map(g => g.frozen),
      numericIce: level.blocks.filter(b => b.frozen > 0).map(b => b.frozen), shutters: (level.shutters ?? []).map(s => ({ skin: s.skin, count: s.count, hiddenBodies: level.blocks.filter(b => b.shutterId === s.id).length })),
      queues: (level.generators ?? []).map(g => g.queueBlockIds.length), bombs: level.blocks.filter(b => b.timedBombSeconds !== undefined).map(b => b.timedBombSeconds) } };
}

/** Whole-board exact cover, starting empty. Source bodies are not local seeds. */
export function retileWholeBoard(source, runtime, { seed = 1, maxNodes = 10000, maxTransitions = 10000, bodyCount = source.blocks.length, irregular = false } = {}) {
  // These are separate construction ceilings, not the rule's board-solver
  // state counter. Solver transitions have their own finite recorded limit.
  if (maxNodes > 10000 || maxTransitions > 10000) throw Error('Construction ceilings must be <= 10000');
  const info = inventorySummary(source, runtime);
  if (info.hiddenCount || info.queuedCount || info.shellCount) return { ok: false, reason: 'full-inventory-needs-cohort-aware-global-construction', inventory: info };
  if (info.components !== 1 || info.hasSeams) return { ok: false, reason: 'source-is-not-a-connected-normal-board', inventory: info };
  const r = random(seed), cells = boardCells(source), cellIndex = new Map(cells.map((p, i) => [key(p), i]));
  const shapes = [...RECTANGLE_SHAPES, ...(irregular ? IRREGULAR_SHAPES : [])].filter(s => runtime.matchFormalBlockShape(s, 'native-only')?.quarterTurns === 0);
  const byCell = cells.map(() => []);
  for (const shape of shapes) for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
    const ids = shape.map(([dx, dy]) => cellIndex.get(key([x + dx, y + dy])));
    if (ids.some(id => id === undefined)) continue;
    const p = { x, y, shape, ids, score: r() };
    for (const id of ids) byCell[id].push(p);
  }
  let nodes = 0, transitions = 0, exhausted = false;
  const occupied = new Uint8Array(cells.length), chosen = [];
  const average = cells.length / bodyCount;
  const dfs = remaining => {
    if (nodes >= maxNodes) { exhausted = true; return false; } nodes++;
    const left = bodyCount - chosen.length;
    const irregularCount = chosen.filter(p => !rectangular(p.shape)).length;
    if (!remaining) return left === 0 && (!irregular || irregularCount > 0);
    if (left <= 0 || remaining < left || remaining > left * 9) return false;
    // Select a random frontier cell among minimum-option cells. Coverage and
    // count constraints are global; no template subcomponent is copied.
    let choices, score = Infinity;
    for (let i = 0; i < cells.length; i++) if (!occupied[i]) {
      const options = byCell[i].filter(p => p.ids.length <= remaining - (left - 1) && !p.ids.some(j => occupied[j])
        && (rectangular(p.shape) || irregularCount < Math.floor(bodyCount * .2)));
      const n = options.length + r() * .4;
      if (n < score) { score = n; choices = options; }
    }
    if (!choices?.length) return false;
    choices = choices.map(p => ({ p, score: Math.abs(p.ids.length - average) * .16 + r() })).sort((a, b) => a.score - b.score).map(x => x.p);
    for (const p of choices) {
      if (transitions >= maxTransitions) { exhausted = true; return false; } transitions++;
      p.ids.forEach(i => occupied[i] = 1); chosen.push(p);
      if (dfs(remaining - p.ids.length)) return true;
      chosen.pop(); p.ids.forEach(i => occupied[i] = 0);
      if (exhausted) return false;
    }
    return false;
  };
  const ok = dfs(cells.length);
  return { ok, reason: ok ? null : exhausted ? 'construction-budget' : 'no-full-cover-with-body-count', nodes, transitions,
    blocks: ok ? chosen.map((p, i) => ({ id: `v3-${source.id}-${seed}-b${i}`, x: p.x, y: p.y, shape: structuredClone(p.shape) })) : undefined,
    inventory: info };
}

function rimApertures(level) {
  const set = new Set(boardCells(level).map(key)), result = [];
  for (const side of ['top', 'right', 'bottom', 'left']) {
    const size = side === 'top' || side === 'bottom' ? level.width : level.height;
    for (let span = 1; span <= 3; span++) for (let offset = 0; offset + span <= size; offset++) {
      const points = Array.from({ length: span }, (_, i) => side === 'top' ? [offset + i, 0] : side === 'bottom' ? [offset + i, level.height - 1] : side === 'left' ? [0, offset + i] : [level.width - 1, offset + i]);
      if (points.every(p => set.has(key(p)))) result.push({ side, offset, size: span });
    }
  }
  return result;
}
const crossSpan = (b, gate) => 1 + Math.max(...b.shape.map(p => p[gate.side === 'top' || gate.side === 'bottom' ? 0 : 1]));
function atInitialExit(b, gate, level) {
  const width = 1 + Math.max(...b.shape.map(p => p[0])), height = 1 + Math.max(...b.shape.map(p => p[1]));
  const horizontal = gate.side === 'top' || gate.side === 'bottom', start = horizontal ? b.x : b.y, span = horizontal ? width : height;
  return start >= gate.offset && start + span <= gate.offset + gate.size && (gate.side === 'top' ? b.y === 0 : gate.side === 'bottom' ? b.y + height === level.height : gate.side === 'left' ? b.x === 0 : b.x + width === level.width);
}

// A connected board can still have a neck too narrow for a particular native
// body. Reject impossible gate colours before spending board search states.
function reachableRimGates(b, gates, level) {
  const playable = new Set(boardCells(level).map(key));
  const legal = (x,y) => b.shape.every(([dx,dy])=>playable.has(key([x+dx,y+dy])));
  const seen = new Set([key([b.x,b.y])]), queue=[[b.x,b.y]], exits=new Set();
  for(const [x,y] of queue){
    for(const g of gates)if(atInitialExit({...b,x,y},g,level))exits.add(g.color);
    for(const [xx,yy]of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
      const k=key([xx,yy]);if(!seen.has(k)&&legal(xx,yy)){seen.add(k);queue.push([xx,yy]);}
    }
  }
  return exits;
}

/** New rim packing plus adjacency colouring, never a global colour permutation. */
export function colourAndPlaceExits(level, runtime, { seed = 1, maxNodes = 10000, maxTransitions = 10000, paletteSize = 8, reserveRimSpans = 0, openingColourBias = false, requirePalette = false, axisExitBias = false } = {}) {
  const r = random(seed), colors = shuffle(Object.keys(runtime.GAME_ART.gameplay.formalBlocks), r).slice(0, paletteSize);
  const rim = shuffle(rimApertures(level), r), gates = [], occupied = new Set();
  const reservedRim=[];
  for(let n=0;n<reserveRimSpans;n++){
    if(!runtime.auditGeneratorMounts)throw Error('Rim reservation requires actual core mount audit');
    const candidates=rim.filter(g=>g.size===3&&Array.from({length:g.size},(_,i)=>`${g.side}:${g.offset+i}`).every(k=>!occupied.has(k))
      &&runtime.auditGeneratorMounts({...level,generators:[...reservedRim,g].map((s,i)=>({id:`reserved-${i}`,side:s.side,offset:s.offset+1,rimSpan:3,rimMount:'rim',queueBlockIds:[]}))}).length===0);
    const choice=candidates.map(g=>({g,score:r()+reservedRim.filter(x=>x.side===g.side).length})).sort((a,b)=>a.score-b.score)[0]?.g;
    if(!choice)return{ok:false,reason:'generator-rim-reservation-unavailable'};
    reservedRim.push(choice);for(let i=0;i<choice.size;i++)occupied.add(`${choice.side}:${choice.offset+i}`);
  }
  for (const color of colors) {
    const choices = rim.filter(g => Array.from({ length: g.size }, (_, i) => `${g.side}:${g.offset + i}`).every(k => !occupied.has(k)));
    // Predominantly narrow exits constrain translation; 2-3 spans retain
    // genuine options for native 2x2/2x3/3x2 bodies and mechanism expansion.
    const choice = choices.map(g => ({ g, score: r() + (g.size === 1 ? .12 : g.size === 2 ? 0 : .30) })).sort((a, b) => a.score - b.score)[0]?.g;
    if (!choice) return { ok: false, reason: 'rim-aperture-packing' };
    gates.push({ id: `v3-g-${color}`, color, ...choice });
    for (let i = 0; i < choice.size; i++) occupied.add(`${choice.side}:${choice.offset + i}`);
  }
  const blockCells = level.blocks.map(b => absoluteCells(b)), adjacent = level.blocks.map((_, i) => level.blocks.flatMap((_, j) => i !== j && blockCells[i].some(([x, y]) => blockCells[j].some(([xx, yy]) => Math.abs(x - xx) + Math.abs(y - yy) === 1)) ? [j] : []));
  const domains = level.blocks.map(b => {
    const match = runtime.matchFormalBlockShape(b.shape, 'native-only');
    const reachable = reachableRimGates(b,gates,level);
    return gates.filter(g => reachable.has(g.color) && nativeArtAvailable(runtime,g.color,match?.shapeId) && crossSpan(b, g) <= g.size).map(g => g.color);
  });
  if (domains.some(d => !d.length)) return { ok: false, reason: 'shape-exit-domain' };
  const potential = shuffle(level.blocks.flatMap((b, i) => gates.filter(g => domains[i].includes(g.color) && atInitialExit(b, g, level)).map(g => ({ i, color: g.color }))), r);
  if (!potential.length) return { ok: false, reason: 'no-opening-exit' };
  const opening = potential[0], assigned = Array(level.blocks.length).fill(null);
  let nodes = 0, transitions = 0, exhausted = false;
  assigned[opening.i] = opening.color;
  const dfs = count => {
    if (nodes >= maxNodes) { exhausted = true; return false; } nodes++;
    if (count === level.blocks.length) return !requirePalette||colors.every(c=>assigned.includes(c));
    if(requirePalette&&colors.filter(c=>!assigned.includes(c)).length>level.blocks.length-count)return false;
    let index = -1, choices = [], least = Infinity;
    for (let i = 0; i < assigned.length; i++) if (!assigned[i]) {
      const excluded = new Set(adjacent[i].map(j => assigned[j])), possible = domains[i].filter(c => !excluded.has(c));
      if (!possible.length) return false;
      const score = possible.length - adjacent[i].length * .01;
      if (score < least) { index = i; choices = possible; least = score; }
    }
    choices = shuffle(choices, r).sort((a, b) => Number(atInitialExit(level.blocks[index], gates.find(g => g.color === a), level)) - Number(atInitialExit(level.blocks[index], gates.find(g => g.color === b), level)));
    if(axisExitBias&&index%3===0){
      const b=level.blocks[index];
      const aligned=c=>{const g=gates.find(g=>g.color===c);if(atInitialExit(b,g,level))return false;
        return g.side==='top'||g.side==='bottom'?b.x>=g.offset&&b.x+Math.max(...b.shape.map(p=>p[0]))<g.offset+g.size
          :b.y>=g.offset&&b.y+Math.max(...b.shape.map(p=>p[1]))<g.offset+g.size;};
      choices.sort((a,b)=>Number(aligned(b))-Number(aligned(a)));
    }
    if(openingColourBias){
      const openingCount=assigned.filter(c=>c===opening.color).length,target=Math.ceil(level.blocks.length/3);
      const missing=colors.filter(c=>!assigned.includes(c)),mustUseMissing=missing.length===level.blocks.length-count;
      choices.sort((a,b)=>{
        const score=c=>(mustUseMissing&&!missing.includes(c)?100:0)+(c===opening.color&&openingCount<target?-10:0)
          +Number(atInitialExit(level.blocks[index],gates.find(g=>g.color===c),level))*3;
        return score(a)-score(b);
      });
    }
    for (const color of choices) {
      if (transitions >= maxTransitions) { exhausted = true; return false; } transitions++;
      assigned[index] = color;
      if (dfs(count + 1)) return true;
      assigned[index] = null;
      if (exhausted) return false;
    }
    return false;
  };
  const ok = dfs(1);
  return { ok, reason: ok ? null : exhausted ? 'colouring-budget' : 'adjacency-colouring', nodes, transitions,
    reservedRim,
    gates: ok ? gates : undefined, blocks: ok ? level.blocks.map((b, i) => ({ ...b, color: assigned[i] })) : undefined,
    initialExitCount: ok ? level.blocks.filter((b, i) => atInitialExit(b, gates.find(g => g.color === assigned[i]), level)).length : null };
}

export function sameFootprintArea(a, b) {
  if (a.width !== b.width || a.height !== b.height) return 0;
  const set = new Set(a.blocks.map(bodyFootprint));
  return b.blocks.filter(x => set.has(bodyFootprint(x))).reduce((n, x) => n + x.shape.length, 0) / Math.max(boardCells(a).length, boardCells(b).length);
}
export function orbitFootprintArea(a, b) {
  let best = 0;
  for (let symmetry=0;symmetry<8;symmetry++) {
    const transform = ([px,py]) => {let x=symmetry>=4?b.width-1-px:px,y=py,w=b.width,h=b.height;
      for(let i=0;i<symmetry%4;i++){[x,y]=[h-1-y,x];[w,h]=[h,w];}return [x,y];};
    const width=symmetry%2?b.height:b.width,height=symmetry%2?b.width:b.height;
    if(width!==a.width||height!==a.height)continue;
    const transformed={width,height,playable:boardCells(b).map(transform),blocks:b.blocks.map(block=>{
      const cells=absoluteCells(block).map(transform),x=Math.min(...cells.map(p=>p[0])),y=Math.min(...cells.map(p=>p[1]));
      return{x,y,shape:cells.map(([xx,yy])=>[xx-x,yy-y])};})};
    best=Math.max(best,sameFootprintArea(a,transformed));
  }
  return best;
}

export function buildGlobalCandidate(source, runtime, options = {}) {
  const { seed = 1 } = options, partition = retileWholeBoard(source, runtime, options);
  if (!partition.ok) return { ok: false, phase: 'partition', ...partition };
  const level = { id: source.id, name: `荣耀联赛全局重铺候选 ${source.id}-${seed}`, difficulty: 'super', reward: 0,
    width: source.width, height: source.height, ...(source.playable ? { playable: structuredClone(source.playable) } : {}),
    ...(source.blocked ? { blocked: structuredClone(source.blocked) } : {}),
    timeSeconds: source.timeSeconds, parMoves: source.parMoves, mechanismRules: 'revised-2026-09-27-v1.5', blocks: partition.blocks, gates: [] };
  const paint = colourAndPlaceExits(level, runtime, { ...options, seed: seed ^ 0x73ac918 });
  if (!paint.ok) return { ok: false, phase: 'colour-rim', reason: paint.reason, partitionSearch: { nodes: partition.nodes, transitions: partition.transitions }, colouringSearch: paint };
  level.blocks = paint.blocks; level.gates = paint.gates;
  try { runtime.validateLevel(level); } catch (error) { return { ok: false, phase: 'static', reason: error.message, level }; }
  const shapeChanges = source.blocks.map(b => digest(b.shape)).sort().join(',') !== level.blocks.map(b => digest(b.shape)).sort().join(',');
  return { ok: true, level, levelSha256: digest(level), sourceLevelSha256: digest(source), factoryVersion: FACTORY_VERSION,
    construction: { seed, partitionSearch: { nodes: partition.nodes, transitions: partition.transitions }, colouringSearch: { nodes: paint.nodes, transitions: paint.transitions },
      initialExitCount: paint.initialExitCount, sourceFootprintAreaRetained: sameFootprintArea(source, level),
      reservedGeneratorRim: paint.reservedRim,
      sourceBodyCount: source.blocks.length, candidateBodyCount: level.blocks.length, sourceBodyArea: partition.inventory.fullBodyArea,
      candidateBodyArea: level.blocks.reduce((n, b) => n + b.shape.length, 0), sourceShapeMultisetChanged: shapeChanges,
      sourceBoardExactlyRetained: true, sourceInventoryPolicy: level.blocks.length === source.blocks.length
        ? 'Keep all source bodies one-for-one; reshape, recolour and globally repack. Hidden/queue/shell inventory sources are explicitly deferred, never flattened or discarded.'
        : 'Retain the exact normal campaign board; rebuild the entire visible inventory at the recorded candidate body count. Original source count is explicitly recorded, not claimed identical. Hidden/queue/shell sources are deferred, never flattened or discarded.',
      actualMechanisms: runtime.mechanismsUsedByDailyLevel(level),
      removedSourceMechanisms: partition.inventory.mechanisms.filter(m => !runtime.mechanismsUsedByDailyLevel(level).includes(m)), sourceTemplateCopied: false } };
}
