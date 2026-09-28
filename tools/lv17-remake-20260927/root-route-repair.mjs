import fs from 'node:fs';
import assert from 'node:assert/strict';
import {compileLevel,forEachGesture,clearCount} from '../remake21to30-mask-floor.mjs';
import {loadPreviewCore,digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion==='1.85.0');
const file='deliverables/lv17-remake-20260927/design-probe-1790495719582.json';
const original=JSON.parse(fs.readFileSync(file));
const {api}=await loadPreviewCore(),rows=[];
for(let skip=0;skip<original.drags.length;skip++){
 if(original.drags[skip].exitSide)continue;
 const level=original.level,c=compileLevel(level);let state=c.initial,route=[],failedAt=null;
 for(let n=0;n<original.drags.length;n++){
  if(n===skip)continue;
  const d=original.drags[n],bi=c.blocks.findIndex(b=>b.id===d.blockId),choices=[];
  forEachGesture(c,state,(i,value,cost,get)=>{
   if(i!==bi||cost!==(d.exitSide?0:1))return;
   const action=get();
   if(d.exitSide){if(action.exitSide===d.exitSide)choices.push({value,action});}
   else if(JSON.stringify(action.path.at(-1))===JSON.stringify(d.path.at(-1)))choices.push({value,action});
  });
  if(!choices.length){failedAt=n+1;break;}
  choices.sort((a,b)=>a.action.path.length-b.action.path.length);
  const chosen=choices[0];state=state.slice();state[bi]=chosen.value;route.push(chosen.action);
 }
 const complete=clearCount(c,state)===c.totalClears;
 const replay=complete?api.replayRevisedRoute(level,route):null;
 if(complete)assert(replay.valid&&replay.complete);
 rows.push({skip:skip+1,failedAt,clearEvents:clearCount(c,state),complete,replay});
 if(complete){const out=`deliverables/lv17-remake-20260927/root-route-repaired-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify({source:file,sourceSha:digest(fs.readFileSync(file)),level,drags:route,replay,skip:skip+1,difficultyLowerBoundNotTested:true},null,2),{flag:'wx'});console.log(JSON.stringify({out,replay}));}
}
const report=`deliverables/lv17-remake-20260927/root-route-repair-${Date.now()}.json`;fs.writeFileSync(report,JSON.stringify({source:file,sourceSha:digest(fs.readFileSync(file)),rows},null,2),{flag:'wx'});console.log(JSON.stringify({report,rows}));
