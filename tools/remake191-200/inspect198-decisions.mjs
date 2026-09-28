import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,replay} from './replay.mjs';
import {ROOT,digest,writeNew,ruleGate} from './common.mjs';
ruleGate();
const file=ROOT+'/author197-199/evolved198-1790523798965-63360.json',d=JSON.parse(fs.readFileSync(file)),{api}=await loadApi();
replay(d.level,d.drags,api,{complete:true,requirePointerCompatible:true});
const m=new api.PuzzleModel(d.level);m.startCountdown();const records=[];
const cells=b=>b.shape.map(([x,y])=>[b.x+x,b.y+y].join(','));
for(const [index,drag]of d.drags.entries()){
 const before=m.snapshot(),b=before.blocks.find(b=>b.id===drag.blockId),beforeCells=cells(b),swept=new Set();m.beginAction();
 for(const xy of drag.path){assert(m.moveBlockStep(drag.blockId,...xy));for(const c of cells(m.getBlock(drag.blockId)))swept.add(c);}
 if(drag.exitSide)assert(m.tryExit(drag.blockId,drag.exitSide).ok);assert(m.commitAction());
 const after=m.snapshot(),remaining=after.blocks.find(q=>q.id===b.id),afterCells=new Set(remaining?cells(remaining):[]);
 records.push({step:index+1,id:b.id,area:b.shape.length,color:b.color,keyId:b.keyId,lockedBy:b.lockedBy,layers:b.layers,clearedBefore:before.cleared,clearedAfter:after.cleared,from:[b.x,b.y],to:remaining?[remaining.x,remaining.y]:null,nonClearing:after.cleared===before.cleared,vacated:beforeCells.filter(x=>!afterCells.has(x)),swept:[...swept],remainingBody:!!remaining});
}
for(const r of records.filter(r=>r.nonClearing)){
 const end=records.find(q=>q.step>r.step&&q.id===r.id)?.step??Infinity;
 r.laterUsesBeforeBodyMovesAgain=records.filter(q=>q.step>r.step&&q.step<end&&q.swept.some(p=>r.vacated.includes(p))).map(q=>({step:q.step,id:q.id,area:q.area,clears:q.clearedAfter-q.clearedBefore,sharedCells:q.swept.filter(p=>r.vacated.includes(p))}));
}
const non=records.filter(r=>r.nonClearing),byBody=Object.values(Object.fromEntries([...new Set(non.map(r=>r.id))].map(id=>[id,{id,area:non.find(r=>r.id===id).area,steps:non.filter(r=>r.id===id).map(r=>r.step),clearCounts:non.filter(r=>r.id===id).map(r=>r.clearedBefore)}])));
const out=ROOT+'/decision-trace198-'+Date.now()+'.json';
writeNew(out,{status:'DESCRIPTIVE_TRACE_NOT_HUMAN_DIFFICULTY_CERTIFICATE',file,levelSha256:digest(d.level),routeSha256:digest(d.drags),total:d.drags.length,nonClearing:non.length,multi:non.filter(r=>r.area>1).length,single:non.filter(r=>r.area===1).length,byBody,records,note:'Swept-cell use records actual following route dependence, not necessity in every solution. A moved body can also unblock an exit sweep not represented in these on-board cells. No new quota on single-cell drags is inferred.'});
console.log(JSON.stringify({out,byBody,singleUses:non.filter(r=>r.area===1).map(r=>({step:r.step,id:r.id,clears:r.clearedBefore,uses:r.laterUsesBeforeBodyMovesAgain}))}));
