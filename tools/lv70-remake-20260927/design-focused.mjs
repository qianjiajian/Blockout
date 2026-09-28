import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditGeneratorQueueColors} from '../revised-generator-queue-colors.mjs';
import {checkAutomaticGeneratorFloor} from './validation-generator-domain.mjs';
import {search} from '../../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import {pack,seededRng} from '../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';

const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.91.0');
const baselineFile='deliverables/lv70-remake-20260927/baseline.json',base=JSON.parse(fs.readFileSync(baselineFile)).level;
const {api}=await loadApi();
const seed=Number(process.argv[2]??191070),seconds=Number(process.argv[3]??60),budget=Number(process.argv[4]??800),rng=seededRng(seed),pick=a=>a[Math.floor(rng.rand()*a.length)];
const originalQueue=base.generators[0].queueBlockIds,queueIds=new Set(originalQueue),opening=base.blocks.filter(b=>!queueIds.has(b.id)),cargo=base.blocks.filter(b=>queueIds.has(b.id)),colors=['blue','green','yellow','pink'];
assert.equal(opening.length,19);assert.equal(cargo.length,17);
const root=`deliverables/lv70-remake-20260927/design-focused-${Date.now()}`;fs.mkdirSync(root,{recursive:true});
const rows=[],issues={},fail=k=>{issues[k]=(issues[k]??0)+1;return null;};
function construct(attempt){
 const level=structuredClone(base);level.mechanismRules='revised-2026-09-27-v1.5';delete level.designTargets;
 const layout=pick([['top',2,'left',2],['top',3,'right',2]]);
 level.generators=[0,1].map(i=>{const side=layout[i*2],offset=layout[i*2+1];return{id:`v191-70-generator-${i+1}`,side,offset,rimSpan:3,rimMount:'rim',spawn:side==='top'?[offset,0]:side==='left'?[0,offset]:[5,offset],queueBlockIds:[]};});
 const blueV=opening.filter(b=>b.color==='blue'&&b.shape[1][1]===1),chosen=[opening.find(b=>b.color==='blue'&&b.shape[1][0]===1),pick(blueV)];
 const fixed=chosen.map((b,i)=>({...b,x:i?level.generators[i].spawn[0]:level.generators[0].offset===2?1:3,y:level.generators[i].spawn[1]})),fixedCells=new Set(fixed.flatMap(b=>b.shape.map(([x,y])=>[b.x+x,b.y+y].join(','))));
 const rest=opening.filter(b=>!chosen.some(c=>c.id===b.id)),tiles=pack(rest.map(b=>({kind:b.shape[1][0]?'H2':'V2',sourceId:b.id,color:b.color})),base.playable.filter(p=>!fixedCells.has(p.join(','))),rng,6000,true);
 if(!tiles)return fail('packing');
 level.blocks=[...fixed,...tiles.map(b=>({id:b.sourceId,x:b.x,y:b.y,shape:b.shape,color:b.color}))];
 const remaining=rng.shuffle([...cargo]);
 // Each machine begins with an original V2 and retains every source cargo.
 for(const g of level.generators){const i=remaining.findIndex(b=>b.shape.length===2);g.queueBlockIds.push(remaining.splice(i,1)[0].id);}
 while(remaining.length){const candidates=level.generators.filter(g=>g.queueBlockIds.length<(g===level.generators[0]?9:8));let used=false;
  for(const g of rng.shuffle(candidates)){const last=cargo.find(b=>b.id===g.queueBlockIds.at(-1)).color,i=remaining.findIndex(b=>b.color!==last);if(i>=0){g.queueBlockIds.push(remaining.splice(i,1)[0].id);used=true;break;}}
  if(!used)return fail('queue-colors');
 }
 for(const g of level.generators)for(const id of g.queueBlockIds){const b=cargo.find(b=>b.id===id);level.blocks.push({...structuredClone(b),x:g.spawn[0],y:g.spawn[1]});}
 const rails=new Set(level.generators.flatMap(g=>[-1,0,1].map(k=>g.side+':'+(g.offset+k)))),slots=[];
 for(const side of ['top','right','bottom','left'])for(const size of [2,3])for(let offset=0;offset+size<=(['top','bottom'].includes(side)?6:7);offset++){
  const mouth=Array.from({length:size},(_,i)=>side==='top'?[offset+i,0]:side==='bottom'?[offset+i,6]:side==='left'?[0,offset+i]:[5,offset+i]);
  if(mouth.every(p=>base.playable.some(q=>q[0]===p[0]&&q[1]===p[1])))slots.push({side,offset,size});
 }
 level.gates=[];
 for(const color of ['blue',...rng.shuffle(['green','yellow','pink'])]){
  const options=slots.filter(s=>!Array.from({length:s.size},(_,i)=>s.side+':'+(s.offset+i)).some(k=>rails.has(k)));
  const valid=color==='blue'?options.filter(s=>level.blocks.slice(0,19).some(b=>b.color==='blue'&&(s.side==='top'?b.y===0:s.side==='bottom'?b.y+1+Math.max(...b.shape.map(p=>p[1]))===7:s.side==='left'?b.x===0:b.x+1+Math.max(...b.shape.map(p=>p[0]))===6)&&(['top','bottom'].includes(s.side)?b.x:b.y)>=s.offset&&(['top','bottom'].includes(s.side)?b.x+1+Math.max(...b.shape.map(p=>p[0])):b.y+1+Math.max(...b.shape.map(p=>p[1])))<=s.offset+s.size)):options;
  if(!valid.length)return fail('gates');const g=pick(valid);for(let i=0;i<g.size;i++)rails.add(g.side+':'+(g.offset+i));level.gates.push({id:'v191-70-gate-'+color,...g,color,...(color==='blue'?{}:{frozen:1})});
 }
 try{api.validateLevel(level);assert(api.auditCandidateBlockArt(level).passed);assert(auditGeneratorQueueColors(level).passed);const h=api.auditRevisedCandidate(level,undefined).issues.filter(i=>i.category!=='source'&&i.code!=='wrong-rule-profile');if(h.length)return fail(h[0].code);}catch(e){return fail(e.message);}
 return level;
}
export function statistics(level,drags,api){
 const queue=new Set(level.generators.flatMap(g=>g.queueBlockIds)),model=new api.PuzzleModel(level),machines=level.generators.map(g=>({id:g.id,queueLength:g.queueBlockIds.length,firstSpawn:null,multiCellRepositions:[],singleCellRepositions:[],spawned:[]})),byId=new Map(level.generators.flatMap((g,i)=>g.queueBlockIds.map(id=>[id,i])));model.startCountdown();let multi=0,single=0;
 for(const[at,d]of drags.entries()){
  const before=model.snapshot(),b=before.blocks.find(b=>b.id===d.blockId);model.beginAction();
  const capture=()=>{const s=model.snapshot();for(const newborn of s.blocks.filter(x=>queue.has(x.id)&&!machines[byId.get(x.id)].spawned.includes(x.id))){const m=machines[byId.get(newborn.id)];m.spawned.push(newborn.id);m.firstSpawn??={step:at+1,cleared:s.cleared,openingRemaining:s.blocks.filter(x=>!queue.has(x.id)).length,boardBodies:s.blocks.length};}};
  for(const p of d.path){assert(model.moveBlockStep(d.blockId,...p));capture();}if(d.exitSide){assert(model.tryExit(d.blockId,d.exitSide).ok);capture();}assert(model.commitAction());
  const after=model.snapshot();if(after.cleared===before.cleared){if(b.shape.length>1)multi++;else single++;if(queue.has(d.blockId)){const m=machines[byId.get(d.blockId)],row={step:at+1,id:d.blockId,cleared:before.cleared,openingRemaining:before.blocks.filter(x=>!queue.has(x.id)).length,otherMachineActive:machines.filter(x=>x!==m).some(x=>x.spawned.some(id=>before.blocks.some(b=>b.id===id)))};m[b.shape.length>1?'multiCellRepositions':'singleCellRepositions'].push(row);}}
 }
 assert(model.snapshot().complete);return{machines,multiCellRepositions:multi,singleCellRepositions:single,generatedMultiCellRepositions:machines.reduce((n,m)=>n+m.multiCellRepositions.length,0),bothMachinesEmitBeforeOpeningEmpty:machines.every(m=>m.firstSpawn.openingRemaining>0),bothMachinesHaveGeneratedMultiCellReposition:machines.every(m=>m.multiCellRepositions.length>0)};
}
let attempts=0,valid=0,solved=0,best=null;const deadline=Date.now()+seconds*1000;
while(Date.now()<deadline){const level=construct(attempts++);if(!level)continue;valid++;const sourceLevelSha256=digest(level);
 // U-only acceleration under the explicitly no-flip domain; all accepted
 // paths are replayed in the actual v1.5 model. This mapping is NOT a floor.
 const result=search({...level,mechanismRules:'revised-2026-09-23-v1.4'},{floor:16,maxStates:90000,maxMilliseconds:budget,weight:1000,orderSeed:attempts%36});
 const file=`${root}/attempt-${attempts}.json`,data={ruleVersion:lock.activeVersion,seed,attempt:attempts,level,levelSha256:sourceLevelSha256,result,exactInventoryDifferences:{openingShapeColor:[],queueShapeColor:[],generatorCount:{before:1,after:2},queueOrder:'new fixed two-machine authored orders'},lowerBound:null};
 if(result.status==='witness'){data.drags=result.drags;data.replay=api.replayRevisedRoute(level,data.drags);assert(data.replay.valid&&data.replay.complete);data.statistics=statistics(level,data.drags,api);if(result.cost>=11&&data.statistics.generatedMultiCellRepositions>=2)data.floor=checkAutomaticGeneratorFloor(level,api,{floor:11,maxStates:120000,maxMilliseconds:1200});level.preservedMoveTarget=data.drags.length;data.levelSha256=digest(level);solved++;const score=data.statistics.generatedMultiCellRepositions*10+(data.statistics.bothMachinesHaveGeneratedMultiCellReposition?100:0)+(data.statistics.machines.every(m=>m.firstSpawn.openingRemaining>=6)?20:0)-(result.cost<11?100:result.cost);if(data.floor?.status!=='relaxed-shortcut'&&(!best||score>best.score))best={file,score,cost:result.cost,statistics:data.statistics,floor:data.floor?.status};}
 fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});rows.push({attempt:attempts,file,status:result.status,cost:result.cost,statistics:data.statistics,states:result.states});
 if(valid%10===0)console.log(JSON.stringify({attempts,valid,solved,best}));
}
const report={ruleVersion:lock.activeVersion,seed,seconds,budget,attempts,valid,solved,best,issues,rows,baselineFile,status:'BOUNDED_BATCH_COMPLETE_NOT_CERTIFIED'};fs.writeFileSync(root+'/report.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({root,...report,rows:undefined}));
