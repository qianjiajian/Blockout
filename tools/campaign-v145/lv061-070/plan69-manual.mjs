import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {stateOf} from './lift-floor.mjs';
import {compile,each,clearCount} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
import {searchStage} from './stage-search69.mjs';
const file=process.argv[2],data=JSON.parse(fs.readFileSync(file)),{api}=await loadApi(),level=data.level;Object.assign(level.gates.find(g=>g.color==='purple'),{side:'right',offset:0,size:3});api.validateLevel(level);
let drags=[...data.drags],before=api.replayRevisedRoute(level,drags);assert(before.valid);const c=compile(level);let state=stateOf(c,JSON.parse(before.finalStateKey));
function action(sourceId,anchor){const id=`v147-69-${sourceId}`,i=level.blocks.findIndex(b=>b.id===id);let selected;
 each(c,state,(s,cost,get)=>{if(cost!==(anchor?1:0))return;const d=get();if(d.blockId!==id)return;if(anchor&&(s[i]&127)!==anchor[1]*level.width+anchor[0])return;selected={s,d};return false;});
 if(!selected)throw Error(`No legal ${anchor?'move to '+anchor:'exit'} for ${sourceId}; clearCount=${clearCount(c,state)}`);state=selected.s;drags.push(selected.d);const r=api.replayRevisedRoute(level,drags);assert(r.valid,r.error);console.log(JSON.stringify({sourceId,anchor,cleared:clearCount(c,state),U:r.nonClearingDrags}));}
for(const [id,target]of [['opening-2',[1,4]],['cover6-2',[3,7]],['cover11-3'],['cover11-5'],['opening-3'],['cover9-1'],['cover6-4',[4,4]],['cover9-3'],['opening-8'],['cover9-2']])action(id,target);
const replay=api.replayRevisedRoute(level,drags),out=`deliverables/remake31-200-v145-20260924/batches/lv061-070/author68-69/manual69-stage-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify({...data,drags,goal:clearCount(c,state),cost:replay.nonClearingDrags,replay,levelSha256:digest(level)},null,2));console.log(out);
const result=searchStage(level,{startState:state,floor:11-replay.nonClearingDrags,maxStates:500000,maxMilliseconds:30000});console.log(JSON.stringify({...result,state:undefined,drags:undefined,best:result.best?{clears:result.best.clears,cost:result.best.cost}:undefined}));
if(result.status==='witness'){drags.push(...result.drags);const checked=api.replayRevisedRoute(level,drags);assert(checked.valid&&checked.complete);const output=out.replace('-stage-','-complete-');fs.writeFileSync(output,JSON.stringify({...data,drags,goal:Infinity,cost:checked.nonClearingDrags,replay:checked,levelSha256:digest(level)},null,2));console.log(JSON.stringify({output,U:checked.nonClearingDrags}));}
