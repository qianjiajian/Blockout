import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ROOT,loadApi,audit,digest,replay,writeNew} from './common.mjs';
import {payload,qualify} from './author236-native.mjs';
const raw=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const original=ROOT+'/author236/run-1001-1792395484887/candidate-1018.json',d=JSON.parse(fs.readFileSync(original)),level=structuredClone(d.level),drags=d.row.route.drags;
const{api}=await loadApi();assert(d.row.lower.thresholdProven);assert.equal(d.row.lower.floor,11);
const proofInput=JSON.parse(fs.readFileSync(d.row.lower.input));
assert.deepEqual(payload(level,api,{floor:11,maxMilliseconds:4000,maxStates:600000}).p,proofInput);
const beforeSha=digest(level),route=replay(level,drags,api,{complete:true,requirePointerCompatible:true});assert.equal(route.nonClearingDrags,15);
level.preservedMoveTarget=route.effectiveDrags;level.parMoves=route.effectiveDrags;
level.mechanismAdaptation.change='源7×10包含中央孤岛墙，按无内墙硬规则改为同外尺寸60格左右对称削肩原创轮廓，非镜像或整体换色。24个源本体按各体面积保留；两V3冰7粉/蓝与三色冰门9红/粉/黄均保留。两非原向L4改SQ2、非冰三格改原向H3/V3、普通双格改H2/V2并真实重分区；普通块为原向素材与相邻异色重配，已知冰体颜色保持。七出口唯一色保持，位置移到新轮廓真实边界并采用2–3格跨度。';
assert.deepEqual(payload(level,api,{floor:11,maxMilliseconds:4000,maxStates:600000}).p,proofInput,'Scoring/descriptive metadata must not change the proof input');
const qualification=qualify(level,drags,api),staticAudit=audit(level,api),finalRoute=replay(level,drags,api,{complete:true,requirePointerCompatible:true});
const sourceLedger=ROOT+'/author236/source-block-transcription.json';
const codeFiles=['tools/continue231-240/author236-finalize.mjs','tools/continue231-240/author236-native.mjs','tools/continue231-240/author236-tiling.mjs','tools/continue231-240/common.mjs','tools/continuation211-colored-witness.mjs','tools/remake191-200/root200/domain.mjs','tools/remake191-200/replay.mjs','tools/remake191-200/author194-196/native-keys32.cs','src/core/PuzzleModel.ts','src/core/blockExitFrontier.ts','src/game/continuousDrag.ts','src/game/formalBlockShapes.ts'];
const evidenceFiles=[original,sourceLedger,d.row.lower.input,d.row.lower.output,ROOT+'/source/frame-536.png',ROOT+'/source/frame-570.png',qualification.native.input,qualification.native.output];
const packet={status:'HEADLESS_QUALIFIED_PENDING_DUAL_POINTER',level,drags,levelSha256:digest(level),routeSha256:digest(drags),sourceLedger,sourceLedgerSha256:raw(sourceLedger),
 sourceAdaptation:{geometry:{sourceWidth:7,sourceHeight:10,sourcePlayableCells:60,sourceInternalWallCells:10,authoredPlayableCells:60,authoredRowWidths:[5,5,7,7,7,7,7,7,5,3],sourceMaskRetained:false,actualBoundaryRepartition:true},
 blocks:level.blocks.map(b=>{const source=JSON.parse(fs.readFileSync(sourceLedger)).blocks.find(s=>s.id==='source236-'+b.id.split('b').at(-1));return {id:b.id,sourceId:source.id,sourceColor:source.color,sourceShape:source.shape,authoredColor:b.color,authoredShape:b.shape,sourceArea:source.shape.length,authoredArea:b.shape.length,mechanismFrozen:b.frozen??0};}),
 gateChanges:'Source positions and spans 2/2/3/2/3/2/2 remapped to actual authored outline; colors and exactly three counters9 retained. No new gate kind.',unknownFields:[],sources:[ROOT+'/source/frame-536.png',ROOT+'/source/frame-570.png']},
 proof:{...d.row.lower,originalInputLevelSha256:beforeSha,sourceLevelSha256:digest(level),levelSha256:digest(level),binding:'Final scoring/descriptive metadata changed only; native input recompiled deeply equal, old lower search reused without repetition'},
 lowerBinding:{original,originalRawSha256:raw(original),originalLevelSha256:beforeSha,currentLevelSha256:digest(level),mechanicalPayloadExactlyEqual:true,nativeInputRawSha256:raw(d.row.lower.input),nativeOutputRawSha256:raw(d.row.lower.output),noRepeatedLowerSearch:true},
 qualification,qualificationReview:{initialFailurePreserved:original,reason:'Initial audit compared JavaScript ordinal sorting with C# culture-sensitive sorting. Both complete successor sets are now independently sorted using the same JavaScript comparator before equality; no domain/search/cost changed.'},
 audit:staticAudit,replay:finalRoute,certifiedLowerBound:11,witnessUpperBound:15,difficultyBand:[11,15],starTargets:api.levelStarTargets(level),
 codeSha256:Object.fromEntries(codeFiles.map(f=>[f,raw(f)])),evidenceSha256:Object.fromEntries(evidenceFiles.map(f=>[f,raw(f)])),pointerValidated:false,naturalClockValidated:false,formalAdopted:false,releaseApproved:false};
const out=ROOT+'/author236/qualified236.json';writeNew(out,packet);console.log(JSON.stringify({out,L:11,U:15,drags:drags.length,levelSha256:packet.levelSha256,qualification:{states:qualification.states,transitions:qualification.transitions}}));
