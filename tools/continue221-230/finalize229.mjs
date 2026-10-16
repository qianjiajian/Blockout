import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {loadApi,replay} from '../remake191-200/replay.mjs';import {nativeKeyFloor,qualifyNativeKeyFloor} from './native-key-floor.mjs';
import {loadSpatialApi} from '../remake111to120-spatial-floor-v147.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';import {auditGateSpanLimits} from '../revised-gate-span-limits.mjs';import {verifyRulesLock} from '../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok);const{api}=await loadApi();
const prior=JSON.parse(fs.readFileSync('deliverables/continue221-230-20260930/author229/batch-470-report.json')).accepted;
const level=structuredClone(prior.level),drags=prior.record.route.drags;level.preservedMoveTarget=32;
level.mechanismAdaptation.change='来源229首稳776秒：17体34格、2钥匙、2锁各1、4轴、7普通门。新4×9矩形满铺18体36格；两枚源非原向L3锁体适配V3，一普通蓝H2补2格；所有布局原创重排。轴块原色与轴向保留，其余含钥匙/锁载体颜色按无同色邻接重配；钥匙token与绑定不变。三星32拖取同图完整路线，不称最优。详细逐体来源映射见qualified229.json。';
const ignored=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
const audit=api.auditRevisedCandidate(level).issues.filter(i=>!ignored.has(i.code));assert.deepEqual(audit,[]);
const checks={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),gates:auditGateSpanLimits(level),art:api.auditCandidateBlockArt(level)};for(const c of Object.values(checks))assert(c.passed,JSON.stringify(c));
const authoritative=api.replayRevisedRoute(level,drags);assert(authoritative.valid&&authoritative.complete);assert.equal(authoritative.effectiveDrags,32);assert.equal(authoritative.nonClearingDrags,14);
const pointerCompatible=replay(level,drags,api,{complete:true,requirePointerCompatible:true});
const proof=nativeKeyFloor(level,{floor:11,maxMilliseconds:3000,maxStates:400000});assert(proof.thresholdProven);
const qualification=qualifyNativeKeyFloor(level,drags,await loadSpatialApi());
const source=JSON.parse(fs.readFileSync('deliverables/continue221-230-20260930/source228-230/observations.json')).levels.find(r=>r.id===229);
const mapping=[
 [0,'red V3 vertical axis','identity properties'],[1,'purple V3 vertical axis','identity properties'],[2,'yellow L3 red-key lock1','V3 / red'],[3,'light-green L3 blue-key lock1','V3 / orange'],[4,'blue SQ2','identity properties'],[5,'orange V2','pink'],[6,'green V2','blue'],[7,'light-green V2','yellow'],[8,'yellow V2','pink'],[9,'red V2','orange'],[10,'green H2','identity properties'],[11,'light-green S','red'],[12,'orange S red key','green / red token preserved'],[13,'yellow S blue key','purple / blue token preserved'],[14,'yellow S horizontal axis','identity properties'],[15,'green S horizontal axis','identity properties'],[16,'blue S','pink'],[17,'none','new ordinary blue H2 fills 2 cells']
].map(([i,sourceBody,change])=>({candidateId:'l229-b'+i,sourceBody,change}));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const packet={status:'HEADLESS_BOUNDS_STATIC_PASS_POINTER_PENDING',activeRule:lock.activeVersion,governingRule:'1.121.0',level,drags,levelSha256:hash(level),routeSha256:hash(drags),difficulty:{min:11,max:15,L:11,U:14},starTargets:api.levelStarTargets(level),source,sourceDifferences:{board:'Source 6×8 nonrectangular 42-cell mask → authored 4×9 rectangle36 cells. Source occupancy34 → current full36; keeps source17 body instances plus one ordinary H2 fill.',bodyMapping:mapping,gateCounts:'Seven ordinary unique-color gates preserved; light green maps to pink. No ice/curtain/generator/flip added.'},checks,authoritative,pointerCompatible,proof,qualification,pointerValidated:false,naturalClockValidated:false,humanBlindTested:false,formalAdopted:false,releaseApproved:false};
const file='deliverables/continue221-230-20260930/author229/qualified229.json';fs.writeFileSync(file,JSON.stringify(packet,null,2));console.log(JSON.stringify({file,status:packet.status,L:11,U:14,drags:32,levelSha256:packet.levelSha256,qualification:{states:qualification.states,transitions:qualification.transitions},multiCellRepositions:pointerCompatible.multiCellRepositions}));
