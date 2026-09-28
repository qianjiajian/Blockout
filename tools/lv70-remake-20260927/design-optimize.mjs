import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {search} from '../../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import {checkAutomaticGeneratorFloor} from './validation-generator-domain.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert(['1.91.0','1.92.0'].includes(lock.activeVersion));
const sourceFile=process.argv[2],base=JSON.parse(fs.readFileSync(sourceFile)),level=base.level,{api}=await loadApi();
const design=fs.readFileSync('tools/lv70-remake-20260927/design-search.mjs','utf8');
const statistics=new Function('assert','return '+design.slice(design.indexOf('export function statistics')+7,design.indexOf('\nlet attempts=0')))(assert);
const root=`deliverables/lv70-remake-20260927/design-optimize-${Date.now()}`;fs.mkdirSync(root,{recursive:true});
const rows=[];
for(const weight of [10,30,100]){
 const result=search({...level,mechanismRules:'revised-2026-09-23-v1.4'},{floor:16,maxStates:250000,maxMilliseconds:Number(process.argv[3]??3000),weight,orderSeed:weight});
 const row={weight,result};if(result.status==='witness'){row.drags=result.drags;row.replay=api.replayRevisedRoute(level,row.drags);assert(row.replay.valid&&row.replay.complete);row.statistics=statistics(level,row.drags,api);}
 rows.push(row);console.log(JSON.stringify({weight,status:result.status,U:result.cost,statistics:row.statistics,states:result.states}));
}
const report={sourceFile,level,levelSha256:digest(level),ruleVersion:lock.activeVersion,rows,status:'DIAGNOSTIC_ROUTE_OPTIMIZATION_NOT_A_LOWER_BOUND'};
fs.writeFileSync(root+'/report.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(root);
