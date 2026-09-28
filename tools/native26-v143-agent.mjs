import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ruleGate,loadApi,BASELINE,writeNew,auditCandidate,checkCandidate} from './native-block-repair-v143.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {verifyDecisions} from './review-remake21to30-decisions.mjs';

ruleGate();
const {api}=await loadApi();
const baseline=JSON.parse(fs.readFileSync(BASELINE));
const input='.codex-temp/native-block-repair-v143-lv26-search.json';
const data=JSON.parse(fs.readFileSync(input));
const old=JSON.parse(fs.readFileSync('deliverables/remake21-30-v139-20260924/batch-1790222202466/lv26.json'));
assert.equal(data.level.id,26);
data.seed='native26-v143-fixed-footprint-H2-S-V3-S-20260924';
data.constructionSources={script:import.meta.url,input,inputSha256:digest(fs.readFileSync(input)),baselineSha256:digest(fs.readFileSync(BASELINE))};
data.replacements=[
 {sourceIds:['r139-26-h10'],blockIds:['v143-26-h10-bar','v143-26-h10-single'],reason:'紫色旋转L3的原三格足迹改用原向H2及独立单格，同一隐藏批次、原颜色不变。'},
 {sourceIds:['r139-26-h11'],blockIds:['v143-26-h11-bar','v143-26-h11-single'],reason:'红色侧向T4的原四格足迹改用原向V3及独立单格，同一隐藏批次、原颜色不变。'},
];
data.design={
 primaryMechanism:'staged-curtains-and-frozen-exits',
 concreteDecision:'保留中上部工作带的多格条块让位、5/9/14冰门次序和19/22双帘。只把下区两件旋转块拆为原向整图独立块；紫色H2需先让出下一件粉色条块的上行空间，不能仅凭隐藏块可见便直接清出。',
 informationFairness:'保持两片卷帘、三个冰门及所有计数/位置；新独立块无新属性且各自使用现成原向整图。不添加隐藏冰壳或未解锁机制。',
 changes:'原两件目标共7格替换为4件、仍占原同批次7格；其余34件完整不动。',
 humanBlindTested:false,
};
const first=structuredClone(old.decisionCases[0]);
assert.equal(first.atStep,5);
first.correctDrag=structuredClone(data.drags[first.atStep-1]);
first.blockedNextAction=structuredClone(data.drags[first.atStep-1]);
first.fullRecoveredRoute=[...data.drags.slice(0,first.atStep-1),first.legalWrongParking,first.recoveryDrag,...data.drags.slice(first.atStep-1)];
data.decisionCases=[first];
const folder=`deliverables/native-block-repair-v143-20260924/agent26/run-${Date.now()}`;
writeNew(folder+'/candidate.json',data);
const partial={levelSha256:digest(data.level),routeSha256:digest(data.drags),audit:auditCandidate(data,baseline,api),replay:api.replayRevisedRoute(data.level,data.drags),measurement:measureRoute(data.level,data.drags,api),decisions:verifyDecisions(data,api)};
writeNew(folder+'/preproof.json',partial);
console.log(JSON.stringify({stage:'preproof-passed',folder,drags:data.drags.length,multi:partial.measurement.multiCellDrags,single:partial.measurement.singleCellDrags}));
try {
 const check=checkCandidate(data,baseline,api,{maxStates:2000000,maxMilliseconds:180000});
 writeNew(folder+'/check.json',check);
 console.log(JSON.stringify({stage:'PASS',folder,lower:check.lowerBound,upper:check.upperBound,proof:check.proof.status}));
} catch(error){
 writeNew(folder+'/failure.json',{message:error.message,stack:error.stack,checkedAt:new Date().toISOString(),levelSha256:digest(data.level),routeSha256:digest(data.drags)});
 console.error(JSON.stringify({stage:'FAIL',folder,message:error.message}));
 process.exitCode=1;
}
