import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../remake21to30-v120.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {compileLevel,stateFromSnapshot,forEachGesture} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/axis-mask-floor.mjs';
import {observeMechanismProcess,verifyDecisions} from './author-axis-decisions.mjs';
import {verifyLocalMechanismChoices} from '../../remake21to30-v139.mjs';
const input=process.argv[2],d=JSON.parse(fs.readFileSync(input)),{api}=await loadApi(),dir='deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64';
const apply=(m,r)=>{for(const a of r){m.beginAction();for(const p of a.path)assert(m.moveBlockStep(a.blockId,...p));if(a.exitSide)assert(m.tryExit(a.blockId,a.exitSide).ok);assert(m.commitAction());}};
const report={candidate:input,candidateSha256:digest(fs.readFileSync(input)),levelSha256:digest(d.level),decisions:verifyDecisions(d,api),curtains:verifyLocalMechanismChoices(d,api),process:observeMechanismProcess(d.level,d.drags,api),gateChoices:[],iceChoices:[]};
function find(prefix,field,id){const base=api.replayRevisedRoute(d.level,prefix);if(!base.valid||base.complete)return null;const snap=JSON.parse(base.finalStateKey),item=snap[field].find(x=>x.id===id);if(!(item?.frozen>0))return null;const changed=structuredClone(d.level);delete changed[field].find(x=>x.id===id).frozen;
 if(!api.replayRevisedRoute(changed,prefix).valid)return null;const m=new api.PuzzleModel(changed);m.startCountdown();apply(m,prefix);const c=compileLevel(changed);let found=null;
 forEachGesture(c,stateFromSnapshot(c,m.snapshot()),(_i,_v,cost,get)=>{if(field==='blocks'&&cost!==1||field==='gates'&&cost!==0)return;const action=get(),b=m.snapshot().blocks.find(b=>b.id===action.blockId);if(field==='blocks'?b.id!==id:b.layers[0]!==item.color)return;const original=api.replayRevisedRoute(d.level,[...prefix,action]),relaxed=api.replayRevisedRoute(changed,[...prefix,action]);if(!original.valid&&relaxed.valid){found={field,id,prefix,action,remainingIce:item.frozen,cleared:snap.cleared,rejection:original.error,onlyChangedProperty:'initial frozen removed',localConstraintVerified:true,globalOptimalDifferenceProven:false};return false;}});return found;}
for(const gate of d.level.gates.filter(g=>g.frozen>0)){let found;for(let i=0;i<d.drags.length&&!found;i++)found=find(d.drags.slice(0,i),'gates',gate.id);if(found)report.gateChoices.push(found);}
for(const ice of d.level.blocks.filter(b=>b.frozen>0)){let found;for(let i=0;i<d.drags.length&&!found;i++)found=find(d.drags.slice(0,i),'blocks',ice.id);
 if(!found)for(let i=d.drags.length-1;i>=0&&!found;i--){const prefix=d.drags.slice(0,i),base=api.replayRevisedRoute(d.level,prefix);if(!base.valid||base.complete||!JSON.parse(base.finalStateKey).blocks.some(b=>b.id===ice.id&&b.frozen>0))continue;const m=new api.PuzzleModel(d.level);m.startCountdown();apply(m,prefix);const c=compileLevel(d.level);
  forEachGesture(c,stateFromSnapshot(c,m.snapshot()),(_i,_v,cost,get)=>{if(cost!==1)return;const setup=get();found=find([...prefix,setup],'blocks',ice.id);if(found){found.setupParking=setup;return false;}});
 }assert(found,'Unverified ice effect');report.iceChoices.push(found);}
assert.equal(report.curtains.length,3);assert.equal(report.process.peels.length,3);assert(report.gateChoices.length);report.passed=true;
const out=`${dir}/mechanism64-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,passed:true,gates:report.gateChoices.length,ice:report.iceChoices.length,curtains:3,peels:3}));
