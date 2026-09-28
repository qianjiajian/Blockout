import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ruleGate,loadApi,writeNew,BASELINE,auditCandidate,checkCandidate} from './native-block-repair-v143.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {digest} from './revised-preview-validation-v160.mjs';

ruleGate();
const {api}=await loadApi();
const baseline=JSON.parse(fs.readFileSync(BASELINE));
const old=JSON.parse(fs.readFileSync('deliverables/remake21-30-v139-20260924/batch-1790222202466/lv30.json'));
const source=JSON.parse(fs.readFileSync('.codex-temp/native-block-repair-v143-lv30-search.json'));
const level=source.level;
const variant=process.env.NATIVE30_VARIANT??'h2-purple';
const squares=variant.endsWith('-squares');
const openingVariant=variant.replace(/-squares$/,'');
if(variant.startsWith('v2-')){
 const bar=level.blocks.find(b=>b.id==='v143-30-open-15-bar');bar.x=1;bar.y=6;bar.shape=[[0,0],[0,1]];
 const single=level.blocks.find(b=>b.id==='v143-30-open-15-single');single.x=0;single.y=6;single.color=openingVariant.slice(3);
}
if(squares){
 level.blocks=level.blocks.filter(b=>!['v143-30-hidden-3-single','v143-30-hidden-4-single'].includes(b.id));
 for(const [id,y]of[['v143-30-hidden-3-bar',4],['v143-30-hidden-4-bar',2]]){
  const b=level.blocks.find(b=>b.id===id);b.x=5;b.y=y;b.shape=[[0,0],[1,0],[0,1],[1,1]];
 }
}
const rename={
 's30-open-15':'v143-30-open-15-bar',
 's30-hidden-3':'v143-30-hidden-3-bar',
 's30-hidden-4':'v143-30-hidden-4-bar',
};
const drags=[];
for(const [index,d] of old.drags.entries()){
 if(index===48&&!squares)drags.push({blockId:'v143-30-hidden-3-single',path:[[5,5],[5,6],[5,7],[5,8]],exitSide:'bottom'});
 if(index===51&&!squares)drags.push({blockId:'v143-30-hidden-4-single',path:[[6,2],[7,2]],exitSide:'right'});
 const drag=structuredClone(d);drag.blockId=rename[drag.blockId]??drag.blockId;
 if(d.blockId==='s30-hidden-4')drag.path=[[7,2]];
 if(d.blockId==='s30-hidden-4'&&squares)drag.path=[[6,2]];
 if(d.blockId==='s30-hidden-3'&&squares)drag.path=[[5,5],[4,5],[4,6],[4,7]];
 if(d.blockId==='s30-open-15'&&variant.startsWith('v2-'))drag.path=[[1,5],[2,5],[3,5],[4,5],[5,5],[5,4],[5,3],[6,3],[7,3]];
 drags.push(drag);
}
drags.push(openingVariant==='v2-green'
 ?{blockId:'v143-30-open-15-single',path:[[1,6],[2,6],[3,6],[3,7],[3,8]],exitSide:'bottom'}
 :openingVariant==='v2-purple'
 ?{blockId:'v143-30-open-15-single',path:[[0,5],[0,4],[0,3],[0,2],[1,2],[1,1],[2,1],[2,0]],exitSide:'top'}
 :{blockId:'v143-30-open-15-single',path:[[1,6],[1,5],[1,4],[1,3],[1,2],[1,1],[2,1],[2,0]],exitSide:'top'});
const replay=api.replayRevisedRoute(level,drags);
console.log(JSON.stringify({replay}));
if(!replay.valid||!replay.complete)process.exit(1);
const replacements=Object.entries(rename).filter(([original])=>!squares||original==='s30-open-15').map(([original,replacement])=>({sourceIds:[original],blockIds:[replacement,replacement.replace(/bar$/,'single')],reason:'仅将原旋转块的实际足迹替换为原朝向完整条形与单格，覆盖和批次保持。'}));
if(squares)replacements.push({sourceIds:['s30-hidden-3','s30-hidden-4'],blockIds:['v143-30-hidden-3-bar','v143-30-hidden-4-bar'],reason:'同一卷帘中原两块旋转L4的足迹并集为2×4，以两个原向SQ2恰好填满，不改其它块或批次。'});
const first=structuredClone(old.decisionCases[0]);
first.blockId=rename[first.blockId];first.area=2;first.correctDrag=drags[first.atStep-1];first.blockedNextAction=drags[first.atStep-1];
first.legalWrongParking.blockId=first.blockId;first.recoveryDrag.blockId=first.blockId;
if(variant.startsWith('v2-')){first.legalWrongParking.path=[[1,5]];first.recoveryDrag.path=[[1,6]];}
first.fullRecoveredRoute=[...drags.slice(0,first.atStep-1),first.legalWrongParking,first.recoveryDrag,...drags.slice(first.atStep-1)];
const data={ruleVersion:'1.43.0',seed:`native30-v143-exact-footprint-bars-20260924-${variant}`,level,drags,replacements,design:{concreteDecision:'保留上部多格互锁清除链、9次解冰与12次揭帘；原旋转异形拆为有完整原图的独立条块和单格，不移动其它块或改变机制。错误提前停车仍阻挡纵向通路，恢复后原多格链可完成。'},decisionCases:[first],provenance:{baseline:BASELINE,source:'deliverables/remake21-30-v139-20260924/batch-1790222202466/lv30.json',freshProofRequired:true}};
const audit=auditCandidate(data,baseline,api);const measurement=measureRoute(level,drags,api);
const out=`deliverables/native-block-repair-v143-20260924/agent30/lv30-${variant}-${Date.now()}.json`;
writeNew(out,data);console.log(JSON.stringify({out,levelSha256:digest(level),audit:audit.passed,measurement:{...measurement,steps:undefined}}));
if(process.argv.includes('--check')){
 try{
  const report=checkCandidate(data,baseline,api,{maxStates:2000000,maxMilliseconds:180000});
  writeNew(out.replace('.json','-check.json'),report);
  console.log(JSON.stringify({checked:out,lower:report.lowerBound,upper:report.upperBound,proof:report.proof}));
 }catch(error){writeNew(out.replace('.json','-failure.json'),{error:error.message,stack:error.stack});throw error;}
}
