import fs from 'node:fs';import {spawnSync} from 'node:child_process';
import {loadSpatialApi} from '../agent139-140/witness-domain.mjs';
import {checkStationaryObligations} from '../root-native/stationary-obligations.mjs';
import {loadPreviewCore,digest} from '../../../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../../revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from '../../../revised-generator-queue-colors.mjs';
const input=process.argv[2],d=JSON.parse(fs.readFileSync(input)),api={...await loadSpatialApi(),...(await loadPreviewCore()).api};
let rng=139134;const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;},shuffle=a=>a.map(x=>[random(),x]).sort((a,b)=>a[0]-b[0]).map(p=>p[1]);
const cells=b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]),adj=(a,b)=>cells(a).some(([x,y])=>cells(b).some(([u,v])=>Math.abs(x-u)+Math.abs(y-v)===1));
const seen=new Set(),began=Date.now(),results=[];let attempts=0,draws=0;
while(attempts<22&&Date.now()-began<70000&&draws++<500){
 const level=structuredClone(d.level),opening=level.blocks.filter(b=>!b.shutterId&&!b.id.includes('queue')),fixed=opening.filter(b=>b.id==='n139-opening-3'||b.id===d.targetId),eligible=shuffle(opening.filter(b=>b.shape.length===1&&!fixed.some(a=>adj(a,b))));let chosen;
 function pick(at,out){if(out.length===10){chosen=out;return true;}if(eligible.length-at<10-out.length)return false;for(let i=at;i<eligible.length;i++)if(!out.some(a=>adj(a,eligible[i]))&&pick(i+1,[...out,eligible[i]]))return true;return false;}
 if(!pick(0,[]))break;const pattern=chosen.map(b=>b.id).sort().join(',');if(seen.has(pattern))continue;seen.add(pattern);
 const purple=new Set([...fixed,...chosen].map(b=>b.id));for(const b of opening)b.color=purple.has(b.id)?'purple':'blue';
 const painted=new Set(purple);let colorCalls=0;
 function paint(){if(++colorCalls>10000)return false;if(painted.size===opening.length)return true;const b=opening.filter(b=>!painted.has(b.id)).sort((a,b)=>opening.filter(c=>painted.has(c.id)&&adj(b,c)).length-opening.filter(c=>painted.has(c.id)&&adj(a,c)).length)[0];for(const color of b.movementAxis?['blue']:['blue','yellow','orange','red','cyan','pink','green']){if(opening.some(a=>painted.has(a.id)&&a.color===color&&adj(a,b)))continue;b.color=color;if(!api.auditCandidateBlockArt({blocks:[b]}).passed)continue;painted.add(b.id);if(paint())return true;painted.delete(b.id);}return false;}
 if(!paint())continue;const proof=checkStationaryObligations(level,api,{floor:11,targetIds:[d.targetId]});if(!proof.thresholdProven)continue;
 const checks={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),spans:auditGateSpanLimits(level),queue:auditGeneratorQueueColors(level),art:api.auditCandidateBlockArt(level)};if(!Object.values(checks).every(x=>x.passed))continue;
 const file=`deliverables/remake131-140-v146-20260924/agent131-134/stationary-colors139-${attempts++}-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify({level,targetId:d.targetId,checks,proof,input,pattern,levelSha256:digest(level),formalAdopted:false},null,2));
 const run=spawnSync(process.execPath,['tools/campaign-v145/lv131-140/agent131-134/stationary-prefix139.mjs',file],{encoding:'utf8',env:{...process.env,MS:'1500'},timeout:15000,maxBuffer:1024*1024});const last=run.stdout.trim().split(/\r?\n/).at(-1);let result;try{result=JSON.parse(last);}catch{}const row={attempt:attempts,file,obligations:proof.provedObligations,result,exit:run.status};results.push(row);console.log(JSON.stringify(row));if(result?.status==='complete')break;
}
const report=`deliverables/remake131-140-v146-20260924/agent131-134/stationary-colors139-results-${Date.now()}.json`;fs.writeFileSync(report,JSON.stringify({results,patterns:seen.size,elapsed:Date.now()-began},null,2));console.log(JSON.stringify({report}));
