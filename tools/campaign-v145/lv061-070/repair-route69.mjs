import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,OUTPUT,writeNew} from './remake61to70-v146.mjs';
import {compile,each} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
import {stateOf} from './lift-floor.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const file=process.argv[2],data=JSON.parse(fs.readFileSync(file)),{level}=data,{api}=await loadApi(),c=compile(level);assert.equal(level.id,69);
const apply=(m,d)=>{const before=m.snapshot();m.beginAction();for(const p of d.path)if(!m.moveBlockStep(d.blockId,...p))return false;if(d.exitSide&&!m.tryExit(d.blockId,d.exitSide).ok)return false;if(!m.commitAction())return false;return m.snapshot().cleared===before.cleared?1:0;};
let drags=data.drags,attempts=0,improvements=[];const deadline=Date.now()+120000;
for(;;){const refs=[],m=new api.PuzzleModel(level);m.startCountdown();for(const d of drags){const b=m.snapshot().blocks.find(b=>b.id===d.blockId);const endpoint=d.path.at(-1)??[b.x,b.y],cost=apply(m,d);assert(cost!==false);refs.push({d,endpoint,cost});}let improvement=false;
 for(let remove=0;remove<refs.length&&Date.now()<deadline;remove++){
  if(refs[remove].cost!==1)continue;attempts++;const m=new api.PuzzleModel(level);m.startCountdown();const candidate=[];let valid=true;
  for(let i=0;i<refs.length;i++){
   if(i===remove)continue;const{d,endpoint}=refs[i],body=m.snapshot().blocks.find(b=>b.id===d.blockId);if(!body){valid=false;break;}
   if(!d.exitSide&&body.x===endpoint[0]&&body.y===endpoint[1])continue;
   let chosen;each(c,stateOf(c,m.snapshot()),(next,cost,get)=>{const q=get();if(q.blockId!==d.blockId||q.exitSide!==d.exitSide)return;const pos=next[c.blocks.findIndex(b=>b.id===q.blockId)]&127;
    if(!q.exitSide&&(pos%c.W!==endpoint[0]||Math.floor(pos/c.W)!==endpoint[1]))return;
    chosen=q;return false;
   },{orderSeed:c.blocks.findIndex(b=>b.id===d.blockId)});
   if(!chosen||apply(m,chosen)===false){valid=false;break;}candidate.push(chosen);
  }
  if(!valid||!m.snapshot().complete)continue;const replay=api.replayRevisedRoute(level,candidate);if(!replay.valid||!replay.complete||replay.nonClearingDrags>=drags.filter(d=>!d.exitSide).length)continue;
  const out=`${OUTPUT}/root69/repaired69-${Date.now()}.json`;writeNew(out,{...data,drags:candidate,replay,routeSha256:digest(candidate),rootRepair:{base:file,removedGesture:remove+1,attempts},lowerBoundStatus:'NOT_RUN',pointerStatus:'NOT_RUN'});improvements.push({out,U:replay.nonClearingDrags});drags=candidate;improvement=true;console.log(JSON.stringify(improvements.at(-1)));break;
 }
 if(!improvement||Date.now()>=deadline||drags.filter(d=>!d.exitSide).length<=10)break;
}
writeNew(`${OUTPUT}/root69/repair-attempt-${Date.now()}.json`,{base:file,attempts,improvements,ended:Date.now()>=deadline?'deadline':'local-deletion-fixed-point'});console.log(JSON.stringify({attempts,improvements:improvements.length}));
