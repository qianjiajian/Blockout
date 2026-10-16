import { createHash } from 'node:crypto';

export const FACTORY_VERSION = 'whole-board-exact-cover-rim-colouring-v3.9';
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
export const longBar = shape => rectangular(shape)&&shape.length>=3&&(Math.max(...shape.map(p=>p[0]))===0||Math.max(...shape.map(p=>p[1]))===0);
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
    return match?.quarterTurns === 0 && colors.every(c => runtime.GAME_ART.gameplay.formalBlocks[c]?.solid?.[match.shapeId]) ? [] : [b.id];
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
    hiddenCohorts:(level.shutters??[]).map(s=>({id:s.id,skin:s.skin??'shutter',count:s.count,
      sourceRegion:structuredClone(s),bodyCount:level.blocks.filter(b=>b.shutterId===s.id).length,
      bodyArea:level.blocks.filter(b=>b.shutterId===s.id).reduce((n,b)=>n+b.shape.length,0)})),
    queueCohorts:(level.generators??[]).map(g=>({id:g.id,sourceMachine:structuredClone(g),bodyCount:g.queueBlockIds.length,
      bodyArea:g.queueBlockIds.reduce((n,id)=>n+(level.blocks.find(b=>b.id===id)?.shape.length??0),0)})),
    shellInventories:level.blocks.filter(b=>(b.layers?.length??1)>1).map(b=>({id:b.id,colors:structuredClone(b.layers),physicalBodyArea:b.shape.length})),
    hasSeams: Boolean(level.seams?.length), mechanisms: runtime.mechanismsUsedByDailyLevel(level),
    constraints: { iceDoors: [...(level.gates ?? []), ...(level.flipDoors ?? [])].filter(g => g.frozen > 0).map(g => g.frozen),
      numericIce: level.blocks.filter(b => b.frozen > 0).map(b => b.frozen), shutters: (level.shutters ?? []).map(s => ({ skin: s.skin, count: s.count, hiddenBodies: level.blocks.filter(b => b.shutterId === s.id).length })),
      queues: (level.generators ?? []).map(g => g.queueBlockIds.length), bombs: level.blocks.filter(b => b.timedBombSeconds !== undefined).map(b => b.timedBombSeconds) } };
}

