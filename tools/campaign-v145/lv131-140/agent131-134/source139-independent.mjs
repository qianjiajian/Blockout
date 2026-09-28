import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';

const lock=verifyRulesLock();assert(lock.ok);assert(lock.verified.some(v=>v.version==='1.72.0'));
const root='deliverables/remake131-140-v146-20260924/agent131-134';
const inspectedCandidate='deliverables/remake131-140-v146-20260924/agent139-140/source-refreshed139-1790476389123.json',candidate=JSON.parse(fs.readFileSync(inspectedCandidate));
const frame=n=>`.codex-temp/video-audit-135-169/137-144/samples1s/sec-${String(n).padStart(5,'0')}.jpg`;
const opening=[
 ['L3','blue',[[6,0],[5,1],[6,1]],{movementAxis:'horizontal'}],
 ['L3','orange',[[2,1],[3,1],[2,2]]],
 ['S','red',[[5,0]]],['SQ2','red',[[0,0],[1,0],[0,1],[1,1]]],
 ['H2','green',[[2,0],[3,0]]],['H2','blue',[[0,2],[1,2]]],['H2','purple',[[5,2],[6,2]]],['V2','yellow',[[4,0],[4,1]]],
 ['S','red',[[4,2]]],['S','blue',[[3,2]]],['S','green',[[7,0]]],['S','green',[[8,1]]],['S','green',[[7,2]]],['S','yellow',[[8,0]]],['S','yellow',[[7,1]]],['S','yellow',[[8,2]]]
].map(([shape,color,cells,mechanism],i)=>({sourceId:`source-opening-${i}`,stage:'opening',shape,color,cells,...mechanism,expectedCandidateId:`n139-opening-${i}`,evidence:[frame(224)]}));
const c16=[
 ['SQ2','green',[[0,11],[1,11],[0,12],[1,12]],3,1],
 ['H3','red',[[6,8],[7,8],[8,8]],4,2],
 ['L3','purple',[[3,11],[2,12],[3,12]],null,0],
 ['SQ2','red',[[7,10],[8,10],[7,11],[8,11]],null,3],
 ['H2','pink',[[0,10],[1,10]],null,4],
 ['H2','green',[[2,10],[3,10]],null,5],
 ['V2','orange',[[6,10],[6,11]],null,6],
 ['H3','blue',[[6,12],[7,12],[8,12]],null,7],
 ['S','pink',[[2,11]],null,8]
].map(([shape,color,cells,frozen,i],n)=>({sourceId:`source-cover16-${n}`,stage:'cover16',shape,color,cells,...(frozen?{frozen}:{}),expectedCandidateId:`n139-c16-${i}`,evidence:[frame(276),...(frozen===3?[frame(288)]:frozen===4?[frame(290),frame(291)]:[])]}));
const c20=[
 ['L4','orange',[[0,5],[0,6],[0,7],[1,7]],'left vertical orange L4'],
 ['L4','orange',[[3,5],[4,5],[5,5],[5,6]],'upper orange L4'],
 ['L4','red',[[4,6],[2,7],[3,7],[4,7]],'middle red L4'],
 ['L4','blue',[[6,6],[6,7],[7,7],[8,7]],'right blue L4'],
 ['H2','yellow',[[1,5],[2,5]],'top yellow H2'],
 ['H3','blue',[[1,6],[2,6],[3,6]],'middle blue H3'],
 ['SQ2','purple',[[7,5],[8,5],[7,6],[8,6]],'upper right purple square']
].map(([shape,color,cells,spatialIdentity],i)=>({sourceId:`source-cover20-${i}`,stage:'cover20',shape,color,cells,spatialIdentity,expectedCandidateId:`n139-c20-${i}`,evidence:[frame(290),frame(291),frame(293)],identityNote:'Old IDs within the four-L4 cohort did not transcribe individual colors; this fixes a spatial ordering for all future source maps.'}));
const queue=[['SQ2','blue',4,299],['PLUS5','cyan',5,300],['T4','blue',4,302],['L3','green',3,304]].map(([shape,color,area,sec],i)=>({sourceId:`source-queue-${i}`,stage:'generator',ordinal:i,shape,color,area,remainingAfterDelivery:3-i,expectedCandidateId:`n139-queue-${i}`,evidence:[frame(sec),...(i===3?[frame(306),frame(308),frame(310)]:[])],...(i===3?{sourceLocalCells:[[0,0],[1,0],[1,1]],correction:'Old source ledger L4 is incorrect. Actual green cargo is L3: two cells across its upper row, one below at right. It is narrower than the adjacent orange cover20 L4 in frame308.'}:{})}));
const bodies=[...opening,...c16,...c20,...queue],irregular=b=>['L3','L4','T4','PLUS5'].includes(b.shape);
assert.equal(bodies.length,36);assert.equal(new Set(bodies.map(b=>b.sourceId)).size,36);assert.equal(new Set(bodies.map(b=>b.expectedCandidateId)).size,36);
for(const [rows,area]of[[opening,27],[c16,24],[c20,25]]){const keys=rows.flatMap(b=>b.cells.map(p=>p.join(',')));assert.equal(keys.length,area);assert.equal(new Set(keys).size,area);}
assert.equal(bodies.filter(irregular).length,10);assert.equal(queue.reduce((n,b)=>n+b.area,0),16);
const iceGates=[
 {sourceId:'ice-upper-left',color:'blue',count:12,retain:true},
 {sourceId:'ice-lower-top',color:'green',count:26,retain:true},
 {sourceId:'ice-lower-left-upper',color:'pink',count:25,retain:true},
 {sourceId:'ice-lower-left-middle',color:'green',count:24,retain:false,reason:'Duplicate green frozen color; keep source green26.'},
 {sourceId:'ice-lower-left-lower-upper',color:'blue',count:17,retain:false,reason:'Duplicate blue frozen color; keep source blue12.'},
 {sourceId:'ice-lower-left-bottom',color:'red',count:19,retain:true},
 {sourceId:'ice-lower-right-middle',color:'yellow',count:20,retain:true},
 {sourceId:'ice-lower-bottom-left',color:'orange',count:18,retain:true},
 {sourceId:'ice-lower-bottom-center',color:'cyan',count:20,retain:true}
];
const ordinaryGates=[{location:'upper-top-left',color:'purple'},{location:'upper-top-right',color:'orange'},{location:'upper-right',color:'green'},{location:'upper-bottom-left',color:'red'},{location:'upper-bottom-right',color:'yellow'},{location:'lower-right-bottom',color:'purple'}];
const candidateIdentityCheck=bodies.map(b=>{const target=candidate.level.blocks.find(x=>x.id===b.expectedCandidateId);assert(target,b.expectedCandidateId);return{sourceId:b.sourceId,targetId:target.id,currentCandidateTarget:target,knownMechanismKept:(!b.movementAxis||target.movementAxis===b.movementAxis)&&(!b.frozen||target.frozen===b.frozen),authoredShapeAndColorNeedExplicitDelta:true};});
assert(candidateIdentityCheck.every(r=>r.knownMechanismKept));
const viewed=[224,276,288,290,291,293,299,300,302,304,306,308,310];
const evidence=viewed.map(n=>({file:frame(n),sha256:digest(fs.readFileSync(frame(n))),independentlyViewed:true}));
const report={status:'INDEPENDENT_SOURCE_FACTS_AND_36_BODY_CHECKLIST',activeRuleVersion:lock.activeVersion,batchRuleVersion:'1.72.0',levelId:139,sourceEvidence:evidence,bodies,totals:{opening:16,cover16:9,cover20:7,queue:4,full:36,openingCells:27,cover16Cells:24,cover20Cells:25,queueCells:16,openingM11:2,cover16M11:1,cover20M11:4,queueM11:3,fullM11:10,horizontalAxes:1,numericIce:[3,4],shells:0,generators:1,queueLengths:[4],curtainCounts:[16,20]},sourceIceGates:iceGates,sourceOrdinaryGates:ordinaryGates,gateAdaptation:{originalPhysical:15,originalFrozen:9,originalOrdinary:6,uniqueFrozenColors:7,retainedFrozen:iceGates.filter(g=>g.retain).map(({color,count})=>({color,count})),removedFrozen:iceGates.filter(g=>!g.retain),retainedOrdinary:[{color:'purple',count:1}],minimumRemovedFrozen:2,minimumRemovedOrdinary:5,totalRemaining:8,reason:'Nine frozen instances occupy seven distinct colors; duplicate blue17/green24 must be removed to keep unique frozen colors. All six source ordinary instances conflict with frozen colors or duplicate purple except one purple, leaving exactly seven frozen plus one ordinary. Known retained initial values are unchanged; authored positions may differ under v1.72.'},requiredAdaptations:{axis:'Source blue L3 horizontal axis is a confirmed irregular carrier. v1.59 requires a rectangular replacement with the horizontal axis retained. Preserve total M11=10 by transferring irregularity to one otherwise ordinary body and disclose identities.',geometry:'Source9x13/93cells has two chambers and a6cell internal ledge. Preserve v1.45 candidate9x13/114playable geometry. Opening/hidden fill differences require explicit ordinary capacity accounting, never invented mechanism or deleted source body.',queue:'True one-machine FIFO is blueSQ2 -> cyanPLUS5 -> blueT4 -> greenL3. Shape/color changes may be authored under v1.72, but source facts and every position in the queue stay separately mapped.'},sourceCorrections:[{field:'source-queue-3.shape',old:'L4',correct:'L3',areaOld:4,areaCorrect:3,M11Unchanged:true,evidence:[frame(304),frame(306),frame(308),frame(310)]},{field:'cover20 per-body colors',old:'not transcribed/null',correct:c20.map(b=>({id:b.sourceId,shape:b.shape,color:b.color,cells:b.cells})),evidence:[frame(291),frame(293)]}],referenceDraft:{file:inspectedCandidate,fileSha256:digest(fs.readFileSync(inspectedCandidate)),levelSha256:digest(candidate.level),sourceIdentityChecks:candidateIdentityCheck,source36Present:true,candidateDifficultyNotCertifiedHere:true},finalCandidateChecklist:['Map every one of36source identities exactly once; any extra bodies must be ordinary capacity additions with separate footprint arithmetic.','Keep two genuine curtains16/20 with nine/seven source identities respectively; every actual hidden region/layer must be full.','Keep hidden numeric ice3/4 in cover16, neither pre-decremented before reveal nor converted to shell/queue ice.','Keep one horizontal rectangular axis and exactly10 M11 across full inventory after necessary axis-M11 transfer.','Keep one real automatic machine and all four FIFO identities/ordinals; declare author changes to source blue/cyan/blue/green and correct final sourceL3.','Keep seven frozen colors/initials blue12,green26,pink25,red19,yellow20,orange18,cyan20 and one ordinary purple; do not drop another ice for proof convenience.','Run new native artwork, full opening/hidden coverage, adjacent-color, full route, applicable lower bound, mechanism use, multi-cell decisions and formal Pointer/natural-clock validation on the final hash.'],formalAdopted:false,candidateDifficultyCertified:false,pointerValidated:false};
const stamp=Date.now(),json=root+`/source139-independent-${stamp}.json`,md=root+`/source139-checklist-${stamp}.md`;
fs.writeFileSync(json,JSON.stringify(report,null,2)+'\n');
const zh={red:'红',blue:'蓝',green:'绿',yellow:'黄',purple:'紫',orange:'橙',cyan:'青',pink:'粉'};
const rows=bodies.map(b=>`| ${b.sourceId} | ${b.stage} | ${zh[b.color]} ${b.shape} | ${b.movementAxis?'水平轴':b.frozen?'隐藏冰 '+b.frozen:b.ordinal!==undefined?'FIFO '+(b.ordinal+1):'普通'} | ${b.expectedCandidateId} |`);
const text=`139 独立来源小清单（active ${lock.activeVersion}，本批合同 v1.72）\n\n16 开局 + 9 cover16 + 7 cover20 + 4 FIFO = 36 源身份；全关 10 异形。源帧已独立目检并在 JSON 中绑定 SHA。\n\n修正：第4件绿色 FIFO 实为 L3（3格），旧账 L4 不正确；M11数量不变。cover20 已从291/293帧补全逐体颜色。\n\n| 源身份 | 批次 | 源颜色/形状 | 已知机关 | 候选身份核对键 |\n|---|---|---|---|---|\n${rows.join('\n')}\n\n出口：源9冰中删除重复蓝17、绿24，保蓝12/绿26/粉25/红19/黄20/橙18/青20；6个源普通实体口仅保一紫口，共8口。源初值不重标。\n\n蓝色L3水平轴必须矩形适配，机关保留；异形数转移补齐并单列。真实隐藏冰3/4保cover16，揭开前不减数。最终候选仍须全量fresh门禁；这份源清单不是难度或正式接入证书。\n\n详细证据：${json}\n`;
fs.writeFileSync(md,text);console.log(JSON.stringify({json,md,bodies:bodies.length,M11:10,queueLast:'green L3 area3',openingArea:27,c16Area:24,c20Area:25,queueArea:16,retainedIce:report.gateAdaptation.retainedFrozen}));
