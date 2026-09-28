import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import assert from 'node:assert/strict';
import {serialize,deserialize} from 'node:v8';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {continueAxisFloor} from './continuable-axis-floor52.mjs';
const candidate=process.argv[2],resume=process.argv[3],data=JSON.parse(fs.readFileSync(candidate));
assert([54,59].includes(data.level.id));const lock=verifyRulesLock();assert(lock.ok);
const floor=data.level.id===54?11:16,sourceHashes={};
function bind(file){const p=path.relative(process.cwd(),path.resolve(file)).replaceAll('\\','/');if(sourceHashes[p])return;sourceHashes[p]=digest(fs.readFileSync(p));
 const ast=ts.createSourceFile(p,fs.readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true);
 for(const statement of ast.statements)if((ts.isImportDeclaration(statement)||ts.isExportDeclaration(statement))&&statement.moduleSpecifier&&ts.isStringLiteral(statement.moduleSpecifier)&&statement.moduleSpecifier.text.startsWith('.'))bind(path.resolve(path.dirname(p),statement.moduleSpecifier.text));
}
bind('tools/campaign-v145/lv051-060/continuable-axis-floor52.mjs');
const binding={levelSha256:digest(data.level),floor,sourceHashes};let state,totalSearchMs=0,iteration=0;
if(resume){const saved=deserialize(fs.readFileSync(resume));assert.deepEqual(saved.binding,binding);({state,totalSearchMs,iteration}=saved);}
const runId=Date.now(),out=path.dirname(candidate),budget=Number(process.env.SECONDS??900)*1000,maxStates=Number(process.env.PROOF_STATES??4000000),chunkMs=Number(process.env.CHUNK_SECONDS??180)*1000;let spent=0;
while(spent<budget){
 iteration++;for(const[p,h]of Object.entries(sourceHashes))assert.equal(digest(fs.readFileSync(p)),h,'Proof source drift '+p);
 const start=Date.now(),{result,checkpoint}=continueAxisFloor(data.level,{floor,maxStates,maxMilliseconds:Math.min(chunkMs,budget-spent),onProgress:p=>console.log(JSON.stringify({id:data.level.id,kind:'progress',iteration,...p}))},state);
 const elapsed=Date.now()-start;totalSearchMs+=elapsed;spent+=elapsed;state=checkpoint;
 for(const[p,h]of Object.entries(sourceHashes))assert.equal(digest(fs.readFileSync(p)),h,'Proof source drift '+p);
 const stem=path.join(out,`continued-proof${data.level.id}-${runId}-${iteration}`),checkpointFile=checkpoint?stem+'.bin':null;
 if(checkpoint)fs.writeFileSync(checkpointFile,serialize({binding,state,totalSearchMs,iteration}),{flag:'wx'});
 const report={checkedAt:new Date().toISOString(),ruleVersion:lock.activeVersion,candidate,candidateSha256:digest(fs.readFileSync(candidate)),binding,totalSearchMs,result,checkpointFile,resume:resume??null,driverSha256:digest(fs.readFileSync(process.argv[1])),pointerValidated:false,formalAdopted:false};
 fs.writeFileSync(stem+'.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({report:stem+'.json',status:result.status,states:result.discoveredStates,expanded:result.exploredStates,pending:result.pendingQueueRecords,cost:result.lowestQueuedCost,shortcut:result.relaxedNonClearingDrags,seconds:totalSearchMs/1000}));
 if(!checkpoint||result.termination==='max-states')break;
}
