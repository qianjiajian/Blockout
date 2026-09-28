import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {compileImmediate,stateFromSnapshot,eachImmediateOptional} from './immediate-generator-floor56-v146.mjs';
const file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),l=d.level;assert.equal(l.id,58);
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:"export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'}),api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64')),c=compileImmediate(l,api);
const apply=(m,drag)=>{m.beginAction();for(const p of drag.path)assert(m.moveBlockStep(drag.blockId,...p));if(drag.exitSide)assert(m.tryExit(drag.blockId,drag.exitSide).ok);assert(m.commitAction());};
let drags=d.drags,replay=api.replayRevisedRoute(l,drags);assert(replay.valid&&replay.complete);const changes=[];
for(let round=0;round<20;round++){
 const model=new api.PuzzleModel(l);model.startCountdown();const snapshots=[model.snapshot()];for(const drag of drags){apply(model,drag);snapshots.push(model.snapshot());}
 let found;
 for(let i=0;i<drags.length&&!found;i++){
  if(snapshots[i+1].cleared>snapshots[i].cleared)continue;
  const id=drags[i].blockId,index=c.blocks.findIndex(b=>b.id===id),state=stateFromSnapshot(c,snapshots[i]);
  const futures=[];for(let j=i+1;j<drags.length;j++)if(drags[j].blockId===id)futures.push({j,target:stateFromSnapshot(c,snapshots[j+1])[index]});
  eachImmediateOptional(c,state,(next,_cost,get)=>{for(const{j,target}of futures){if(next[index]!==target)return;const replacement=get();if(replacement.blockId!==id)return;
    const trial=[...drags.slice(0,i),replacement,...drags.slice(i+1).filter((x,k)=>k+i+1>j||x.blockId!==id)],r=api.replayRevisedRoute(l,trial);
    if(r.valid&&r.complete&&r.nonClearingDrags<replay.nonClearingDrags){found={drags:trial,replay:r,fromStep:i+1,throughStep:j+1,blockId:id,replacement};return false;}
   }});
 }
 if(!found)break;changes.push({fromU:replay.nonClearingDrags,toU:found.replay.nonClearingDrags,fromStep:found.fromStep,throughStep:found.throughStep,blockId:found.blockId,replacement:found.replacement});drags=found.drags;replay=found.replay;
}
const out=`deliverables/remake31-200-v145-20260924/batches/lv051-060/root58/route-shortening-${Date.now()}.json`;
fs.writeFileSync(out,JSON.stringify({source:file,sourceFileSha256:digest(fs.readFileSync(file)),levelSha256:digest(l),oldRouteSha256:digest(d.drags),routeSha256:digest(drags),changes,drags,replay,levelUnchanged:true,pointerValidated:false,lowerBoundProven:false},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,U:replay.nonClearingDrags,drags:drags.length,changes}));
