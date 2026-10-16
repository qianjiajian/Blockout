import assert from 'node:assert/strict';
import {random,boardCells,absoluteCells,bodyFootprint,longBar} from '../formal-v3/diversity-layout-factory.mjs';
import {gateParallelExposure,parallelOrdinaryFeedRisk} from './wholeboard-interface-preference-v1.mjs';
export const SELF='tools/daily-challenge/formal-v4/wholeboard-interface-ice-first-full-colour-v1.mjs';
export const VERSION='wholeboard-interface-ice-first-full-rim-colouring-v1';
const key=p=>p.join(',');
const shuffle=(xs,r)=>xs.map(x=>({x,n:r()})).sort((a,b)=>a.n-b.n).map(x=>x.x);
/** Optimistic scalar support only, not a spatial route or an existence proof.
 * Domains ignore future adjacency. A trial is one scalar, never a full world. */
export function partialIceColourSupport(assigned,domains,gates,minimumColours,trial=null,charge=()=>{}) {
  const ice=gates.filter(g=>g.frozen).sort((a,b)=>a.frozen-b.frozen);
  assert.equal(ice.length,2);const [low,high]=ice;
  const used=new Set(),possible=new Set();let remaining=0,ordinaryMax=0,beforeHighMax=0,lowMax=0,highMax=0;
  for(let i=0;i<assigned.length;i++){
    charge();const c=trial?.index===i?trial.color:assigned[i];
    if(c)used.add(c);else remaining++;
    const options=c?[c]:domains[i];let ordinary=false,beforeHigh=false,canLow=false,canHigh=false;
    for(const color of options){charge();possible.add(color);ordinary ||= color!==low.color&&color!==high.color;
      beforeHigh ||= color!==high.color;canLow ||= color===low.color;canHigh ||= color===high.color;}
    ordinaryMax+=Number(ordinary);beforeHighMax+=Number(beforeHigh);lowMax+=Number(canLow);highMax+=Number(canHigh);
  }
  return used.size+remaining>=minimumColours&&possible.size>=minimumColours&&lowMax>0&&highMax>0
    &&ordinaryMax>=low.frozen&&beforeHighMax>=high.frozen;
}
/** Narrow observation fork: gate/colour domains and ordering are inherited.
 * At the first complete colour assignment the complete original-mask level
 * is retained BEFORE node/minimum-colour/mobility/post-callback rejection.
 * It is terminal even when old code would backtrack. No second leaf.
 * Uncoloured partition/frame and partial assignments are not full levels. */
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
export function colourAndPlaceIceExitsFirstFull(level, runtime, { seed = 1, maxNodes = 10000, maxTransitions = 10000, paletteSize = 8, reservedGeneratorBerths = 0,shapeProfile='balanced',primaryExitQuota=3,referenceExitField=[],referenceExitFieldMode='none',fixedBlocks=[], reserveFullWorld, onFullWorld, qualificationOnly=false, gateIceCounts=[7,10],preferenceMeter,preferenceEnabled=true } = {}) {
  assert(preferenceMeter&&typeof preferenceMeter.charge==='function');if(!qualificationOnly)assert(preferenceEnabled);
  assert.equal(typeof reserveFullWorld,'function');assert.equal(typeof onFullWorld,'function');
  assert.equal(gateIceCounts.length,2);assert(gateIceCounts.every(Number.isSafeInteger)&&gateIceCounts[0]>0&&gateIceCounts[1]>gateIceCounts[0]);
  if(!qualificationOnly)assert.deepEqual(gateIceCounts,[7,10]);assert(paletteSize>=3);
  if(qualificationOnly)assert(level.id>=990000&&boardCells(level).length<=16&&level.blocks.length<=8);
  let firstFull=null,leafCount=0,fullReserved=false,fullFacts=null,supportChecks=0,supportPrunes=0,nodes=0,transitions=0;
  const chargeSupport=()=>{if(supportChecks>=1000000)throw Error('partial-colour-support-budget');supportChecks++;};
  try {
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
    const choice = choices.map(g => ({ g, score: r() + (g.size === 1 ? .12 : g.size === 2 ? 0 : .30) + (preferenceEnabled?gateParallelExposure(level,g,k=>preferenceMeter.charge(k)):0) })).sort((a, b) => a.score - b.score)[0]?.g;
    if (!choice) return { ok: false, reason: 'rim-aperture-packing' };
    gates.push({ id: `v3-g-${color}`, color, ...choice });
    for (let i = 0; i < choice.size; i++) occupied.add(`${choice.side}:${choice.offset + i}`);
  }
  // Real ice values are installed before any body colour is assigned.
  gates[gates.length-2].frozen=gateIceCounts[0];gates[gates.length-1].frozen=gateIceCounts[1];
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
  const potential = shuffle(level.blocks.flatMap((b, i) => gates.filter(g => !g.frozen && domains[i].includes(g.color) && atInitialExit(b, g, level)).map(g => ({ i, color: g.color }))), r);
  if (!potential.length) return { ok: false, reason: 'no-opening-exit' };
  const minimumOpeningArea=shapeProfile==='dense'?4:['bar-mix','axial-bars'].includes(shapeProfile)?3:2;
  const opening = potential.find(p=>level.blocks[p.i].shape.length>=minimumOpeningArea);
  if(!opening)return {ok:false,reason:`no-${minimumOpeningArea}-cell-clearing-start`};
  const assigned = Array(level.blocks.length).fill(null);
  let exhausted = false;
  if(level.blocks.length===1){reserveFullWorld();fullReserved=true;}
  assigned[opening.i] = opening.color;
  const dfs = count => {
    if (count === level.blocks.length) {
      assert(fullReserved,'Reserve before the last colour assignment');assert.equal(leafCount,0);leafCount++;
      firstFull={...level,blocks:level.blocks.map((b,i)=>({...b,color:assigned[i]})),gates};
      fullFacts={nodes,transitions,colourCount:new Set(assigned).size,minimumColours:Math.min(6,paletteSize),gateIceCounts:[...gateIceCounts],supportChecks,supportPrunes};
      onFullWorld(firstFull,fullFacts);
      if(nodes>=maxNodes)throw Error('colouring-budget-after-first-full');nodes++;
      return true;
    }
    if (nodes >= maxNodes) { exhausted = true; return false; } nodes++;
    if(!partialIceColourSupport(assigned,domains,gates,Math.min(6,paletteSize),null,chargeSupport)){supportPrunes++;return false;}
    let index = -1, choices = [], least = Infinity;
    for (let i = 0; i < assigned.length; i++) if (!assigned[i]) {
      const excluded = new Set(adjacent[i].map(j => assigned[j])), possible = domains[i].filter(c => !excluded.has(c));
      if (!possible.length) return false;
      const score = possible.length - adjacent[i].length * .01;
      if (score < least) { index = i; choices = possible; least = score; }
    }
    const usedColors=new Set(assigned.filter(Boolean));
    choices = shuffle(choices, r).sort((a, b) => (preferenceEnabled?parallelOrdinaryFeedRisk(level,index,a,assigned,gates,k=>preferenceMeter.charge(k))-parallelOrdinaryFeedRisk(level,index,b,assigned,gates,k=>preferenceMeter.charge(k)):0) || Number(atInitialExit(level.blocks[index], gates.find(g => g.color === a), level)) - Number(atInitialExit(level.blocks[index], gates.find(g => g.color === b), level))
      || (usedColors.size<Math.min(6,paletteSize)?Number(usedColors.has(a))-Number(usedColors.has(b)):0));
    for (const color of choices) {
      if (transitions >= maxTransitions) { exhausted = true; return false; } transitions++;
      // Scalar trial precedes the last colour write: no hidden complete world.
      if(!partialIceColourSupport(assigned,domains,gates,Math.min(6,paletteSize),{index,color},chargeSupport)){supportPrunes++;continue;}
      if(count+1===level.blocks.length){assert(!fullReserved);reserveFullWorld();fullReserved=true;}
      assigned[index] = color;
      if (dfs(count + 1)) return true;
      assigned[index] = null;
      if (exhausted) return false;
    }
    return false;
  };
  const ok = dfs(1);
  if(ok&&fullFacts.colourCount<Math.min(6,paletteSize))return{ok:false,reason:'first-full-minimum-colours-not-met',nodes,transitions,level:firstFull,leafCount,fullFacts,supportChecks,supportPrunes};
  if(ok){
    const cleared=new Set(level.blocks.flatMap((b,i)=>!gates.find(g=>g.color===assigned[i]).frozen&&atInitialExit(b,gates.find(g=>g.color===assigned[i]),level)?[i]:[]));
    const allowed=new Set(boardCells(level).map(key));
    const movable=level.blocks.some((b,i)=>{
      if(cleared.has(i))return false;
      const occupied=new Set(level.blocks.flatMap((x,j)=>j!==i&&!cleared.has(j)?absoluteCells(x).map(key):[]));
      return [[0,-1],[1,0],[0,1],[-1,0]].some(([dx,dy])=>absoluteCells(b).every(([x,y])=>allowed.has(key([x+dx,y+dy]))&&!occupied.has(key([x+dx,y+dy]))));
    });
    if(!movable)return{ok:false,reason:'clearing-start-leaves-no-movable-body',nodes,transitions,level:firstFull,leafCount,fullFacts,supportChecks,supportPrunes};
  }
  return { ok, reason: ok ? null : exhausted ? 'colouring-budget' : 'adjacency-colouring', nodes, transitions,
    level:firstFull,leafCount,fullFacts,supportChecks,supportPrunes,gates:ok?firstFull.gates:undefined,blocks:ok?firstFull.blocks:undefined,
    reservedGeneratorBerths:reserved,
    referenceExitSideConstraints:level.blocks.flatMap((b,i)=>requiredSides[i]?[{blockId:b.id,side:requiredSides[i]}]:[]),
    emptyBoardSingleBodyMicroStates:emptyBoardReachability.reduce((n,x)=>n+x.microStates,0),
    initialExitCount: ok ? level.blocks.filter((b, i) => !gates.find(g=>g.color===assigned[i]).frozen&&atInitialExit(b, gates.find(g => g.color === assigned[i]), level)).length : null };
  }catch(error){return{ok:false,reason:error.message,nodes,transitions,level:firstFull,leafCount,fullFacts,supportChecks,supportPrunes,fullReserved};}
}

