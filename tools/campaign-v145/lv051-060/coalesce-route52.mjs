import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),{api}=await loadApi();assert.equal(d.level.id,52);assert(d.level.blocks.every(b=>!b.layers||b.layers.length===1));
let route=d.drags,changes=[],checks=0;
for(;;){let changed=false;
 for(let i=0;i<route.length;i++){if(route[i].exitSide)continue;const j=route.findIndex((g,k)=>k>i&&g.blockId===route[i].blockId);if(j<0)continue;
  const next=structuredClone(route);next[j].path=[...next[i].path,...next[j].path];next.splice(i,1);checks++;const replay=api.replayRevisedRoute(d.level,next);
  if(replay.valid&&replay.complete){changes.push({deletedStep:i+1,mergedIntoStep:j+1,blockId:route[i].blockId,cost:replay.nonClearingDrags});route=next;changed=true;break;}
 }if(!changed)break;
}
const replay=api.replayRevisedRoute(d.level,route),report={...d,drags:route,replay,routeCoalescing:{input:file,inputSha256:digest(fs.readFileSync(file)),levelSha256:digest(d.level),method:'Only postpone an existing nonclearing path and concatenate it to that body\'s next existing gesture. Accept only full actual-model replay; no new state-space search.',checks,changes},measurement:undefined};
const out='deliverables/remake31-200-v145-20260924/batches/lv051-060/agent51-54/coalesced52-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,checks,changes,cost:replay.nonClearingDrags,drags:route.length}));
