import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {findActualBodyPlacement,findActualBodyClear,executeActualGesture} from '../agent139-140/repair-ordinary-fifo-prefix139.mjs';
const source='deliverables/remake131-140-v146-20260924/agent139-140/actual-checker-tail139-1790486976428.json';
const d=JSON.parse(fs.readFileSync(source)), {api}=await loadApi(), level=d.level, base=d.completePrefix.drags;
let start=new api.PuzzleModel(level);start.startCountdown();
for(const drag of base.slice(0,20)){start=executeActualGesture(start,drag);assert(start);}
const positions=[],world=m=>JSON.stringify(m.snapshot()),seen=new Set([world(start)]),nodes=[{model:start,path:[]}];
for(let at=0;at<nodes.length;at++){assert(nodes.length<2000);const {model,path}=nodes[at],b=model.getBlock('n139-opening-12');if(path.length)positions.push({x:b.x,y:b.y,path});for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const next=model.clone();next.beginAction();const p=[b.x+dx,b.y+dy];if(!next.moveBlockStep(b.id,...p))continue;const k=world(next);if(seen.has(k))continue;seen.add(k);nodes.push({model:next,path:[...path,p]});}}
const attempts=[];let witness;
for(const dest of positions){let model=executeActualGesture(start,{blockId:'n139-opening-12',path:dest.path});assert(model);const drags=[...base.slice(0,20),{blockId:'n139-opening-12',path:dest.path}];let fail;
for(const old of base.slice(21)){const override=old.blockId==='n139-opening-6'?[6,4]:old.path.at(-1);let found=old.exitSide?findActualBodyClear(model,old.blockId,{maxMilliseconds:150,maxStates:2000}):findActualBodyPlacement(model,old.blockId,override,{maxMilliseconds:150,maxStates:2000});if(!found?.model){fail=old.blockId;break;}model=found.model;drags.push(found.drag);}
const row={dest:[dest.x,dest.y],fail};if(!fail){const blue=findActualBodyClear(model,'n139-opening-9',{maxMilliseconds:200,maxStates:2000});row.blue9=blue?.status;if(blue?.model){drags.push(blue.drag);model=blue.model;row.witness={drags,replay:api.replayRevisedRoute(level,drags),snapshot:model.snapshot()};witness=row;}}
attempts.push(row);if(witness)break;
}
const file='deliverables/remake131-140-v146-20260924/agent131-134/repair-checker-parking139-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify({source,level,positions:positions.map(p=>[p.x,p.y]),attempts,witness,status:witness?'prefix-witness':'no-compatible-parking-in-single-body-component',solvabilityValidated:false},null,2));console.log(JSON.stringify({file,positions:positions.length,witness:!!witness,attempts:attempts.map(({witness,...r})=>r)}));
