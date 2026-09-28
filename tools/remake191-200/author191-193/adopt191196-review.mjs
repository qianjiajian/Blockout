import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadApi,replay} from '../replay.mjs';
import {auditSpatial,digest,ruleGate,original,geometry,writeNew} from '../common.mjs';
import {payload} from './floor-countdown.mjs';
import {each,clearCount} from '../../campaign-v145/lv131-140/agent139-140/axis128-graph.mjs';
import {normalize} from '../../campaign-v145/lv131-140/agent139-140/axis128-masked-prefix-floor.mjs';

const dir='deliverables/remake191-200-20260927/author191-193';
const files=['ready191-1790525168324.json','ready191-1790524266295.json'].map(f=>dir+'/'+f);
const packets=files.map(f=>JSON.parse(fs.readFileSync(f))),d=packets[0],lock=ruleGate();
assert.equal(lock.activeVersion,'1.112.0','Read and lock the explicit source-acceptance rule before writing review');
const legacyHashes=Object.fromEntries(files.map(f=>[f,digest(fs.readFileSync(f))]));
const {api,inputs}=await loadApi();
const inputHashes=Object.fromEntries([...new Set([...inputs,fileURLToPath(import.meta.url),'tools/remake191-200/author191-193/floor-countdown.mjs','tools/campaign-v145/lv131-140/agent139-140/axis128-graph.mjs','tools/campaign-v145/lv131-140/agent139-140/axis128-masked-prefix-floor.mjs'])].map(f=>[f,digest(fs.readFileSync(f))]));
assert.equal(digest(d.level),'4203a7dd5ce02f4dfe9f434c4d1a638ae603aa511b42d655dfda07de4995014f');
assert.equal(digest(d.drags),'b8c942b408222eab03af95564f63f19bf6a731fd5e81a33437cb1fbf91c24b85');
const evidence=[];
for(const [i,packet]of packets.entries()){
 assert.deepEqual(packet.level,d.level);assert.deepEqual(packet.drags,d.drags);
 assert.equal(packet.sourceStatus,'UNKNOWN_ALL_REQUESTED_SOURCE_FACTS');assert.equal(packet.sourceAcceptanceRequired,true);
 assert.equal(packet.proof.sourceLevelSha256,digest(d.level));assert.equal(packet.proof.floor,11);assert.equal(packet.proof.thresholdProven,true);assert.equal(packet.proof.termination,'below-threshold-exhausted');
 assert.equal(packet.nativeQualification.sourceLevelSha256,digest(d.level));assert.equal(packet.nativeQualification.passed,true);
 for(const [kind,binding]of [['proof',packet.proof],['qualification',packet.nativeQualification.native]]){
  const input=JSON.parse(fs.readFileSync(binding.input)),output=JSON.parse(fs.readFileSync(binding.output));
  assert.equal(digest(fs.readFileSync(binding.input)),binding.inputHash);assert.equal(digest(fs.readFileSync(binding.source)),binding.sourceHash);
  const exe=path.join(dir,'native-countdown-'+binding.sourceHash.slice(0,16)+'.exe');assert.equal(digest(fs.readFileSync(exe)),binding.exeHash);
  for(const [key,value]of Object.entries(output))assert.deepEqual(binding[key],value,'Embedded legacy output '+key);
  const {c,p}=payload(d.level,{floor:input.floor,maxMilliseconds:input.maxMilliseconds,maxStates:input.maxStates});
  const core=structuredClone(input);delete core.successorsOnly;delete core.states;assert.deepEqual(core,p,'Fresh candidate payload matches old proof input');
  assert.equal(input.blocks.length,14);assert.equal(input.goalClears,16);
  let states=0,transitions=0;
  if(kind==='qualification'){
   assert.equal(input.successorsOnly,true);assert.equal(input.states.length,24);
   const canonical=s=>{s=s.slice();for(const g of input.groups){const values=g.map(i=>s[i]).sort((a,b)=>a-b);g.forEach((i,j)=>s[i]=values[j]);}return s;};
   const text=s=>{const b=Buffer.alloc(s.length*2);s.forEach((v,i)=>b.writeUInt16LE(v,i*2));return b.toString('base64');};
   for(const [j,values]of input.states.entries()){
    const s=Uint16Array.from(values),row=output.rows[j],expected=new Set();
    assert.equal(row.state,text(s));assert.equal(row.normalized,text(normalize(c,s,c.total).s));assert.equal(row.canonical,text(canonical(normalize(c,s,c.total).s)));
    each(c,s,(bi,v,cost)=>{const n=s.slice();n[bi]=v;expected.add(cost+':'+text(canonical(normalize(c,n,c.total).s)));});
    assert.deepEqual([...expected].sort(),[...row.successors].sort());states++;transitions+=expected.size;
   }
   assert.equal(transitions,packet.nativeQualification.transitions);
  }
  for(const f of [binding.input,binding.output,binding.source,exe])legacyHashes[f]=digest(fs.readFileSync(f));
  evidence.push({packet:files[i],kind,input:binding.input,inputSha256:binding.inputHash,output:binding.output,outputSha256:digest(fs.readFileSync(binding.output)),source:binding.source,sourceSha256:binding.sourceHash,exe,exeSha256:binding.exeHash,payloadMatchesCurrentCandidate:true,qualificationStatesRechecked:states,qualificationTransitionsRechecked:transitions,...kind==='proof'?{floor:11,states:output.exploredStates,edges:output.attemptedTransitions,termination:output.termination}: {}});
 }
}
const spatial=auditSpatial(d.level,api),route=replay(d.level,d.drags,api,{timed:true,complete:true,requirePointerCompatible:true});
assert.equal(route.effectiveDrags,31);assert.equal(route.nonClearingDrags,15);assert.equal(route.multiCellRepositions,15);assert.equal(route.clearEvents,16);
const iceBlocks=d.level.blocks.filter(b=>b.frozen).map(b=>({id:b.id,count:b.frozen})),iceGates=d.level.gates.filter(g=>g.frozen).map(g=>({id:g.id,count:g.frozen})),shells=d.level.blocks.filter(b=>b.layers?.length>1).map(b=>({id:b.id,layers:b.layers}));
assert.equal(d.level.blocks.length,14);assert.equal(shells.length,2);assert.deepEqual(iceBlocks.map(b=>b.count).sort((a,b)=>a-b),[2,3,4]);assert.deepEqual(iceGates.map(g=>g.count).sort((a,b)=>a-b),[1,5,9]);
assert(d.level.blocks.every(b=>b.shape.length===3));assert.equal(d.level.shutters.length,0);
const m=new api.PuzzleModel(d.level);m.startCountdown();const mechanismEvents=[];
for(const [i,drag]of d.drags.entries()){
 const before=m.snapshot(),old=structuredClone(m.getBlock(drag.blockId));m.beginAction();for(const point of drag.path)assert(m.moveBlockStep(drag.blockId,...point));if(drag.exitSide)assert(m.tryExit(drag.blockId,drag.exitSide).ok);assert(m.commitAction());const after=m.snapshot();
 for(const g of after.gates)assert.equal(g.frozen,Math.max(0,(d.level.gates.find(q=>q.id===g.id).frozen??0)-after.cleared));
 for(const b of after.blocks)assert.equal(b.frozen,Math.max(0,(d.level.blocks.find(q=>q.id===b.id).frozen??0)-after.cleared));
 mechanismEvents.push({drag:i+1,blockId:drag.blockId,clearedBefore:before.cleared,clearedAfter:after.cleared,kind:before.cleared===after.cleared?'reposition':m.getBlock(drag.blockId)?'shell-peel':'body-remove',beforeLayers:old.layers,afterLayers:m.getBlock(drag.blockId)?.layers,gates:after.gates.map(g=>[g.id,g.frozen]),iceBlocks:after.blocks.filter(b=>iceBlocks.some(q=>q.id===b.id)).map(b=>[b.id,b.frozen])});
}
assert(m.snapshot().complete);
for(const [f,h]of Object.entries({...legacyHashes,...inputHashes}))assert.equal(digest(fs.readFileSync(f)),h,'File drift during review '+f);
const finalLock=ruleGate();assert.equal(finalLock.activeVersion,'1.112.0');
const base=original().levels[190],out=dir+'/adopt191196-review-'+Date.now()+'.json';
writeNew(out,{status:'PASS_FOR_191_AUTHORED_OPENING_ACCEPTANCE',scope:{levelId:191,level196:'Separate source reviewer; not reviewed here',lowerBoundSearchRerun:false,pointerRerun:false,productionModified:false,legacyEvidenceModified:false},createdAt:new Date().toISOString(),activeRule:finalLock.activeVersion,acceptanceType:'USER_ACCEPTED_AUTHORED_OPENING',acceptanceBasis:'User explicitly requested formal adoption after seeing the selected191/196 screenshots and mechanism explanation; v1.112 accepts191 authored opening.',sourceStatus:d.sourceStatus,sourceValidated:false,competitorOpeningVerified:false,sourceNote:'Acceptance authorizes this concrete authored opening. The competition opening remains UNKNOWN; old conditional/source fields and certificates are not rewritten.',candidate:files[0],candidateSha256:legacyHashes[files[0]],levelSha256:digest(d.level),routeSha256:digest(d.drags),bounds:{lower:11,upper:15,totalDrags:31,clearEvents:16,multiCellRepositions:15,lowerBoundEvidenceUnchanged:true},inventory:{bodies:14,cells:42,allRectangularTriominoes:true,shells,iceBlocks,iceGates,ordinaryGates:1,shutters:0,queued:0},preservation:{geometry:geometry(d.level),originalGeometry:base.geometry,stars:api.levelStarTargets(d.level),originalStars:base.starTargets,timeSeconds:d.level.timeSeconds,reward:d.level.reward,parMoves:d.level.parMoves},spatial,route,proofAndQualification:evidence,mechanismEvents,legacyHashes,inputHashes,limitations:'No new whole-graph search, GUI, natural-clock or human blind-play claim. Existing exact candidate proof and qualification are checked for continuity; current full model route is freshly replayed.'});
console.log(JSON.stringify({out,bounds:{L:11,U:15,drags:31},sourceStatus:d.sourceStatus,acceptanceType:'USER_ACCEPTED_AUTHORED_OPENING',checks:evidence.map(e=>({kind:e.kind,states:e.states??e.qualificationStatesRechecked,edges:e.edges??e.qualificationTransitionsRechecked})),stars:api.levelStarTargets(d.level)}));
