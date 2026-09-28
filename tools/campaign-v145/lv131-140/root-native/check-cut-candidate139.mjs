import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadModelApi} from '../../../remake131to140-model-api.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {checkDisjointStationaryCuts} from './stationary-disjoint-cuts.mjs';
const input=process.argv[2],d=JSON.parse(fs.readFileSync(input)),api=await loadModelApi(),level=d.level;
const leftTarget=level.blocks.find(b=>!b.shutterId&&b.x===0&&b.y===0&&b.color==='purple');assert(leftTarget);
const queue=new Set((level.generators??[]).flatMap(g=>g.queueBlockIds)),opening=level.blocks.filter(b=>!b.shutterId&&!queue.has(b.id));
const cuts=[];
for(let y=1;y<=7;y++){const row=opening.filter(b=>b.color!=='purple'&&b.shape.some(([x,dy])=>b.x+x<2&&b.y+dy===y));cuts.push({targetId:leftTarget.id,blockerIds:row.map(b=>b.id)});}
const rightTarget=opening.find(b=>b.x===6&&b.y===0&&b.color==='purple');assert(rightTarget);
for(const y of [1,3,5,7]){const row=opening.filter(b=>b.color!=='purple'&&b.y===y&&b.x>=6);assert.equal(row.length,1);cuts.push({targetId:rightTarget.id,blockerIds:[row[0].id]});}
const proof=checkDisjointStationaryCuts(level,api,{floor:11,cuts});assert(proof.thresholdProven);
const file='deliverables/remake131-140-v146-20260924/root-native/cut-proof139-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify({input,inputSha256:digest(fs.readFileSync(input)),proof,formalAdopted:false,independentQualificationPending:true,bindings:Object.fromEntries([import.meta.filename,'tools/campaign-v145/lv131-140/root-native/stationary-disjoint-cuts.mjs','tools/campaign-v145/lv131-140/root-native/stationary-queue-obligations.mjs'].map(p=>[p,digest(fs.readFileSync(p))]))},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,L:proof.provedObligations,cuts:proof.checks.length}));
