import fs from 'node:fs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
const root='deliverables/remake31-200-v145-20260924/batches/lv051-060',summaryFile=`${root}/summary.json`,pointer=`${root}/pointer-key60-1790310340643/report.json`,popup=`${root}/root60/popup-1790310409508/report.json`;
const lock=verifyRulesLock();if(!lock.ok||lock.activeVersion!=='1.51.0')throw new Error('v1.51 lock required');
const summary=JSON.parse(fs.readFileSync(summaryFile)),row=summary.rows.find(r=>r.id===60),p=JSON.parse(fs.readFileSync(pointer)),pr=p.rows.find(r=>r.id===60),pop=JSON.parse(fs.readFileSync(popup));
if(!row||p.status!=='PASS'||!pr||pr.status!=='PASS'||pop.status!=='PASS'||pr.levelSha256!==row.levelSha256||pr.routeSha256!==row.routeSha256)throw new Error('fresh level60 pointer/popup mismatch');
Object.assign(row,{ruleVersion:lock.activeVersion,pointer:'PASS',pointerReport:pointer,naturalElapsedSeconds:pr.naturalTimingReplay.activeTickSeconds,popupReport:{file:popup,sha256:digest(fs.readFileSync(popup)),status:pop.status}});summary.updatedAt=new Date().toISOString();summary.ruleVersion=lock.activeVersion;fs.writeFileSync(summaryFile,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({file:summaryFile,pointer,popup,naturalElapsedSeconds:row.naturalElapsedSeconds}));