/** Whole-board exact cover, starting empty. Source bodies are not local seeds. */
export function retileWholeBoard(source, runtime, { seed = 1, maxNodes = 10000, maxTransitions = 10000, bodyCount = source.blocks.length, irregular = false, minimumIrregular = irregular ? 2 : 0,shapeProfile='balanced',fixedBlocks=[],forbiddenFootprints=[] } = {}) {
  // These are separate construction ceilings, not the rule's board-solver
  // state counter. Solver transitions have their own finite recorded limit.
  if (maxNodes > 10000 || maxTransitions > 10000) throw Error('Construction ceilings must be <= 10000');
  const info = inventorySummary(source, runtime);
  if (info.components !== 1 || info.hasSeams) return { ok: false, reason: 'source-is-not-a-connected-normal-board', inventory: info };
  const r = random(seed), cells = boardCells(source), cellIndex = new Map(cells.map((p, i) => [key(p), i]));
  const shapes = [...RECTANGLE_SHAPES, ...(irregular ? IRREGULAR_SHAPES : [])].filter(s => {
    const match=runtime.matchFormalBlockShape(s,'native-only');
    return s.length<=6 && (!['small-irregular','bar-mix','axial-bars'].includes(shapeProfile)||rectangular(s)||s.length<=3)
      && match?.quarterTurns===0 && Object.values(runtime.GAME_ART.gameplay.formalBlocks).filter(c=>c.solid?.[match.shapeId]).length>=4;
  });
  const forbidden=new Set(forbiddenFootprints),byCell = cells.map(() => []);
  for (const shape of shapes) for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
    const ids = shape.map(([dx, dy]) => cellIndex.get(key([x + dx, y + dy])));
    if (ids.some(id => id === undefined)||forbidden.has(bodyFootprint({x,y,shape}))) continue;
    const p = { x, y, shape, ids, score: r() };
    for (const id of ids) byCell[id].push(p);
  }
  let nodes = 0, transitions = 0, exhausted = false;
  const occupied = new Uint8Array(cells.length), chosen = [];
  let fixedArea=0;
  for(const b of fixedBlocks){
    const ids=b.shape.map(([dx,dy])=>cellIndex.get(key([b.x+dx,b.y+dy])));
    if(ids.some(id=>id===undefined||occupied[id])||!shapes.some(s=>digest(s)===digest(b.shape)))return{ok:false,reason:'invalid-fixed-original-orientation-footprint'};
    ids.forEach(id=>occupied[id]=1);chosen.push({x:b.x,y:b.y,shape:structuredClone(b.shape),ids,score:0});fixedArea+=ids.length;
  }
  const average = cells.length / bodyCount;
  const minimumBars=shapeProfile==='axial-bars'?Math.ceil(bodyCount*.65):shapeProfile==='bar-mix'?Math.ceil(bodyCount*.4):0,
    maximumBars=shapeProfile==='axial-bars'?Math.floor(bodyCount*.85):shapeProfile==='bar-mix'?Math.floor(bodyCount*.65):bodyCount,
    horizontalBias=(seed&1)===0;
  const isPrimaryBar=shape=>longBar(shape)&&((Math.max(...shape.map(p=>p[1]))===0)===horizontalBias);
  const minimumPrimaryBars=shapeProfile==='axial-bars'?Math.ceil(bodyCount*.5):0;
  const dfs = remaining => {
    if (nodes >= maxNodes) { exhausted = true; return false; } nodes++;
    const left = bodyCount - chosen.length;
    const irregularCount = chosen.filter(p => !rectangular(p.shape)).length;
    const barCount=chosen.filter(p=>longBar(p.shape)).length,singleCount=chosen.filter(p=>p.shape.length===1).length,
      primaryBars=chosen.filter(p=>isPrimaryBar(p.shape)).length;
    if (!remaining) return left === 0 && irregularCount >= minimumIrregular && barCount>=minimumBars&&primaryBars>=minimumPrimaryBars;
    if (left <= 0 || remaining < left || remaining > left * 6 || irregularCount+left<minimumIrregular || barCount+left<minimumBars||primaryBars+left<minimumPrimaryBars) return false;
    // Select a random frontier cell among minimum-option cells. Coverage and
    // count constraints are global; no template subcomponent is copied.
    let choices, score = Infinity;
    for (let i = 0; i < cells.length; i++) if (!occupied[i]) {
      const options = byCell[i].filter(p => p.ids.length <= remaining - (left - 1) && !p.ids.some(j => occupied[j])
        && (rectangular(p.shape) || irregularCount < Math.floor(bodyCount * .2))
        && (!longBar(p.shape)||barCount<maximumBars)
        && (shapeProfile!=='bar-mix'||p.shape.length!==1||singleCount<2)
        && (shapeProfile!=='axial-bars'||p.shape.length!==1||singleCount<1));
      const n = options.length + r() * .4;
      if (n < score) { score = n; choices = options; }
    }
    if (!choices?.length) return false;
    choices = choices.map(p => ({ p, score: Math.abs(p.ids.length - average) * .16 + r()
      + (shapeProfile==='dense'&&p.shape.length<=2?.3:0)
      - (shapeProfile==='bar-mix'&&barCount<minimumBars&&longBar(p.shape)?.2:0)
      - (shapeProfile==='bar-mix'&&longBar(p.shape)&&((Math.max(...p.shape.map(q=>q[1]))===0)===horizontalBias)?.18:0)
      - (shapeProfile==='axial-bars'&&barCount<minimumBars&&longBar(p.shape)?.32:0)
      - (shapeProfile==='axial-bars'&&primaryBars<minimumPrimaryBars&&isPrimaryBar(p.shape)?.4:0)
      - (irregularCount < minimumIrregular && !rectangular(p.shape) ? .25 : 0) })).sort((a, b) => a.score - b.score).map(x => x.p);
    for (const p of choices) {
      if (transitions >= maxTransitions) { exhausted = true; return false; } transitions++;
      p.ids.forEach(i => occupied[i] = 1); chosen.push(p);
      if (dfs(remaining - p.ids.length)) return true;
      chosen.pop(); p.ids.forEach(i => occupied[i] = 0);
      if (exhausted) return false;
    }
    return false;
  };
  const ok = dfs(cells.length-fixedArea);
  return { ok, reason: ok ? null : exhausted ? 'construction-budget' : 'no-full-cover-with-body-count', nodes, transitions,
    blocks: ok ? chosen.map((p, i) => ({ id: `v3-${source.id}-${seed}-b${i}`, x: p.x, y: p.y, shape: structuredClone(p.shape) })) : undefined,
    fixedArea,fixedBodies:fixedBlocks.length,forbiddenFootprintCount:forbidden.size,inventory: info };
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

