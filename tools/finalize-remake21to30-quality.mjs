// Freeze the reviewed second-pass inputs. Does not edit production LEVELS.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {IDS,loadApi} from './remake21to30-v120.mjs';
import {OUTPUT,writeNew,ruleGate} from './remake21to30-quality.mjs';
import {verifyDecisions} from './review-remake21to30-decisions.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
ruleGate();const {api}=await loadApi();
const files=process.argv.slice(2);assert.equal(files.length,10);
const candidates=files.map(file=>({file,data:JSON.parse(fs.readFileSync(file))})).sort((a,b)=>a.data.level.id-b.data.level.id);
assert.deepEqual(candidates.map(c=>c.data.level.id),IDS);
const floors={21:12,22:17,23:15,24:12,25:15,26:10,27:10,28:17,29:18,30:22};
const decisions={
  21:['卷帘＋外壳','先安排大块临停，再剥蓝壳打开第一段卷帘；内芯继续占位，第二段工作位尚不可用。'],
  22:['外壳＋冰门','棋盘可见外壳剥后仍占位，需要为异色内芯转运与其他大块通过留出工作位；冰门控制提前清场。'],
  23:['外壳返程与多格互锁','青壳剥为红芯后，内芯需要两次换停车位，让另一横条和纵向大块穿行，不能把剥壳当作腾空。'],
  24:['数字冰＋外壳','冰块解冻后先剥壳，保留下来的异色内芯还需转运；规划解冻前后的通道和停车位置。'],
  25:['外壳＋卷帘＋冰门','3×3与3×2块错位交换；红壳剥开同时推进卷帘，但绿芯留在通道，须挪走才能让黄方块通过。'],
  26:['分段卷帘与大块工作位','两段卷帘分别限制可用周转区，3×3、3×2与方块交替借位；工作位开启前不能把另一块的通路当停车区。'],
  27:['外壳＋卷帘＋冰门','早期绿壳剥成紫芯后仍需停车；蓝大块清除同时揭帘并解开黄门，开启新的转运空间。'],
  28:['卷帘＋外壳＋冰门','中段横向工作带与分批卷帘空间交替使用，壳后内芯和上下大块不能抢占同一通道。'],
  29:['外壳＋数字冰＋冰门','蓝壳剥开同步解冻中央冰2方块，但橙芯不消失；先给内芯与刚解冻方块留出交错通路。'],
  30:['相反方向的外壳返程＋冰门','绿壳变红芯须从顶侧返左侧，蓝壳变绿芯又要从右侧返顶侧；反向交通需要预先安排多格临停。'],
};
const folder=`${OUTPUT}/reviewed-${Date.now()}`,rows=[],selected=[];
for(const {file,data}of candidates){
  const id=data.level.id,evidence=verifyDecisions(data,api),sample=evidence.cases[0];
  const copy={...data,certificationFloor:floors[id],reviewedRuleVersion:'1.21.0'};
  const candidatePath=`${folder}/lv${id}.json`;writeNew(candidatePath,copy);selected.push(candidatePath);
  rows.push({id,levelSha256:digest(data.level),routeSha256:digest(data.drags),status:'PASS',
    primaryMechanism:decisions[id][0],concreteDecision:decisions[id][1],
    wrongChoice:{step:sample.atStep,blockId:sample.blockId,area:sample.area,wrongParking:sample.wrongParking,blockedNext:sample.blockedNext,observedRejection:sample.blockedReason},
    recovery:{drag:sample.recovery,fullRecoveredRouteDrags:sample.recoveredDrags,fullRecoveredRouteRepositions:sample.recoveredRepositions,globalOptimalPenaltyProven:false},
    mechanismEvidence:{observedProcess:evidence.observedMechanismProcess,isolatedContrast:evidence.mechanismContrast},
    allCases:evidence.cases,source:file,sourceSha256:digest(fs.readFileSync(file)),
    informationFairness:'现有机制的颜色/冰数/卷帘计数可辨识；隐藏批次不含需预先猜测的炸弹或锁钥。案例仅证明特定误停后可恢复，不保证所有误选均可逆。',
    playerRisks:id===25?['首次剥壳在路线中段，早段仍偏几何互锁。']:id===26||id===29?['普通标签不等于真人难度已标定，需重点观察首次理解与用时。']:[],
    humanBlindTested:false,timeAndStarsCalibrated:false,releaseApproved:false});
}
const reviewPath=`${folder}/design-review.json`;writeNew(reviewPath,{ruleVersion:'1.21.0',status:'PASS',basis:'Root reviewed actual maps, isolated previews and independently replayed causal cases; not a human blind playtest',rows});
const selection={folder,reviewPath,files:selected};writeNew(`${folder}/selection.json`,selection);console.log(JSON.stringify(selection));
