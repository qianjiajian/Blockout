import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ruleGate,loadApi,BASELINE,OUTPUT,writeNew,auditCandidate,checkCandidate} from './native-block-repair-v143.mjs';
ruleGate();
const {api}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));
const old=JSON.parse(fs.readFileSync('deliverables/layout-originality-v140-20260924/agent23/final23.json'));
const level=structuredClone(baseline.levels[22].level);
level.blocks=level.blocks.flatMap(b=>b.id==='r139-23-17'?[
 {id:'v143-23-17-bar',x:2,y:1,shape:[[0,0],[0,1]],color:'green',shutterId:'cover-2'},
 {id:'v143-23-17-single',x:1,y:2,shape:[[0,0]],color:'blue',shutterId:'cover-2'},
]:[b]);
const drags=structuredClone(old.drags);
assert.equal(drags[28].blockId,'r139-23-17');
drags[28].blockId='v143-23-17-bar';drags[28].path.shift();
drags.splice(31,0,{blockId:'v143-23-17-single',path:[[1,1],[2,1],[3,1],[4,1],[5,1]],exitSide:'right'});
const data={level,drags,seed:'v143-native23-v2-green-V2-blue-S',
 replacements:[{sourceIds:['r139-23-17'],blockIds:['v143-23-17-bar','v143-23-17-single'],reason:'原逆向L3三格原足迹分成原向V2与单格；单格蓝色可从既有右口直接离场，避免新增重复腾挪。'}],
 design:{primaryMechanism:old.design.primaryMechanism,concreteDecision:old.design.concreteDecision,
 adaptation:'只替换cover-2内原逆向L3：18体变19体，其它块、4壳、两帘9/12、冰门3/5以及评价完整保持。新路线38拖包含23次清除和15次腾挪；下界独立重算。'},
 decisionCases:old.decisionCases.map(c=>({...structuredClone(c),fullRecoveredRoute:[...drags.slice(0,c.atStep-1),c.legalWrongParking,c.recoveryDrag,...drags.slice(c.atStep-1)]})),
 construction:{program:'tools/native23-v143.mjs',routeInput:'deliverables/layout-originality-v140-20260924/agent23/final23.json',derivedNotOldCertificate:true}};
const folder=OUTPUT+'/root23-'+Date.now();writeNew(folder+'/candidate.json',data);
console.log(JSON.stringify({folder,audit:auditCandidate(data,baseline,api).passed,replay:api.replayRevisedRoute(level,drags)}));
const checks=checkCandidate(data,baseline,api);writeNew(folder+'/checks.json',checks);
console.log(JSON.stringify({folder,status:'PASS',lower:checks.lowerBound,upper:checks.upperBound,measurement:{...checks.measurement,steps:undefined}}));
