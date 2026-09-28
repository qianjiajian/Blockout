import fs from 'node:fs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
const root='deliverables/remake31-200-v145-20260924/batches/lv051-060',summaryFile=`${root}/summary.json`,stage=`${root}/agent51-54/stages-check52-1790310004303.json`;
const lock=verifyRulesLock();if(!lock.ok||lock.activeVersion!=='1.51.0')throw new Error('v1.51 lock required');
const summary=JSON.parse(fs.readFileSync(summaryFile)),row=summary.rows.find(r=>r.id===52),c=JSON.parse(fs.readFileSync(stage));
if(!row||c.status!=='STAGES_PASS_FLOOR_NOT_CHECKED'||c.levelSha256!==row.levelSha256||c.routeSha256!==row.routeSha256)throw new Error('stage52 mismatch');
Object.assign(row,{ruleVersion:lock.activeVersion,source:'PASS',static:'PASS',native:'PASS',route:'PASS',decisions:'PASS',stageCheck:stage});summary.updatedAt=new Date().toISOString();summary.ruleVersion=lock.activeVersion;fs.writeFileSync(summaryFile,JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({file:summaryFile,stage}));
