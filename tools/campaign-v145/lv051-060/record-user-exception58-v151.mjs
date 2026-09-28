import fs from 'node:fs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';

const root='deliverables/remake31-200-v145-20260924/batches/lv051-060';
const candidate=process.argv[2]??`${root}/rebuild58/enriched-1790264423906.json`;
const stages=process.argv[3]??`${root}/root58/independent-check58-1790309156759.json`;
const pointer=process.argv[4]??`${root}/pointer-playable58-1790309187457/report.json`;
const instruction=`${root}/USER-UPDATE-58-60.md`;
const lock=verifyRulesLock();
if(!lock.ok)throw new Error('rules lock must pass');
if(lock.activeVersion!=='1.51.0')throw new Error(`expected v1.51.0, got ${lock.activeVersion}`);
const d=JSON.parse(fs.readFileSync(candidate));
const s=JSON.parse(fs.readFileSync(stages));
const p=JSON.parse(fs.readFileSync(pointer));
const row=p.rows.find(r=>r.id===58);
if(!row||p.status!=='PASS')throw new Error('fresh pointer report is not PASS');
const levelSha256=digest(d.level),routeSha256=digest(d.drags);
if(s.levelSha256!==levelSha256||s.routeSha256!==routeSha256)throw new Error('stage report hash mismatch');
if(row.levelSha256!==levelSha256||row.routeSha256!==routeSha256)throw new Error('pointer report hash mismatch');
if(s.status!=='STAGES_PASS_FLOOR_NOT_CHECKED'||!s.sourceContractPassed||!s.replay?.complete)throw new Error('stage gates incomplete');
if(row.status!=='PASS'||row.naturalTimingReplay?.passed!==true||row.final?.complete!==true)throw new Error('pointer gates incomplete');
const out=`${root}/root58/user-exception58-${Date.now()}.json`;
const report={
  status:'PASS_USER_EXCEPTION_NO_FLOOR',
  ruleVersion:lock.activeVersion,
  checkedAt:new Date().toISOString(),
  candidate,
  candidateSha256:digest(fs.readFileSync(candidate)),
  levelSha256,
  routeSha256,
  U:s.replay.nonClearingDrags,
  totalDrags:d.drags.length,
  sourceStaticNativeRoute:'PASS',
  stagesReport:{file:stages,sha256:digest(fs.readFileSync(stages)),status:s.status},
  pointerReport:{file:pointer,sha256:digest(fs.readFileSync(pointer)),status:p.status,naturalElapsedSeconds:row.naturalTimingReplay.activeTickSeconds,remainingSeconds:row.final.remainingSeconds,storageBackend:row.storage?.backend??null},
  lowerBoundRequirement:'WAIVED_BY_LATEST_USER_INSTRUCTION',
  lowerBoundCertified:false,
  userInstruction:'不用低于11次了',
  userInstructionRecord:{file:instruction,sha256:digest(fs.readFileSync(instruction)),scope:'level58-only',effect:'Do not search or reject routes below 11; do not relabel UNKNOWN as L11.'},
  rangeException:'USER_AUTHORIZED_LEVEL58_REQUIRED_MOVES_MAY_EXCEED_NORMAL_11_15',
  formalAdopted:false,
  published:false,
  limitations:['This is a task-local candidate eligibility record, not a production LEVELS write.','No lower-bound minimum is claimed for level 58 under the latest user waiver.','Human blind test, phone test, and release approval remain separate.']
};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({out,status:report.status,ruleVersion:report.ruleVersion,U:report.U,naturalElapsedSeconds:report.pointerReport.naturalElapsedSeconds}));
