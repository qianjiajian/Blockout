import assert from 'node:assert/strict';
import {inventorySummary,random,boardCells,RECTANGLE_SHAPES,IRREGULAR_SHAPES,rectangular,longBar,bodyFootprint,digest} from '../formal-v3/diversity-layout-factory.mjs';
import {assertInterfaceLayout,placementInterfacePreference} from './wholeboard-interface-preference-v1.mjs';
export const SELF='tools/daily-challenge/formal-v4/wholeboard-interface-retile-v1.mjs';
export const VERSION='wholeboard-interface-retile-ordering-v1';
const key=p=>p.join(',');
/** Narrow fork: only candidate ordering scores and metered observations differ.
 * All original shape/coverage/count filters remain. It returns an uncoloured
 * partition, never a playable full world. Not a solvability proof. */
export function retileInterfaceWholeBoard(source, runtime, { seed = 1, maxNodes = 10000, maxTransitions = 10000, bodyCount = source.blocks.length, irregular = false, minimumIrregular = irregular ? 2 : 0,shapeProfile='balanced',fixedBlocks=[],forbiddenFootprints=[],interfaceLayout,preferenceMeter,qualificationOnly=false,preferenceEnabled=true } = {}) {
  assertInterfaceLayout(source,interfaceLayout);assert(preferenceMeter&&typeof preferenceMeter.charge==='function');
  if(qualificationOnly)assert(source.id>=990000&&boardCells(source).length<=16&&bodyCount<=8);else assert(preferenceEnabled);
  let nodes=0,transitions=0;const before=preferenceMeter.report().checks;
  try{
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
    const p = { x, y, shape, ids, score: r() };p.interfacePreference=preferenceEnabled?placementInterfacePreference(p,interfaceLayout,k=>preferenceMeter.charge(k)):{bonus:0};
    for (const id of ids) byCell[id].push(p);
  }
  let exhausted = false;
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
    choices = choices.map(p => ({ p, score: Math.abs(p.ids.length - average) * .16 + r() - p.interfacePreference.bonus
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
    fixedArea,fixedBodies:fixedBlocks.length,forbiddenFootprintCount:forbidden.size,inventory: info,preferenceEnabled,interfaceLayout,preferenceChecks:preferenceMeter.report().checks-before,selectionPreferenceOnly:true,placementDomainChanged:false };
  }catch(error){return{ok:false,reason:error.message,nodes,transitions,preferenceEnabled,interfaceLayout,preferenceChecks:preferenceMeter.report().checks-before,selectionPreferenceOnly:true,placementDomainChanged:false};}
}