// A necessary construction condition on the preserved board mask. This walks
// one body on an otherwise empty board, never a multi-body puzzle state. It
// rejects colours whose exit lies outside that body's geometric component.
function emptyBoardExitColours(level, block, gates) {
  const playable=new Set(boardCells(level).map(key));
  const queue=[[block.x,block.y]],seen=new Set([key(queue[0])]),colours=new Set();
  for(let i=0;i<queue.length;i++){
    const [x,y]=queue[i],at={...block,x,y};
    for(const gate of gates)if(crossSpan(block,gate)<=gate.size&&atInitialExit(at,gate,level))colours.add(gate.color);
    for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
      const p=[x+dx,y+dy],k=key(p);
      if(!seen.has(k)&&block.shape.every(([sx,sy])=>playable.has(key([p[0]+sx,p[1]+sy])))){
        seen.add(k);queue.push(p);
      }
    }
  }
  return {colours,microStates:seen.size};
}

/** New rim packing plus adjacency colouring, never a global colour permutation. */
export function colourAndPlaceExits(level, runtime, { seed = 1, maxNodes = 10000, maxTransitions = 10000, paletteSize = 8, reservedGeneratorBerths = 0,shapeProfile='balanced',primaryExitQuota=3,referenceExitField=[],referenceExitFieldMode='none',fixedBlocks=[] } = {}) {
  if(!['none','anchors','long-bars','all'].includes(referenceExitFieldMode))throw Error('Unknown reference exit direction constraint');
  const r = random(seed), colors = shuffle(Object.keys(runtime.GAME_ART.gameplay.formalBlocks), r).slice(0, paletteSize);
  const rim = shuffle(rimApertures(level), r), gates = [], occupied = new Set();
  const reserved=[];
  for(const side of shuffle(['top','right','bottom','left'],r).slice(0,reservedGeneratorBerths)){
    const sideLength=side==='top'||side==='bottom'?level.width:level.height;
    const possibilities=rim.filter(g=>g.side===side&&g.size===3&&g.offset>=1&&g.offset+g.size<=sideLength-1);
    if(!possibilities.length)return {ok:false,reason:'no-native-three-rail-generator-berth'};
    const berth=possibilities[0];reserved.push(berth);
    for(let i=0;i<berth.size;i++)occupied.add(`${berth.side}:${berth.offset+i}`);
  }
  const primaryExitPlan=shuffle(Array.from({length:colors.length},(_,i)=>i<primaryExitQuota),r);
  const primarySides=(seed&1)===0?['left','right']:['top','bottom'];
  for (const [colorIndex,color] of colors.entries()) {
    const choices = rim.filter(g => Array.from({ length: g.size }, (_, i) => `${g.side}:${g.offset + i}`).every(k => !occupied.has(k))
      &&(shapeProfile!=='axial-bars'||g.size<=2&&primarySides.includes(g.side)===primaryExitPlan[colorIndex]));
    // Predominantly narrow exits constrain translation; 2-3 spans retain
    // genuine options for native 2x2/2x3/3x2 bodies and mechanism expansion.
    const choice = choices.map(g => ({ g, score: r() + (g.size === 1 ? .12 : g.size === 2 ? 0 : .30) })).sort((a, b) => a.score - b.score)[0]?.g;
    if (!choice) return { ok: false, reason: 'rim-aperture-packing' };
    gates.push({ id: `v3-g-${color}`, color, ...choice });
    for (let i = 0; i < choice.size; i++) occupied.add(`${choice.side}:${choice.offset + i}`);
  }
  const blockCells = level.blocks.map(b => absoluteCells(b)), adjacent = level.blocks.map((_, i) => level.blocks.flatMap((_, j) => i !== j && blockCells[i].some(([x, y]) => blockCells[j].some(([xx, yy]) => Math.abs(x - xx) + Math.abs(y - yy) === 1)) ? [j] : []));
  const emptyBoardReachability=level.blocks.map(b=>emptyBoardExitColours(level,b,gates));
  const field=new Map(referenceExitField.map(p=>[`${p.x},${p.y}`,p.side])),anchorFootprints=new Set(fixedBlocks.map(bodyFootprint));
  const requiredSides=level.blocks.map(b=>{
    if(referenceExitFieldMode==='none'||referenceExitFieldMode==='anchors'&&!anchorFootprints.has(bodyFootprint(b))
      ||referenceExitFieldMode==='long-bars'&&!longBar(b.shape)&&!anchorFootprints.has(bodyFootprint(b)))return null;
    const counts=new Map();for(const p of absoluteCells(b)){const side=field.get(key(p));if(side)counts.set(side,(counts.get(side)??0)+1);}
    return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]??null;
  });
  const domains = level.blocks.map((b,i) => {
    const match = runtime.matchFormalBlockShape(b.shape, 'native-only');
    return gates.filter(g => runtime.GAME_ART.gameplay.formalBlocks[g.color]?.solid?.[match?.shapeId] && emptyBoardReachability[i].colours.has(g.color)
      &&(!requiredSides[i]||g.side===requiredSides[i])).map(g => g.color);
  });
  if (domains.some(d => !d.length)) return { ok: false, reason: 'shape-exit-domain' };
  const potential = shuffle(level.blocks.flatMap((b, i) => gates.filter(g => domains[i].includes(g.color) && atInitialExit(b, g, level)).map(g => ({ i, color: g.color }))), r);
  if (!potential.length) return { ok: false, reason: 'no-opening-exit' };
  const minimumOpeningArea=shapeProfile==='dense'?4:['bar-mix','axial-bars'].includes(shapeProfile)?3:2;
  const opening = potential.find(p=>level.blocks[p.i].shape.length>=minimumOpeningArea);
  if(!opening)return {ok:false,reason:`no-${minimumOpeningArea}-cell-clearing-start`};
  const assigned = Array(level.blocks.length).fill(null);
  let nodes = 0, transitions = 0, exhausted = false;
  assigned[opening.i] = opening.color;
  const dfs = count => {
    if (nodes >= maxNodes) { exhausted = true; return false; } nodes++;
    if (count === level.blocks.length) return new Set(assigned).size>=Math.min(6,paletteSize);
    let index = -1, choices = [], least = Infinity;
    for (let i = 0; i < assigned.length; i++) if (!assigned[i]) {
      const excluded = new Set(adjacent[i].map(j => assigned[j])), possible = domains[i].filter(c => !excluded.has(c));
      if (!possible.length) return false;
      const score = possible.length - adjacent[i].length * .01;
      if (score < least) { index = i; choices = possible; least = score; }
    }
    const usedColors=new Set(assigned.filter(Boolean));
    choices = shuffle(choices, r).sort((a, b) => Number(atInitialExit(level.blocks[index], gates.find(g => g.color === a), level)) - Number(atInitialExit(level.blocks[index], gates.find(g => g.color === b), level))
      || (usedColors.size<Math.min(6,paletteSize)?Number(usedColors.has(a))-Number(usedColors.has(b)):0));
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
  if(ok){
    const cleared=new Set(level.blocks.flatMap((b,i)=>atInitialExit(b,gates.find(g=>g.color===assigned[i]),level)?[i]:[]));
    const allowed=new Set(boardCells(level).map(key));
    const movable=level.blocks.some((b,i)=>{
      if(cleared.has(i))return false;
      const occupied=new Set(level.blocks.flatMap((x,j)=>j!==i&&!cleared.has(j)?absoluteCells(x).map(key):[]));
      return [[0,-1],[1,0],[0,1],[-1,0]].some(([dx,dy])=>absoluteCells(b).every(([x,y])=>allowed.has(key([x+dx,y+dy]))&&!occupied.has(key([x+dx,y+dy]))));
    });
    if(!movable)return{ok:false,reason:'clearing-start-leaves-no-movable-body',nodes,transitions};
  }
  return { ok, reason: ok ? null : exhausted ? 'colouring-budget' : 'adjacency-colouring', nodes, transitions,
    gates: ok ? gates : undefined, blocks: ok ? level.blocks.map((b, i) => ({ ...b, color: assigned[i] })) : undefined,
    reservedGeneratorBerths:reserved,
    referenceExitSideConstraints:level.blocks.flatMap((b,i)=>requiredSides[i]?[{blockId:b.id,side:requiredSides[i]}]:[]),
    emptyBoardSingleBodyMicroStates:emptyBoardReachability.reduce((n,x)=>n+x.microStates,0),
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
  const { seed = 1 } = options,r=random(seed^0x714c),area=boardCells(source).length;
  const shapeProfile=options.shapeProfile??'balanced';
  const meanArea=shapeProfile==='dense'?3.2+r()*.9:shapeProfile==='axial-bars'?2.75+r()*.35:['small-irregular','bar-mix'].includes(shapeProfile)?2.6+r()*.45:2.2+r()*1.3;
  const bodyCount=options.bodyCount??Math.min(area,Math.max(options.irregular?10:8,Math.round(area/meanArea)));
  const partition = retileWholeBoard(source, runtime, {...options,bodyCount});
  if (!partition.ok) return { ok: false, phase: 'partition', ...partition };
  const level = { id: source.id, name: `每日挑战多样原型 ${source.id}-${seed}`, difficulty: 'super', reward: 0,
    width: source.width, height: source.height, ...(source.playable ? { playable: structuredClone(source.playable) } : {}),
    ...(source.blocked ? { blocked: structuredClone(source.blocked) } : {}),
    timeSeconds: source.timeSeconds, parMoves: source.parMoves, mechanismRules: 'revised-2026-09-27-v1.5', blocks: partition.blocks, gates: [] };
  const paint = colourAndPlaceExits(level, runtime, { ...options, seed: seed ^ 0x73ac918 });
  if (!paint.ok) return { ok: false, phase: 'colour-rim', reason: paint.reason, partitionSearch: { nodes: partition.nodes, transitions: partition.transitions }, colouringSearch: paint };
  level.blocks = paint.blocks; level.gates = paint.gates;
  try { runtime.validateLevel(level); } catch (error) { return { ok: false, phase: 'static', reason: error.message, level }; }
  const shapeChanges = source.blocks.map(b => digest(b.shape)).sort().join(',') !== level.blocks.map(b => digest(b.shape)).sort().join(',');
  return { ok: true, level, levelSha256: digest(level), sourceLevelSha256: digest(source), factoryVersion: FACTORY_VERSION,
    construction: { seed, shapeProfile,plannedMeanBodyArea:meanArea,primaryExitQuota:shapeProfile==='axial-bars'?(options.primaryExitQuota??3):null,
      primaryBarAxis:shapeProfile==='axial-bars'?((seed&1)===0?'horizontal':'vertical'):null, partitionSearch: { nodes: partition.nodes, transitions: partition.transitions }, colouringSearch: { nodes: paint.nodes, transitions: paint.transitions },
      initialExitCount: paint.initialExitCount, sourceFootprintAreaRetained: sameFootprintArea(source, level),
      emptyBoardSingleBodyMicroStates:paint.emptyBoardSingleBodyMicroStates,
      reservedGeneratorBerths: paint.reservedGeneratorBerths,
      referenceExitSideConstraints:paint.referenceExitSideConstraints,
      sourceBodyCount: source.blocks.length, candidateBodyCount: level.blocks.length, bodyCountDifference:level.blocks.length-source.blocks.length,sourceBodyArea: partition.inventory.fullBodyArea,
      sourceInventory:partition.inventory,
      candidateBodyArea: level.blocks.reduce((n, b) => n + b.shape.length, 0), sourceShapeMultisetChanged: shapeChanges,
      candidateInventory:{openingBodies:level.blocks.length,hiddenBodies:0,queueBodies:0,shellBodies:0,
        fullBodyArea:level.blocks.reduce((n,b)=>n+b.shape.length,0),allPlayableCellsReallyCovered:true,
        longBars:level.blocks.filter(b=>longBar(b.shape)).length,singles:level.blocks.filter(b=>b.shape.length===1).length},
      sourceBoardExactlyRetained: true, sourceInventoryPolicy: 'Daily v1.154 adaptation preserves source dimensions and playable mask, not the mainline source inventory. Source opening, hidden cohorts, queues and shell layers are disclosed separately. The candidate is a newly authored, fully covered opening with explicit split/merge and count adaptation; no source hidden or queue inventory is claimed as retained. Later mechanism enrichment must disclose and clear the entire new daily inventory.',
      actualMechanisms: runtime.mechanismsUsedByDailyLevel(level),
      removedSourceMechanisms: partition.inventory.mechanisms.filter(m => !runtime.mechanismsUsedByDailyLevel(level).includes(m)), sourceTemplateCopied: false } };
}
