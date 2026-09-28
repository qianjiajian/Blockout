import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,geometry} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {checkSource60,SOURCE60_FACTS} from './source60-contract.mjs';
import {build,rngFor,reviewParking,reviewKey,write,AUTH} from './author60-v147.mjs';
const lock=verifyRulesLock();assert(lock.ok);const file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),{api}=await loadApi(),source=checkSource60(d,{api}),baseline=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json')).levels[59];
assert.equal(d.level.id,60);assert.deepEqual(geometry(d.level),baseline.geometry);
const rng=rngFor(d.seed),spec=JSON.parse(fs.readFileSync(d.spec));let level,index;
for(let attempt=1;attempt<=d.attempts;attempt++){index=Math.floor(rng()*spec.layouts.length);level=build(spec.layouts[index],rng,baseline);}
assert.equal(index,d.layoutIndex);assert.deepEqual(level,d.level,'Exact seed/attempt reconstruction');
const construction=write('construction60',{status:'PASS',checkedAt:new Date().toISOString(),seed:d.seed,attempt:d.attempts,layoutIndex:index,levelSha256:digest(level),routeSha256:digest(d.drags),sourceSpec:{file:d.spec,sha256:digest(fs.readFileSync(d.spec))},constructor:{file:'tools/campaign-v145/lv051-060/author60-v147.mjs',sha256:digest(fs.readFileSync('tools/campaign-v145/lv051-060/author60-v147.mjs'))},authorization:{file:AUTH,sha256:digest(fs.readFileSync(AUTH))},sourceReview:{file:SOURCE60_FACTS,sha256:digest(fs.readFileSync(SOURCE60_FACTS))},formalAdopted:false});
d.sourceReview=SOURCE60_FACTS;d.sourceReviewSha256=digest(fs.readFileSync(SOURCE60_FACTS));d.sourceAdaptation={sourceContract:source,blockMapping:source.sourceMapping,recolorings:source.rows.filter(r=>r.changedColor),originalTeaching:source.addedTeaching,ordinaryGateAdaptation:'24 same-color repeated1-cell source mouths become five distinct-color contiguous mouths ≤3, with3 proven-minimal carrier recolors. All35 bodies and their axes retained.',notExactSourceCopy:true};
d.originality={sourceCoordinatesCopied:false,layoutIntent:'纵向绿色工作区收拢在左两列，黄色在右三列；红色横轴区在上三行、蓝色在中下三行、粉色在最底行。唯一出口重新布置，钥匙在顶行、锁在左下，改变来源的交错颜色分区与通路。',alignment:'35原向单格保持满铺网格和规整行列；源形状全为单格，不为了旧作者内部多格比例断言发明多格块。'};
d.design={primaryMechanism:'钥匙块本体离场后解开同组锁1',concreteDecision:'先给顶行红钥匙腾出右侧出口通路，钥匙离场后解开左下绿色纵轴锁块，继而清理其占据的竖向通道。五次停车分别发生在五个不同载体，无重复往返；局部误停能原路恢复。',auxiliaryMechanism:'保留竞品35轴向约束，不增加冰、壳、队列或隐藏机制。',teachingDifficulty:'独立L5与完整U5精确吻合，简单档5–10；共35次清除+5次停车。'};
d.quality=reviewParking(d.level,d.drags,api);d.decisionCases=d.quality.decisionCases;d.teaching=reviewKey(d.level,d.drags,api);d.constructionReport={file:construction,sha256:digest(fs.readFileSync(construction))};d.authorization={file:AUTH,sha256:digest(fs.readFileSync(AUTH))};d.ruleVersion=lock.activeVersion;d.formalAdopted=false;d.pointerValidated=false;
const out=write('candidate60',d);console.log(JSON.stringify({out,construction,L:5,U:d.replay.nonClearingDrags,sourceRecolors:3}));
