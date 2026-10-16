import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const OUT='deliverables/league-regeneration-20261004/formal/hard20-retile-finite.json';
const bundle=await build({stdin:{resolveDir:process.cwd(),loader:'ts',contents:`export { searchRevisedLevel,replayRevisedRoute } from './src/core/revisedLevelSearch.ts'; export { checkRevisedRepositionFloor } from './src/core/revisedRepositionFloor.ts'; export { validateLevel } from './src/core/PuzzleModel.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const report=JSON.parse(await readFile('deliverables/league-regeneration-20261004/formal/mid-20-64.json','utf8'));
const base=structuredClone(report.rows.find(r=>r.index===20).level); if(!base) throw new Error('missing level20');
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const colors=[...new Set(base.blocks.map(b=>b.color).filter(Boolean))];
const shapeH=[[1,0],[0,0]], shapeV=[[0,1],[0,0]];
const pairDefs=[
  ['lv20-b1-03','lv20-b1-05'],['lv20-b1-05','lv20-b1-01'],
  ['lv20-b1-06','lv20-b1-04'],['lv20-b1-04','lv20-b1-02']
];
function mutate(seed){
 const level=structuredClone(base); const shift=(seed%Math.max(1,colors.length-1))+1; const map=new Map(colors.map((c,i)=>[c,colors[(i+shift)%colors.length]]));
 for(const b of level.blocks){b.color=map.get(b.color)??b.color;if(b.layers)b.layers=b.layers.map(c=>map.get(c)??c)}
 for(const g of level.gates??[])g.color=map.get(g.color)??g.color;
 const [idA,idB]=pairDefs[seed%pairDefs.length]; const a=level.blocks.find(b=>b.id===idA), b=level.blocks.find(x=>x.id===idB); if(!a||!b) return null;
 const minX=Math.min(a.x,b.x); const topY=Math.min(a.y,b.y); a.x=minX;a.y=topY;a.shape=structuredClone(shapeV); b.x=minX+1;b.y=topY;b.shape=structuredClone(shapeV);
 try{api.validateLevel(level)}catch(e){return {invalid:String(e?.message??e),mutation:{pair:[idA,idB],colorShift:shift}}}
 return {level,mutation:{retilePair:[idA,idB],shapeFrom:'horizontal-2-to-vertical-2',colorShift:shift}};
}
const budgets={route:{maxStates:15000,maxDragStates:6000,maxTransitions:180000,maxMilliseconds:3500},lower:{floor:16,maxStates:28000,maxDragStates:10000,maxTransitions:360000,maxMilliseconds:6000}};
const attempts=[]; const seen=new Set(); let accepted=null;
for(let seed=0;seed<4;seed++){
 const c=mutate(seed); const row={mutationIndex:seed,mutation:c?.mutation??null,status:'BLOCKED'};
 if(!c?.level){row.status='MUTATION_INVALID';row.reason=c?.invalid??'no-candidate';attempts.push(row);continue}
 const fp=digest({playable:c.level.playable,gates:c.level.gates,blocks:c.level.blocks,shutters:c.level.shutters}); row.fingerprint=fp;
 if(seen.has(fp)){row.status='DEDUPLICATED';attempts.push(row);continue} seen.add(fp);
 try{
  const w=api.searchRevisedLevel(c.level,budgets.route); row.upperSearch={status:w.status,termination:w.termination,witnessFound:w.witnessFound,exploredStates:w.exploredStates,discoveredStates:w.discoveredStates,attemptedTransitions:w.attemptedTransitions};
  if(!w.witnessFound||!Array.isArray(w.drags)||!w.replay?.complete){row.failureReasons=['fresh-pointer-route-not-found'];attempts.push(row);continue}
  const replay=api.replayRevisedRoute(c.level,w.drags); row.route=w.drags; row.replay={valid:replay.valid,complete:replay.complete,effectiveDrags:replay.effectiveDrags,nonClearingDrags:replay.nonClearingDrags,clearEvents:replay.clearEvents};
  if(!replay.valid||!replay.complete||replay.nonClearingDrags<16||replay.nonClearingDrags>20){row.failureReasons=['upper-out-of-hard-range'];attempts.push(row);continue}
  const lower=api.checkRevisedRepositionFloor(c.level,budgets.lower); row.lowerBound={status:lower.status,termination:lower.termination,thresholdProven:lower.thresholdProven===true,floor:16,exploredStates:lower.exploredStates,discoveredStates:lower.discoveredStates,attemptedTransitions:lower.attemptedTransitions,relaxedNonClearingDrags:lower.relaxedNonClearingDrags??null};
  if(lower.thresholdProven!==true){row.failureReasons=['fresh-lower-L16-not-proven'];attempts.push(row);continue}
  const exits=w.drags.filter(d=>d.exitSide); const selected=[]; for(const [i,d] of w.drags.entries()){if(!d.exitSide)continue; const exitOrder=exits.findIndex(x=>x===d)+1; const block=c.level.blocks.find(b=>b.id===d.blockId); const shape=block?.shape??[]; const xs=shape.map(([x])=>x),ys=shape.map(([,y])=>y),keys=new Set(shape.map(([x,y])=>`${x},${y}`)); const rect=xs.length>0&&keys.size===shape.length&&(Math.max(...xs)-Math.min(...xs)+1)*(Math.max(...ys)-Math.min(...ys)+1)===shape.length; if(rect&&exitOrder>replay.clearEvents/2&&!selected.includes(d.blockId)) selected.push(d.blockId); if(selected.length>=3)break}
  if(selected.length<1){row.failureReasons=['no-late-rectangular-special'];attempts.push(row);continue}
  row.specials=selected;row.specialEvidence=selected.map(id=>({blockId:id,score:10,completeClearVerified:true,lateClear:true,clearEvents:replay.clearEvents,exitOrder:exits.findIndex(d=>d.blockId===id)+1,specialShape:'filled-axis-aligned-rectangle'}));row.status='PASS_CANDIDATE'; accepted={index:20,level:c.level,specials:selected,specialEvidence:row.specialEvidence,lowerBound:row.lowerBound,upperBound:replay.nonClearingDrags,route:w.drags,replay:row.replay,fingerprint:fp,mutation:c.mutation};attempts.push(row);break;
 }catch(e){row.status='ERROR';row.failureReasons=[String(e?.message??e).slice(0,300)];attempts.push(row)}
}
await mkdir('deliverables/league-regeneration-20261004/formal',{recursive:true}); await writeFile(OUT,JSON.stringify({status:accepted?'PASS_CANDIDATE':'FINITE_BATCH_EXHAUSTED',index:20,levelId:base.id,finitePolicy:{maxVariants:4,shapeAndColorMutationRequired:true,noInfiniteRetry:true,mutation:'two-cell horizontal pair retiled to two-cell vertical pair; cyclic block/gate color mapping'},attempts,accepted},null,2)); console.log(JSON.stringify({output:OUT,attempted:attempts.length,accepted:Boolean(accepted),statuses:attempts.map(a=>({i:a.mutationIndex,s:a.status,u:a.replay?.nonClearingDrags,l:a.lowerBound?.thresholdProven,reason:a.failureReasons}))},null,2));
