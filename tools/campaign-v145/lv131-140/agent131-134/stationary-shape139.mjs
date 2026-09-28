import fs from 'node:fs';
import {loadSpatialApi} from '../agent139-140/witness-domain.mjs';
import {checkStationaryObligations} from '../root-native/stationary-obligations.mjs';
import {loadPreviewCore,digest} from '../../../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../../../revised-gate-span-limits.mjs';
import {auditGeneratorQueueColors} from '../../../revised-generator-queue-colors.mjs';
const input=process.argv[2],d=JSON.parse(fs.readFileSync(input)),api={...await loadSpatialApi(),...(await loadPreviewCore()).api};
for(const variant of [0,1]){
 const level=structuredClone(d.level),b=id=>level.blocks.find(b=>b.id===`n139-opening-${id}`);level.generators[0].offset=7;level.generators[0].spawn=[6,0];
 if(variant===0){b(3).shape=[[0,0],[0,1]];b(7).shape=[[0,0]];b(7).y=2;}
 else {b(3).shape=[[0,0],[1,0]];b(5).x=0;b(5).y=2;b(5).color='red';b(7).shape=[[0,0]];}
 api.validateLevel(level);const checks={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),spans:auditGateSpanLimits(level),queue:auditGeneratorQueueColors(level),art:api.auditCandidateBlockArt(level)};
 const adjacency=[];const opening=level.blocks.filter(b=>!b.shutterId&&!b.id.includes('queue'));for(let i=0;i<opening.length;i++)for(let j=i+1;j<opening.length;j++){const a=opening[i],b=opening[j];if(a.color===b.color&&a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1)))adjacency.push([a.id,b.id]);}checks.adjacency={passed:!adjacency.length,conflicts:adjacency};
 const proof=checkStationaryObligations(level,api,{floor:11,targetIds:[d.targetId]});
 const file=`deliverables/remake131-140-v146-20260924/agent131-134/stationary-shape139-${variant}-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify({level,targetId:d.targetId,checks,proof,input,variant,levelSha256:digest(level),formalAdopted:false},null,2));console.log(JSON.stringify({file,passed:Object.values(checks).every(x=>x.passed),obligations:proof.provedObligations}));
}
