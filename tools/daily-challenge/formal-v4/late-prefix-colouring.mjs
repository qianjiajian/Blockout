import {random,absoluteCells,boardCells,bodyFootprint,longBar} from '../formal-v3/diversity-layout-factory.mjs';
const key=p=>p.join(',');const shuffle=(xs,r)=>xs.map(x=>({x,n:r()})).sort((a,b)=>a.n-b.n).map(x=>x.x);
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
function emptyBoardExitColours(level, block, gates, meter) {
  const playable=new Set(boardCells(level).map(key));
  const queue=[[block.x,block.y]],seen=new Set([key(queue[0])]),colours=new Set(); meter.micro();
  for(let i=0;i<queue.length;i++){
    const [x,y]=queue[i],at={...block,x,y};
    for(const gate of gates)if(crossSpan(block,gate)<=gate.size&&atInitialExit(at,gate,level))colours.add(gate.color);
    for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){meter.microTransition();
      const p=[x+dx,y+dy],k=key(p);
      if(!seen.has(k)&&block.shape.every(([sx,sy])=>playable.has(key([p[0]+sx,p[1]+sy])))){
        meter.micro();seen.add(k);queue.push(p);
      }
    }
  }
  return {colours,microStates:seen.size};
}

function colourInternal(level, runtime, meter, { seed = 1, maxNodes = 10000, maxTransitions = 10000, paletteSize = 8, reservedGeneratorBerths = 0,shapeProfile='balanced',primaryExitQuota=3,referenceExitField=[],referenceExitFieldMode='none',fixedBlocks=[],fixedBodyColours={},forbiddenBodyColours={},mappedPrefix } = {}) {
  if(!['none','anchors','long-bars','all'].includes(referenceExitFieldMode))throw Error('Unknown reference exit direction constraint');
  const r = random(seed), colors = shuffle(Object.keys(runtime.GAME_ART.gameplay.formalBlocks), r).slice(0, paletteSize);
  if(!mappedPrefix?.ok)throw Error('Mapped fixed prefix required');
  const rim = shuffle(rimApertures(level), r), gates = structuredClone(mappedPrefix.preservedGates), occupied = new Set();
  for(const g of gates){if(!rim.some(x=>x.side===g.side&&x.offset===g.offset&&x.size===g.size))return{ok:false,reason:'mapped-initial-portal-not-exposed'};for(let i=0;i<g.size;i++){const k=g.side+':'+(g.offset+i);if(occupied.has(k))return{ok:false,reason:'mapped-initial-portals-overlap'};occupied.add(k);}}
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
    if(gates.some(g=>g.color===color))continue;
    const choices = rim.filter(g => Array.from({ length: g.size }, (_, i) => `${g.side}:${g.offset + i}`).every(k => !occupied.has(k))
      &&(shapeProfile!=='axial-bars'||g.size<=2&&primarySides.includes(g.side)===primaryExitPlan[colorIndex]));
    // Predominantly narrow exits constrain translation; 2-3 spans retain
    // genuine options for native 2x2/2x3/3x2 bodies and mechanism expansion.
    const choice = choices.map(g => ({ g, score: r() + (g.size === 1 ? .4 : g.size === 2 ? -.4 : -.1) })).sort((a, b) => a.score - b.score)[0]?.g;
    if (!choice) return { ok: false, reason: 'rim-aperture-packing' };
    gates.push({ id: `v3-g-${color}`, color, ...choice });
    for (let i = 0; i < choice.size; i++) occupied.add(`${choice.side}:${choice.offset + i}`);
  }
  const blockCells = level.blocks.map(b => absoluteCells(b)), adjacent = level.blocks.map((_, i) => level.blocks.flatMap((_, j) => i !== j && blockCells[i].some(([x, y]) => blockCells[j].some(([xx, yy]) => Math.abs(x - xx) + Math.abs(y - yy) === 1)) ? [j] : []));
  const emptyBoardReachability=level.blocks.map(b=>emptyBoardExitColours(level,b,gates,meter));
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
      &&(!requiredSides[i]||g.side===requiredSides[i])
      &&(!fixedBodyColours[b.id]||g.color===fixedBodyColours[b.id])
      &&!(forbiddenBodyColours[b.id]??[]).includes(g.color)
      &&(!mappedPrefix.openingColours[b.id]||g.color===mappedPrefix.openingColours[b.id])
      &&!(mappedPrefix.parkingPoses[b.id]??[]).some(([x,y])=>atInitialExit({...b,x,y},g,level))
      &&(mappedPrefix.openingColours[b.id]||fixedBodyColours[b.id]||!atInitialExit(b,g,level))).map(g => g.color);
  });
  if (domains.some(d => !d.length)) return { ok: false, reason: 'shape-exit-domain' };
  const potential = shuffle(level.blocks.flatMap((b, i) => gates.filter(g => domains[i].includes(g.color) && atInitialExit(b, g, level)).map(g => ({ i, color: g.color }))), r);
  if (!potential.length) return { ok: false, reason: 'no-opening-exit' };
  const minimumOpeningArea=shapeProfile==='dense'?4:['bar-mix','axial-bars'].includes(shapeProfile)?3:2;
  const opening = potential.find(p=>mappedPrefix.openingColours[level.blocks[p.i].id]===p.color);
  if(!opening)return {ok:false,reason:`no-${minimumOpeningArea}-cell-clearing-start`};
  const assigned = Array(level.blocks.length).fill(null);
  let nodes = 0, transitions = 0, exhausted = false, completeColourAssignments = 0;
  for(const [i,b]of level.blocks.entries())if(fixedBodyColours[b.id]||mappedPrefix.openingColours[b.id])assigned[i]=fixedBodyColours[b.id]??mappedPrefix.openingColours[b.id];
  if(assigned.every(Boolean))meter.completeWorldReservations++;
  for(const [i,color]of assigned.entries())if(color&&adjacent[i].some(j=>assigned[j]===color))return{ok:false,reason:'forced-opening-colours-adjacent'};
  const dfs = count => {
    if (nodes >= maxNodes) { exhausted = true; return false; } nodes++;meter.nodes=nodes;meter.guard();
    if (count === level.blocks.length) { completeColourAssignments++; return new Set(assigned).size>=Math.min(6,paletteSize); }
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
      if (transitions >= maxTransitions) { exhausted = true; return false; } transitions++;meter.transitions=transitions;
      if(count+1===level.blocks.length)meter.completeWorldReservations++;
      assigned[index] = color;
      if (dfs(count + 1)) return true;
      assigned[index] = null;
      if (exhausted) return false;
    }
    return false;
  };
  const ok = dfs(assigned.filter(Boolean).length);
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
    preservedInitialGateIds:mappedPrefix.preservedGates.map(g=>g.id),mappedParkingDomainConstraints:Object.keys(mappedPrefix.parkingPoses).length,completeColourAssignments,reservedGeneratorBerths:reserved,
    referenceExitSideConstraints:level.blocks.flatMap((b,i)=>requiredSides[i]?[{blockId:b.id,side:requiredSides[i]}]:[]),
    emptyBoardSingleBodyMicroStates:emptyBoardReachability.reduce((n,x)=>n+x.microStates,0),
    initialExitCount: ok ? level.blocks.filter((b, i) => atInitialExit(b, gates.find(g => g.color === assigned[i]), level)).length : null };
}


