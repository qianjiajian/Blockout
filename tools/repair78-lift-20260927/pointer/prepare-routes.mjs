import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {clean,validateRepair,replaySpatial,spatialRevealProof} from './verification.mjs';
const [candidateFile,beforeFile]=process.argv.slice(2);assert(candidateFile&&beforeFile);
const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion==='1.104.0');
const candidateBytes=fs.readFileSync(candidateFile),candidate=JSON.parse(candidateBytes),beforeBytes=fs.readFileSync(beforeFile),before=JSON.parse(beforeBytes);
assert.equal(candidate.id,78);assert.equal(digest(candidate.level),candidate.levelSha256);
const evidenceBindings={[candidateFile]:digest(candidateBytes)};
for(const evidence of [candidate.base,candidate.prefixEvidence].filter(Boolean)){assert.equal(digest(fs.readFileSync(evidence.file)),evidence.sha256);evidenceBindings[evidence.file]=evidence.sha256;}
let hiddenAdaptationRationale;
if(candidate.colorAdaptation){
 assert.deepEqual([candidate.colorAdaptation.blockId,candidate.colorAdaptation.from,candidate.colorAdaptation.to],['r147-78-hidden-5','cyan','green']);
 hiddenAdaptationRationale='只将隐藏普通单格 r147-78-hidden-5 从青改绿，保原形状与库存。纯坐标铺法 3/4/5 已发现 U15 完整路线，不能保持困难档 16–20 的下限，因此按 v1.104 的最小普通形色适配授权改此一块；这段说明不是新下界通过声明。两冰原形色及初值 3、13 开局块、全部门/地图/评分保持。';
}
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:"export {PuzzleModel} from './src/core/PuzzleModel.ts';export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';export {levelStarTargets,evaluateLevelStars} from './src/core/levelStarConditions.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const projected=clean(before.priorLevels);projected[77]=candidate.level;
const output=path.join('deliverables/repair78-lift-20260927/pointer',`route-packets-${Date.now()}`);fs.mkdirSync(output,{recursive:true});
const rows=[];
let failure;
try{
for(const [caseName,routeField,shaField]of [['normal','drags','routeSha256'],['late-no-external','lateDrags','lateRouteSha256']]){
 const drags=candidate[routeField],routeSha256=digest(drags);assert.equal(routeSha256,candidate[shaField]);
 const packet={id:78,caseName,level:candidate.level,drags,routeSha256,sourceEvidence:{file:candidateFile,sha256:digest(candidateBytes),routeField},evidenceBindings,hiddenAdaptationRationale,beforeFile,beforeSha256:digest(beforeBytes),lowerBoundCertified:false,allHiddenOrdersCertified:false,pointerValidated:false,timeValidated:false};
 const scope=validateRepair(before,packet,projected,api),replay=replaySpatial(candidate.level,drags,api),reveal=spatialRevealProof(candidate.level,drags,api);assert(replay.valid&&replay.complete);
 const row={caseName,drags:drags.length,scope,replay,reveal};rows.push(row);
 if(caseName==='normal')assert(drags.length<=37);else assert.deepEqual(reveal.remainingExternalIds,[]);
 const file=path.join(output,caseName+'.json');fs.writeFileSync(file,JSON.stringify(packet,null,2));Object.assign(row,{file,sha256:digest(fs.readFileSync(file))});
}
}catch(error){failure=String(error.stack??error);process.exitCode=1;}
const status=failure?'CANDIDATE_PACKET_PREPARATION_FAIL':'CANDIDATE_PACKET_PREPARATION_PASS';
fs.writeFileSync(path.join(output,'preparation.json'),JSON.stringify({status,error:failure,candidateFile,candidateSha256:digest(candidateBytes),beforeFile,beforeSha256:digest(beforeBytes),ruleVersion:lock.activeVersion,rows,formalDataValidated:false,pointerValidated:false,naturalTimeValidated:false},null,2));
console.log(JSON.stringify({output,status,error:failure,rows:rows.map(({caseName,file,sha256,drags,reveal})=>({caseName,file,sha256,drags,reveal}))}));
