import fs from 'node:fs';
import assert from 'node:assert/strict';
import {search} from '../../../.codex-temp/remake31-40-v141/agent31-34/search-monotone.mjs';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {shortenRoute} from '../../remake21to30-route-shortcuts.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion==='1.47.0');
const file=process.argv[2],data=JSON.parse(fs.readFileSync(file));assert.equal(data.level.id,149);
const {api}=await loadApi();
const started=Date.now(),result=search(data.level,{floor:60,maxStates:300000,maxMilliseconds:Number(process.env.SEARCH_MS??60000),weight:100});
const report={ruleVersion:lock.activeVersion,sourceDraft:file,level:data.level,levelSha256:digest(data.level),search:result,formalAdopted:false};
if(result.drags){report.drags=result.drags;report.replay=api.replayRevisedRoute(data.level,result.drags);}
const out=`deliverables/remake31-200-v145-20260924/batches/lv141-150/root149/deep-${started}.json`;fs.writeFileSync(out,JSON.stringify(report,null,2));
console.log(JSON.stringify({out,status:result.status,clears:result.maxClears,cost:result.cost,replay:report.replay&&{valid:report.replay.valid,complete:report.replay.complete,U:report.replay.nonClearingDrags}}));
