// Diagnostic witness instrumentation only: search edges and costs unchanged.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.94.0');
const input=process.argv[2],data=JSON.parse(fs.readFileSync(input)),level=data.level,{api}=await loadApi();
const original='deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';let source=fs.readFileSync(original,'utf8');
const oldImport="'../../../.codex-temp/remake21-30-quality/agent25-27/graph.mjs'";
assert.equal(source.split(oldImport).length,2);source=source.replace(oldImport,JSON.stringify(pathToFileURL(path.resolve(path.dirname(original),'../../../.codex-temp/remake21-30-quality/agent25-27/graph.mjs')).href));
const oldReturn="return{status:'unknown',states:seen.size,explored,transitions,ms:Date.now()-start,stop};";
assert.equal(source.split(oldReturn).length,2);source=source.replace(oldReturn,"const best=nodes.reduce((a,n,i)=>n.clears>nodes[a].clears||n.clears===nodes[a].clears&&n.cost<nodes[a].cost?i:a,0);return{status:'unknown',states:seen.size,explored,transitions,ms:Date.now()-start,stop,bestClears:nodes[best].clears,bestCost:nodes[best].cost,partialDrags:route(best)};");
const {search}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const result=search({...level,mechanismRules:'revised-2026-09-23-v1.4'},{floor:Number(process.argv[4]??16),maxStates:250000,maxMilliseconds:Number(process.argv[3]??5000),weight:100,orderSeed:0});
const drags=result.drags??result.partialDrags,replay=api.replayRevisedRoute(level,drags);assert(replay.valid);const output=`deliverables/lv70-remake-20260927/design-progress-${Date.now()}.json`;
fs.writeFileSync(output,JSON.stringify({input,level,drags,result,replay,status:'DIAGNOSTIC_ONLY_NO_LOWER_BOUND'},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,result:{...result,drags:undefined,partialDrags:undefined},replay:{valid:replay.valid,complete:replay.complete,clears:replay.clearEvents,U:replay.nonClearingDrags}}));
