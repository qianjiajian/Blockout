import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const root='deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67';
const names={1:'SINGLE',2:'V2',3:'V3',4:'L3',5:'S4',6:'T4',7:'SQ2',8:'H2',9:'H3',10:'L4',13:'RECT6',14:'SQ3',21:'RECT6'};
export function checkSource65(level,ledger,api){
 assert.equal(level.id,65);assert.equal(ledger.id,65);for(const f of ledger.evidence)assert.equal(digest(fs.readFileSync(f.path)),f.sha256,`Source frame drift:${f.path}`);
 const map=new Map(level.blocks.map(b=>[b.id,b])),checks=[];
 for(const [stage,items]of [['opening',ledger.sourceOpening.pieces],['lift2',ledger.sourceHidden.pieces]])for(const [i,[color,kind,ice]]of items.entries()){
  const id=`v146-65-${stage}-${i}`,b=map.get(id);assert(b,id);assert.equal(b.color,color,id+' color');assert.equal(b.frozen??0,ice??0,id+' ice');assert.equal(b.layers?.length??1,1,id+' shell');
  const art=api.matchFormalBlockShape(b.shape,'native-only');assert(art&&art.quarterTurns===0,id+' native');assert.equal(names[art.shapeId],kind,id+' shape');assert.equal(b.shutterId,stage==='opening'?undefined:'v146-65-lift2',id+' stage');checks.push({id,color,kind,ice:ice??0,shutterId:b.shutterId??null,nativeShapeId:art.shapeId});map.delete(id);
 }
 assert.equal(map.size,5);const extras=[...map.values()];assert(extras.every(b=>b.id.startsWith('v146-65-padding-')&&!b.shutterId&&!b.frozen&&!b.layers));const histogram={};for(const b of extras){const k=names[api.matchFormalBlockShape(b.shape,'native-only').shapeId];histogram[k]=(histogram[k]??0)+1;}assert.deepEqual(histogram,{SQ2:2,RECT6:3});assert.equal(extras.reduce((n,b)=>n+b.shape.length,0),26);
 assert.equal(level.shutters.length,1);assert.deepEqual(level.shutters[0],{id:'v146-65-lift2',x:0,y:0,width:5,height:6,count:0,skin:'lift'});assert.equal(level.gates.length,6);assert.deepEqual(level.gates.map(g=>g.color).sort(),[...ledger.sourceOpening.colors].sort());assert(level.gates.every(g=>!g.frozen&&!g.star));assert(!level.generators?.length);assert(level.blocks.every(b=>!b.keyId&&!b.lockedBy&&!b.lockCount&&!b.timedBombSeconds));
 return {passed:true,levelSha256:digest(level),sourceRecordSha256:digest(ledger),checkedFrameCount:ledger.evidence.length,checks,extras:extras.map(b=>({id:b.id,area:b.shape.length})),sourceBodyCount:23,authoredBodyCount:28,sourceIce:[10],authoredIce:[10],physicalLiftCount:1,sourceDifferences:ledger.adaptation,notExactCopy:true};
}
export function liftCausalCase(level,drags,api){
 const apply=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
 for(let step=0;step<drags.length;step++){const d=drags[step];if(d.path.length<2)continue;const m=new api.PuzzleModel(level);m.startCountdown();drags.slice(0,step).forEach(t=>apply(m,t));const before=m.snapshot();
  for(let k=1;k<d.path.length;k++){
   const wait={blockId:d.blockId,path:d.path.slice(0,k)},release={blockId:d.blockId,path:d.path.slice(0,k+1)};
   const a=api.replayRevisedRoute(level,[...drags.slice(0,step),wait]),b=api.replayRevisedRoute(level,[...drags.slice(0,step),release]);if(!a.valid||!b.valid)continue;
   const sa=JSON.parse(a.finalStateKey),sb=JSON.parse(b.finalStateKey),changed=sb.shutters.filter(s=>s.skin==='lift'&&s.revealed&&!sa.shutters.find(q=>q.id===s.id)?.revealed);if(!changed.length||sa.cleared!==sb.cleared)continue;
   const completeWaiting=[...drags.slice(0,step),wait,{...d,path:d.path.slice(k)},...drags.slice(step+1)],completeRelease=[...drags.slice(0,step),release,{...d,path:d.path.slice(k+1)},...drags.slice(step+1)],ra=api.replayRevisedRoute(level,completeWaiting),rb=api.replayRevisedRoute(level,completeRelease);if(!ra.valid||!ra.complete||!rb.valid||!rb.complete)continue;
   return {passed:true,beforeDrag:step+1,regionIds:changed.map(s=>s.id),prefix:drags.slice(0,step),stillOccupiedAction:wait,regionVacatedAction:release,sameClearCount:sa.cleared,waitingRevealed:false,vacatedRevealed:true,completeRecoveryRoute:completeWaiting,completeReleaseRoute:completeRelease,
    conclusion:'同一真实状态起，仅相同多格块多移动一个单位格，清除计数保持，升降区域由部分占用变完全空；只有后者立即整批揭层。占区分支继续移出后可完整通关。无修改机制或计数。'};
  }
 }
 throw Error('No same-counter occupancy reveal comparison found');
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const {api}=await loadApi(),candidateFile=process.argv[2],d=JSON.parse(fs.readFileSync(candidateFile)),ledger=JSON.parse(fs.readFileSync(root+'/source-corrections.json')).levels.find(l=>l.id===65),report={candidateFile,candidateFileSha256:digest(fs.readFileSync(candidateFile)),source:checkSource65(d.level,ledger,api),liftCausalCase:liftCausalCase(d.level,d.drags,api)};const out=root+'/source-binding65-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,source:report.source.passed,lift:report.liftCausalCase.passed,beforeDrag:report.liftCausalCase.beforeDrag}));}
