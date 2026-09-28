import fs from 'node:fs';
import {api,save,fileHash} from './common.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {loadApi,auditDraft,mechanismInventory} from '../../../remake121to130-v172.mjs';
import {replayTime} from './replay126-time.mjs';
const input=process.argv[2],old=JSON.parse(fs.readFileSync(input)),data=structuredClone(old),review=data.sourceReview;
review.adaptations=[
 'Preserve baseline6x9 full54 geometry, original identity/time110/reward200/actual star targets. Source35 visible cells plus16 covered leaves a3cell hole; authored opening now covers all38 uncovered cells.',
 'Source opening13 bodies (9H3,2H2,2V2) is re-tiled as19 native unrotated dominoes (11H2,8V2). Top6x5 uses9H2+6V2; central ice5 pair remain2V2; bottom pair remain2H2. Six additional bodies result from smaller footprints and full coverage, not additional mechanisms.',
 'Seven source H3 shell carriers become native H2/V2 shells; the two source ice5 V2 shells remain ice5 V2 shells. Full-level9 shells and2 numbered-ice blocks retain their counts. Colors/layer colors are authored under1.71 and are not claimed source-exact.',
 'Both source covers retain exact x/y/width2/height4/count12, with one fully tiled8cell hidden layer each. Left retains2SQ (source red/pink; candidate colors authored). Right source pinkH2+green rotatedL4+purpleV2 becomes nativeS+L3+SQ. Three bodies, eight cells and one irregular piece are retained; shapes/colors differ explicitly.',
 'Retain ordinaryred plus six ice gates: blue3,yellow5,green8,cyan12,purple14,pink16. Candidate gates all span2 cells matching native maximum cross-sections. Candidate red-right0,blue-left0,yellow-left3,green-top4,cyan-top0,purple-bottom0,pink-bottom4 offsets are authored; source side offsets1/1/3 and top/bottom spans3 remain facts in source video.',
];
review.expectedInventory=mechanismInventory(data.level);
review.candidateInventory={openingBodies:19,openingHistogram:{H2:11,V2:8},hiddenBodies:5,fullBodies:24,fullHistogram:{H2:11,V2:8,SQ:3,L3:1,S:1},shells:9,ice:[5,5],covers:[12,12],frozenGates:[3,5,8,12,14,16]};
data.priorCandidate=input;data.sourceReviewFrozen=true;data.levelSha256=digest(data.level);data.routeSha256=digest(data.drags);
data.replay=api.replayRevisedRoute(data.level,data.drags);data.timed=replayTime(data.level,data.drags,api,true);data.audit=auditDraft(data,(await loadApi()).api);
data.tools={freeze:fileHash('tools/campaign-v145/lv121-130/round3-b/freeze126.mjs'),timed:fileHash('tools/campaign-v145/lv121-130/round3-b/replay126-time.mjs')};
console.log(JSON.stringify({file:save('frozen126-domino',data),levelSha256:data.levelSha256,routeSha256:data.routeSha256,audit:data.audit.passed,timed:data.timed,replay:{valid:data.replay.valid,complete:data.replay.complete,cost:data.replay.nonClearingDrags}}));
