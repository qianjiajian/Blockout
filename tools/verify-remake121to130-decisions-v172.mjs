import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,projection,ruleGate,OUTPUT} from './remake121to130-v172.mjs';
import {replayBomb} from './remake121to130-bomb-replay-v172.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const args=process.argv.slice(2);assert(args.length>0&&args.length%2===0);
ruleGate();const {api}=await loadApi();
const apply=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
const state=m=>{const {moves,...s}=m.snapshot();return s;};
const cells=(b,x=b.x,y=b.y)=>new Set(b.shape.map(([dx,dy])=>`${x+dx},${y+dy}`));
const positive=(level,drags)=>{
 if(level.blocks.some(b=>b.timedBombSeconds))return replayBomb(level,drags,api,true);
 const m=new api.PuzzleModel(structuredClone(level));m.startCountdown();let seconds=0;
 const tick=dt=>{seconds+=dt;m.tick(dt);assert(!m.snapshot().failed);};
 for(const d of drags){tick(.75);m.beginAction();tick(.08);for(const p of d.path){tick(.12);assert(m.moveBlockStep(d.blockId,...p));}if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());tick(.08);}
 assert(m.snapshot().complete);return{valid:true,complete:true,simulatedSeconds:seconds,naturalClockValidated:false};
};
const rows=[];
for(let i=0;i<args.length;i+=2){
 const [candidateFile,decisionFile]=args.slice(i,i+2),d=JSON.parse(fs.readFileSync(candidateFile)),review=JSON.parse(fs.readFileSync(decisionFile)),level=projection(d.level);
 assert.equal(review.levelSha256,digest(d.level));assert.equal(review.routeSha256,digest(d.drags));
 const cases=review.cases??review.decisionCases;assert(cases?.length>=2);
 const verified=cases.map(c=>{
  const index=(c.beforeDrag??c.atStep)-1,wrong=c.legalWrongParking,next=c.blockedNextAction,back=c.recoveryDrag;
  assert(Number.isInteger(index)&&index>=0);assert.notEqual(wrong.blockId,next.blockId,'A repeated no-op on the same block is not obstruction evidence');assert(next.path.length>0);
  const replacesCorrect=c.beforeDrag===undefined&&c.correctDrag!==undefined;
  if(replacesCorrect){assert.deepEqual(c.correctDrag,d.drags[index]);assert.deepEqual(next,d.drags[index+1]);}
  else assert.deepEqual(next,d.drags[index],'Counterfactual must block the actual next witness action');
  const prefix=d.drags.slice(0,index),m=new api.PuzzleModel(structuredClone(level));m.startCountdown();for(const drag of prefix)apply(m,drag);
  const initial=state(m),b=m.snapshot().blocks.find(b=>b.id===wrong.blockId);assert(b&&b.shape.length>=2);
  const canonicalWrong=api.replayRevisedRoute(level,[...prefix,wrong]);assert(canonicalWrong.valid,JSON.stringify(canonicalWrong));
  const canonicalCorrect=api.replayRevisedRoute(level,[...prefix,...(replacesCorrect?[c.correctDrag]:[]),next]);assert(canonicalCorrect.valid,JSON.stringify(canonicalCorrect));
  apply(m,wrong);assert.equal(m.snapshot().cleared,initial.cleared);
  const parked=m.snapshot().blocks.find(b=>b.id===wrong.blockId);assert(parked);assert(parked.x!==b.x||parked.y!==b.y,'Wrong parking must actually move');
  const afterWrong=state(m),wrongCells=cells(parked);m.beginAction();let collision=null;
  for(const p of next.path){const mover=m.snapshot().blocks.find(b=>b.id===next.blockId);assert(mover);assert.equal(mover.frozen??0,0,'Frozen blocks do not prove parking obstruction');assert(!mover.lockedBy,'Locked blocks do not prove parking obstruction');assert(!mover.shutterId||m.snapshot().shutters.find(s=>s.id===mover.shutterId)?.revealed,'Covered blocks do not prove parking obstruction');assert.equal(Math.abs(mover.x-p[0])+Math.abs(mover.y-p[1]),1,'Blocked attempt must be a nonempty adjacent move');
   if(!m.moveBlockStep(next.blockId,...p)){const overlap=[...cells(mover,...p)].filter(x=>wrongCells.has(x));assert(overlap.length>0,'Rejection must be caused by the parked block footprint');collision={mover:next.blockId,target:p,overlap};break;}}
  assert(collision,'Wrong parking must actually obstruct the next block');
  const recover=new api.PuzzleModel(structuredClone(level));recover.startCountdown();for(const drag of [...prefix,wrong])apply(recover,drag);assert.deepEqual(state(recover),afterWrong);apply(recover,back);assert.deepEqual(state(recover),initial,'Recovery must restore the exact spatial state');
  const route=[...prefix,wrong,back,...d.drags.slice(index)],replay=api.replayRevisedRoute(level,route);assert(replay.valid&&replay.complete,JSON.stringify(replay));
  const timed=positive(d.level,route);assert(timed.valid&&timed.complete,JSON.stringify(timed));
  return{beforeDrag:index+1,wrongBlock:wrong.blockId,area:b.shape.length,from:[b.x,b.y],wrongAt:[parked.x,parked.y],collision,recoveredRouteSha256:digest(route),complete:true,positiveTime:timed};
 });
 rows.push({id:d.level.id,candidateFile,decisionFile,levelSha256:digest(d.level),routeSha256:digest(d.drags),decisionFileSha256:digest(fs.readFileSync(decisionFile)),cases:verified});
}
const result={ruleVersion:ruleGate().activeVersion,passed:true,verifierSha256:digest(fs.readFileSync(new URL(import.meta.url))),method:'Independent different-block adjacent-move footprint collision and exact recovery; complete canonical and positive-time original-inventory replay',rows,humanBlindTested:false};
const output=OUTPUT+'/decision-verification-'+Date.now()+'.json';fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,passed:true,ids:rows.map(r=>r.id)}));
