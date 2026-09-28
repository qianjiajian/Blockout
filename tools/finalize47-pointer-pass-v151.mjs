import fs from 'node:fs';
import path from 'node:path';
import {digest} from './revised-preview-validation-v160.mjs';
const source='deliverables/remake41-47-v151-20260925/candidate47-competitor-regenerated-v151-l11-u15-decisions.json';
const pointerDir=process.argv[2];
if(!pointerDir)throw new Error('Usage: node tools/finalize47-pointer-pass-v151.mjs POINTER_DIR');
const pointerReport=path.resolve(pointerDir,'report.json');
const report=JSON.parse(fs.readFileSync(pointerReport));
if(report.status!=='PASS'||report.pointerReplayValidated!==true||report.rows?.[0]?.status!=='PASS')throw new Error('Pointer report is not PASS');
const candidate=JSON.parse(fs.readFileSync(source));
candidate.certification={...candidate.certification,lowerBoundReport:path.resolve('deliverables/remake41-47-v151-20260925/search-v151/formal-verification47-v151-final-pointer.json'),pointerValidated:true,naturalTimeValidated:true,pointerReport,formalLevelIntegration:false,releaseApproved:false};
candidate.pointerEvidence={status:'PASS',report:pointerReport,reportSha256:cryptoHash(pointerReport),levelSha256:report.levelSha256,routeSha256:report.routeSha256,nonClearingDrags:report.rows[0].nonClearingDrags,actualDrags:report.rows[0].final.moves,remainingSeconds:report.rows[0].final.remainingSeconds,naturalTimingReplay:report.rows[0].naturalTimingReplay};
const output='deliverables/remake41-47-v151-20260925/candidate47-competitor-regenerated-v151-l11-u15-pointer-pass.json';
fs.writeFileSync(output,JSON.stringify(candidate,null,2)+'\n');
console.log(JSON.stringify({output,pointerReport,levelSha256:report.levelSha256,routeSha256:report.routeSha256}));
function cryptoHash(file){return digest(fs.readFileSync(file));}
