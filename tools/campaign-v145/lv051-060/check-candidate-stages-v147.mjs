import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadApi,geometry} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {auditSpatial} from '../../remake91to100-v146.mjs';
import {measureRoute} from '../../remake21to30-quality.mjs';
const lock=verifyRulesLock();assert(lock.ok);const {api,inputs}=await loadApi(),baseFile='deliverables/remake31-200-v145-20260924/baseline.json',base=JSON.parse(fs.readFileSync(baseFile));
assert.equal(digest(base.levels.map(r=>r.level)),'e8956f9f3d02d438f9e88c71386b803a5064a6793ad6e5fcac833196fa435ccb');
for(const file of process.argv.slice(2)){
 const d=JSON.parse(fs.readFileSync(file)),l=d.level,old=base.levels[l.id-1];assert(l.id>=51&&l.id<=60);assert.deepEqual(geometry(l),old.geometry);for(const k of ['id','name','timeSeconds','reward','mechanismRules'])assert.deepEqual(l[k],old.level[k]);assert.deepEqual(api.levelStarTargets(l),old.starTargets);
 const audit=auditSpatial(l,api);assert(audit.passed);const replay=api.replayRevisedRoute(l,d.drags);assert(replay.valid&&replay.complete);const measurement=measureRoute(l,d.drags,api);assert(measurement.multiCellDrags>measurement.singleCellDrags);
 assert(d.decisionCases?.length);const decisions=d.decisionCases.map(c=>{const prefix=d.drags.slice(0,(c.atStep??c.beforeDrag)-1),before=api.replayRevisedRoute(l,prefix);assert(l.blocks.find(b=>b.id===c.legalWrongParking.blockId).shape.length>1);const wrong=api.replayRevisedRoute(l,[...prefix,c.legalWrongParking]);assert(wrong.valid&&wrong.nonClearingDrags===before.nonClearingDrags+1);assert(!api.replayRevisedRoute(l,[...prefix,c.legalWrongParking,c.blockedNextAction]).valid);const recovered=api.replayRevisedRoute(l,[...prefix,c.legalWrongParking,c.recoveryDrag]);assert(recovered.valid&&recovered.finalStateKey===before.finalStateKey);const complete=api.replayRevisedRoute(l,[...prefix,c.legalWrongParking,c.recoveryDrag,...d.drags.slice(prefix.length)]);assert(complete.valid&&complete.complete);return{atStep:prefix.length+1,block:c.legalWrongParking.blockId,passed:true};});
 const m=new api.PuzzleModel(l);m.startCountdown();const events=[];
 for(const[i,drag]of d.drags.entries()){const before=m.snapshot();m.beginAction();for(const p of drag.path)assert(m.moveBlockStep(drag.blockId,...p));if(drag.exitSide)assert(m.tryExit(drag.blockId,drag.exitSide).ok);assert(m.commitAction());const after=m.snapshot();
  for(const kind of ['blocks','gates'])for(const b of before[kind])if(b.frozen>0&&after[kind].find(a=>a.id===b.id)?.frozen===0)events.push({step:i+1,event:'thaw',kind,id:b.id});
  for(const b of after.blocks){const prior=before.blocks.find(a=>a.id===b.id);if(prior&&b.layers.length<prior.layers.length)events.push({step:i+1,event:'peel',id:b.id});}
  for(const s of after.shutters)if(s.revealed&&!before.shutters.find(a=>a.id===s.id)?.revealed)events.push({step:i+1,event:'reveal',id:s.id});
 }
 for(const b of l.blocks.filter(b=>b.frozen>0))assert(events.some(e=>e.event==='thaw'&&e.kind==='blocks'&&e.id===b.id));for(const g of l.gates.filter(g=>g.frozen>0))assert(events.some(e=>e.event==='thaw'&&e.kind==='gates'&&e.id===g.id));for(const s of l.shutters??[])assert(events.some(e=>e.event==='reveal'&&e.id===s.id));for(const b of l.blocks.filter(b=>b.layers?.length>1))assert(events.some(e=>e.event==='peel'&&e.id===b.id));
 const refs=[...inputs,baseFile,file,process.argv[1]],source=typeof d.sourceReview==='string'?JSON.parse(fs.readFileSync(d.sourceReview)):d.sourceReview;
 assert(source&&d.sourceAdaptation&&d.originality&&d.design?.concreteDecision);const check=v=>{if(!v||typeof v!=='object')return;const p=v.path??v.file;if(p&&v.sha256){assert.equal(digest(fs.readFileSync(p)),v.sha256);refs.push(p);}Object.values(v).forEach(check);};check(source);
 const r={status:'STAGES_PASS_FLOOR_NOT_CHECKED',activeRuleVersion:lock.activeVersion,checkedAt:new Date().toISOString(),candidate:file,levelSha256:digest(l),routeSha256:digest(d.drags),sourceEvidenceHashesValid:true,sourceParityRequiresSeparateReview:true,audit,replay,measurement,decisions,mechanismEvents:events,preservedStars:old.starTargets,proof:null,lowerBoundCertified:false,pointerValidated:false,formalAdopted:false,bindings:Object.fromEntries(refs.map(p=>[p,digest(fs.readFileSync(p))]))};
 const out=path.dirname(file)+`/stages-check${l.id}-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,status:r.status,U:replay.nonClearingDrags,decisions:decisions.length}));
}
