import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditGeneratorQueueColors} from '../revised-generator-queue-colors.mjs';
import {search} from '../../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import {checkSymmetryGeneratorFloor} from './validation-symmetry-floor.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.95.0');
const sourceFile='deliverables/lv70-remake-20260927/design-ice-light-1790509563742/candidate-4.json',source=JSON.parse(fs.readFileSync(sourceFile));
const {api}=await loadApi(),level=structuredClone(source.level);
level.gates.find(g=>g.color==='yellow').frozen=17;
const a='v146-70-queue-1',b='v146-70-queue-4';
for(const g of level.generators)g.queueBlockIds=g.queueBlockIds.map(id=>id===a?b:id===b?a:id);
for(const g of level.generators)for(const id of g.queueBlockIds){const body=level.blocks.find(b=>b.id===id);[body.x,body.y]=g.spawn;}
api.validateLevel(level);assert(auditGeneratorQueueColors(level).passed);assert(api.auditCandidateBlockArt(level).passed);
const design=fs.readFileSync('tools/lv70-remake-20260927/design-search.mjs','utf8');
const statistics=new Function('assert','return '+design.slice(design.indexOf('export function statistics')+7,design.indexOf('\nlet attempts=0')))(assert);
const root=`deliverables/lv70-remake-20260927/design-strengthen-${Date.now()}`;fs.mkdirSync(root,{recursive:true});
const changes={yellowGate:{before:12,after:17},queueOwnershipSwap:[a,b],bodySourceAttributesUnchanged:true};
fs.writeFileSync(root+'/input.json',JSON.stringify({level,sourceFile,changes},null,2)+'\n',{flag:'wx'});
const rows=[],deadline=Date.now()+Number(process.argv[2]??60)*1000;let best;
for(let i=0;Date.now()<deadline;i++){
 const weight=[10,30,100,300,1000][i%5],orderSeed=i%36;
 const result=search({...level,mechanismRules:'revised-2026-09-23-v1.4'},{floor:16,maxStates:250000,maxMilliseconds:2000,weight,orderSeed});
 const row={i,weight,orderSeed,status:result.status,cost:result.cost,states:result.states,ms:result.ms,stop:result.stop};rows.push(row);
 if(result.status!=='witness'){if(i%5===4)console.log(JSON.stringify({i,rows:rows.length,last:row}));continue;}
 const replay=api.replayRevisedRoute(level,result.drags);assert(replay.valid&&replay.complete);const stats=statistics(level,result.drags,api);
 level.preservedMoveTarget=result.drags.length;const floor=checkSymmetryGeneratorFloor(level,api,{floor:11,maxStates:500000,maxMilliseconds:5000});
 const file=root+`/candidate-${i}.json`,data={sourceFile,level,drags:result.drags,replay,statistics:stats,floor,changes,levelSha256:digest(level),ruleVersion:lock.activeVersion};
 fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});best={file,U:result.cost,floor:floor.status,stats};console.log(JSON.stringify(best));
 if(floor.thresholdProven||floor.status==='relaxed-shortcut')break;
}
fs.writeFileSync(root+'/report.json',JSON.stringify({sourceFile,changes,rows,best,status:best?.floor==='threshold-proven'?'FLOOR_ROUTE_PASS_MECHANISM_PENDING':'BOUNDED_DIAGNOSTIC'},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({root,best,attempts:rows.length}));
