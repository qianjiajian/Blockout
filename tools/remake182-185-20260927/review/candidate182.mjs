import fs from 'node:fs';import assert from 'node:assert/strict';
import {loadApi,replay} from '../replay.mjs';import {digest,ruleGate,writeNew,auditSpatial} from '../common.mjs';
import {compile,each,clearCount,stateOf} from '../../campaign-v145/lv131-140/agent139-140/axis128-masked-prefix-floor.mjs';
import {search} from '../../campaign-v145/lv131-140/agent139-140/axis128-graph.mjs';
const file=process.argv[2]??'deliverables/remake182-185-20260927/author182/reviewed182-1790523598812.json';
const d=JSON.parse(fs.readFileSync(file)),{api,inputs}=await loadApi(),lock=ruleGate(),level=d.level;
const QUALIFICATION='deliverables/remake182-185-20260927/review/prefix-qualification-1790523461963.json';
const SLOW='deliverables/remake182-185-20260927/review/model-floor182-1790523641710.json';
const paths=[...inputs,file,QUALIFICATION,SLOW,d.source.source.path,d.source.gates.path,'tools/remake182-185-20260927/review/candidate182.mjs','tools/campaign-v145/lv131-140/agent139-140/axis128-graph.mjs','tools/campaign-v145/lv131-140/agent139-140/axis128-masked-prefix-floor.mjs'];
const bindings=Object.fromEntries(paths.map(p=>[p,digest(fs.readFileSync(p))]));
const qualification=JSON.parse(fs.readFileSync(QUALIFICATION));assert.equal(qualification.status,'PASS_DOMAIN_QUALIFICATION_ONLY');
const qualifiedSourceContinuity=[];
for(const[p,sha]of Object.entries(qualification.bindings)){
 const now=fs.readFileSync(p),current=digest(now);if(current===sha)continue;
 let restored=now.toString('utf8');
 if(p==='src/game/formalBlockShapes.ts')restored=restored.replace("import { REMADE_191_200_IDS } from '../core/remake191to200';\n",'').replace(' || REMADE_191_200_IDS.includes(levelId)','');
 else if(p==='src/core/levels.ts')restored=restored.replace("import { applyRemake191to200 } from './remake191to200';\n",'').replace('export const LEVELS_BEFORE_191_200_REMAKE: LevelSpec[] = LEVELS_BEFORE_161_170_REMAKE.map(applyRemake161to170);\nexport const LEVELS: LevelSpec[] = LEVELS_BEFORE_191_200_REMAKE.map(applyRemake191to200);','export const LEVELS: LevelSpec[] = LEVELS_BEFORE_161_170_REMAKE.map(applyRemake161to170);');
 else assert.fail('Unreviewed qualification source drift '+p);
 assert.equal(digest(Buffer.from(restored)),sha,'Exact inverse must restore qualified bytes '+p);
 qualifiedSourceContinuity.push({path:p,qualifiedSha256:sha,currentSha256:current,exactInverseRestoresQualifiedBytes:true,reason:'Only parallel191-200 data lookup/ID admission added; isolated fixture mechanics and explicit native-only matching are byte-identical.'});
}
assert.equal(level.id,182);assert.equal(digest(level),d.levelSha256);auditSpatial(level,api);
const source=JSON.parse(fs.readFileSync(d.source.source.path));
for(const b of d.source.bindings)assert.equal(digest(fs.readFileSync(b.path)),b.sha256);
assert.equal(d.source.bodyMapping.length,27);assert.equal(new Set(d.source.bodyMapping.map(r=>r.design.id)).size,27);
const special=source.sourceCohorts.cover4.find(b=>b.id==='ice22PLUS5shell');assert(special);
for(const row of d.source.bodyMapping){
 const s=source.sourceCohorts[row.phase].find(b=>b.id===row.sourceId),body=level.blocks.find(b=>b.id===row.design.id);assert(s&&body);assert.deepEqual(row.design,body);assert.deepEqual(row.source.shape,s.shape);
 if(row.sourceId==='ice22PLUS5shell'){assert.equal(body.frozen,22);assert.deepEqual(body.layers,['pink','yellow']);assert.equal(level.shutters.find(s=>s.id===body.shutterId).count,4);}
 else{assert(!body.frozen&&!body.layers);}
}
const canonicalReplay=replay(level,d.drags,api,{complete:true,requirePointerCompatible:true});assert.equal(canonicalReplay.nonClearingDrags,20);assert.equal(canonicalReplay.clearEvents,28);
const projected={...level,mechanismRules:'revised-2026-09-23-v1.4'},c=compile(projected,api,4),legal=new Set(level.playable.map(([x,y])=>y*level.width+x));
assert.equal(c.blocks.length,9);assert.equal(c.frozenHiddenInventory.length,18);
let poseChecks=0,highWordPoses=0,neighborChecks=0;
for(const b of c.blocks)for(let p=0;p<c.W*c.H;p++){
 const x=p%c.W,y=Math.floor(p/c.W),cells=b.shape.map(([dx,dy])=>[x+dx,y+dy]);
 const allowed=cells.every(([xx,yy])=>xx>=0&&xx<c.W&&yy>=0&&yy<c.H&&legal.has(yy*c.W+xx));assert.equal(Boolean(b.poses[p]),allowed);if(!allowed)continue;
 const mask=[0,0,0,0];for(const[xx,yy]of cells){const q=yy*c.W+xx;mask[q>>>5]|=1<<(q&31);}assert.deepEqual(b.poses[p].mask,mask);poseChecks++;highWordPoses+=Number(cells.some(([xx,yy])=>yy*c.W+xx>=64));
 const expected=[[x,y-1],[x+1,y],[x,y+1],[x-1,y]].filter(([xx,yy])=>xx>=0&&xx<c.W&&yy>=0&&yy<c.H&&b.poses[yy*c.W+xx]).map(([xx,yy])=>yy*c.W+xx);assert.deepEqual(b.poses[p].neighbors,expected);neighborChecks+=expected.length;
}
const model=new api.PuzzleModel(level);model.startCountdown();let routeStates=0,authoritativePoses=0,authoritativeExits=0,unitSteps=0;
const events=[];let parking=0,prefixParking;
for(let step=0;step<=d.drags.length;step++){
 const snap=model.snapshot();
 if(snap.cleared<4){
  const s=stateOf(c,snap),fast=new Set();each(c,s,(bi,v,cost)=>fast.add(bi+':'+v+':'+cost));routeStates++;
  for(const[i,b]of c.blocks.entries()){
   const body=model.getBlock(b.id);if(!body||!model.isBlockActive(body))continue;
   const q=[[body.x,body.y]],seen=new Set([body.x+','+body.y]);
   for(let at=0;at<q.length;at++){
    const[x,y]=q[at];authoritativePoses++;if(at)assert(fast.has(i+':'+(y*c.W+x)+':1'));
    const atPose=model.clone(),moved=atPose.getBlock(b.id);moved.x=x;moved.y=y;
    for(const side of ['top','right','bottom','left'])if(atPose.exitAttemptStatus(b.id,side)==='ok'){authoritativeExits++;assert(fast.has(i+':511:0'));}
    for(const[dx,dy]of[[0,-1],[1,0],[0,1],[-1,0]]){const xx=x+dx,yy=y+dy,k=xx+','+yy;if(seen.has(k)||!model.canPlace(body,xx,yy))continue;unitSteps++;seen.add(k);q.push([xx,yy]);}
   }
  }
 }
 if(step===d.drags.length)break;
 const drag=d.drags[step],before=model.snapshot();model.beginAction();for(const xy of drag.path)assert(model.moveBlockStep(drag.blockId,...xy));if(drag.exitSide)assert(model.tryExit(drag.blockId,drag.exitSide).ok);assert(model.commitAction());const after=model.snapshot(),delta=after.cleared-before.cleared;parking+=Number(!delta);
 const ice=after.blocks.find(b=>b.id==='h0'),beforeIce=before.blocks.find(b=>b.id==='h0');if(ice){const expected=after.cleared<=4?22:Math.max(0,26-after.cleared);assert.equal(ice.frozen,expected);}
 if(delta){events.push({step:step+1,clear:after.cleared,ice:ice?.frozen??null,hidden:!after.shutters.find(s=>s.count===0&&s.id==='r107-182-c4')?.revealed,reveals:after.shutters.filter(s=>s.revealed&&!before.shutters.find(t=>t.id===s.id).revealed).map(s=>s.id),peeled:Boolean(beforeIce&&ice&&beforeIce.layers.length!==ice.layers.length)});if(after.cleared===4)prefixParking=parking;}
}
assert.equal(prefixParking,16);assert.equal(events.find(e=>e.clear===4).ice,22);assert.equal(events.find(e=>e.clear===26).ice,0);assert.equal(events.filter(e=>e.peeled).length,1);
assert.equal(events.find(e=>e.clear===10).reveals.length,5);
const fresh=search(projected,{prove:true,floor:16,goalClears:4,maxStates:200000,maxMilliseconds:10000});assert.equal(fresh.status,'threshold-proven');assert.equal(fresh.maxClears,3);
for(const bad of [l=>{l.flipDoors=[{...l.gates.pop(),initiallyOpen:true}];},l=>{l.shutters[0].count=3;},l=>{l.blocks[0].keyId='key';}]){const n=structuredClone(projected);bad(n);assert.throws(()=>compile(n,api,4));}
for(const[p,sha]of Object.entries(bindings))assert.equal(digest(fs.readFileSync(p)),sha,'source drift '+p);
const result={createdAt:new Date().toISOString(),status:'PASS_CANDIDATE182_INDEPENDENT_REVIEW',activeRuleVersion:lock.activeVersion,file,levelSha256:digest(level),routeSha256:digest(d.drags),bindings,sourceBodyMappings:27,sourceFactsChecked:true,qualification:{path:QUALIFICATION,sha256:bindings[QUALIFICATION]},qualifiedSourceContinuity,freshLowerBound:{L:16,proof:fresh,domain:'All27 source bodies retained, optional-contact mask graph, stop firstC4; no greedy normalization or identity quotient.'},completeUpperBound:{U:20,totalDrags:48,clearEvents:28,continuousModel:true},candidateGeometryChecks:{poseChecks,highWordPoses,neighborChecks},actualPrefixInclusion:{routeStates,authoritativePoses,authoritativeExits,unitSteps},mechanismTimeline:events,prefixParking:16,negativeControlsRejected:3,slowExtraModelCheck:{path:SLOW,status:'UNKNOWN_BUDGET_STOP_NO_PASS_CLAIM',necessaryForCertificate:false},scope:'Valid fresh lower and full model upper bound, source/space/native shape audit. Actual browser Pointer/natural clock and formal object acceptance remain separate.',pointerValidated:false,formalAdopted:false};
const out='deliverables/remake182-185-20260927/review/candidate182-'+Date.now()+'.json';writeNew(out,result);console.log(JSON.stringify({out,status:result.status,L:16,U:20,total:48,geometry:result.candidateGeometryChecks,inclusion:result.actualPrefixInclusion}));