// Isolated copy: original helper remains unchanged. Every return, including
// rejected full colour assignments, retains its actual finite counters.
export function colourLatePrefix(level,runtime,options={}){
 const {maxNodes=3000,maxTransitions=6000,maxMicroStates=100000,maxMicroTransitions=400000,maxMilliseconds=2000}=options;
 for(const [key,value,max]of [['maxNodes',maxNodes,3000],['maxTransitions',maxTransitions,6000],['maxMicroStates',maxMicroStates,100000],['maxMicroTransitions',maxMicroTransitions,400000],['maxMilliseconds',maxMilliseconds,2000]])
  if(!Number.isSafeInteger(value)||value<1||value>max)throw Error('Invalid finite '+key);
 const start=Date.now(),meter={nodes:0,transitions:0,microStates:0,microTransitions:0,completeWorldReservations:0,
  microTransition(){this.guard();if(this.microTransitions>=maxMicroTransitions)throw Error('colour-static-micro-transitions');this.microTransitions++;},
  guard(){if(Date.now()-start>=maxMilliseconds)throw Error('colour-static-deadline');},
  micro(){this.guard();if(this.microStates>=maxMicroStates)throw Error('colour-static-micro-limit');this.microStates++;}};
 let result;try{result=colourInternal(level,runtime,meter,{...options,maxNodes,maxTransitions});}
 catch(error){result={ok:false,reason:error.message};}
 return{...result,completeColourAssignments:meter.completeWorldReservations,accounting:{version:'late-region-static-colouring-v1',nodes:meter.nodes,transitions:meter.transitions+meter.microTransitions,cspTransitions:meter.transitions,microTransitions:meter.microTransitions,microStates:meter.microStates,
  completeWorldReservations:meter.completeWorldReservations,elapsedMilliseconds:Date.now()-start,searchPerformed:false,
  completeAssignmentsAreChargedEvenOnFailure:true,gameBoardBranchSearches:0},formalReady:false};
}
