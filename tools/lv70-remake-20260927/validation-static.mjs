import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditLv70Static,preserveOther199} from './validation-contract.mjs';
import {verifyGeneratorRoute} from './validation-route.mjs';
import {adaptation} from './validation-generator-domain.mjs';
const file=process.argv[2],formal=process.argv.includes('--formal');assert(file);
const lock=verifyRulesLock();assert(lock.ok);assert(['1.91.0','1.92.0','1.93.0','1.94.0','1.95.0'].includes(lock.activeVersion));
const data=JSON.parse(fs.readFileSync(file)),drags=data.drags,baselineFile='deliverables/lv70-remake-20260927/baseline.json',baseline=JSON.parse(fs.readFileSync(baselineFile)),{api,inputs}=await loadApi();let level=data.level;
if(formal){assert.deepEqual(JSON.parse(JSON.stringify(api.LEVELS[69])),level);level=api.LEVELS[69];}
const paths=[...inputs,file,baselineFile,...Object.keys(adaptation.originalSources),...['validation-static.mjs','validation-contract.mjs','validation-route.mjs','validation-generator-domain.mjs'].map(p=>'tools/lv70-remake-20260927/'+p),'tools/revised-opening-coverage.mjs','tools/revised-generator-queue-colors.mjs','tools/revised-gate-span-limits.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.91.0.md','docs/rules/mechanism-rules-v'+lock.activeVersion+'.md'];
const bindings=Object.fromEntries(paths.map(p=>[p,digest(fs.readFileSync(p))])),report={createdAt:new Date().toISOString(),status:'running',activeRule:lock.activeVersion,levelContract:'1.91.0 + 1.93.0 ice extension',formal,levelSha256:digest(level),routeSha256:digest(drags),candidate:file,bindings,difficultyCertified:false,pointerValidated:false,timeValidated:false,playerSaveTouched:false};
try{report.static=auditLv70Static(level,drags,baseline,api);for(const p of new Set(report.static.audits.art.requirements.map(r=>'public/'+r.path.replace(/^\//,''))))bindings[p]=digest(fs.readFileSync(p));report.other199=preserveOther199(api.LEVELS,baseline);report.routeProjection=verifyGeneratorRoute(level,drags,api);report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.status='STATIC_AND_ROUTE_PASS_NOT_DIFFICULTY_CERTIFIED';}
catch(e){report.status='FAIL';report.error=String(e.stack??e).replace(/data:text\/javascript;base64,[\w+/=]+/g,'current-core');process.exitCode=1;}
const output=`deliverables/lv70-remake-20260927/validation-${formal?'formal-':''}static-${Date.now()}.json`;fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({output,status:report.status,U:report.static?.replay.nonClearingDrags,units:report.routeProjection?.checkedUnits,error:report.error}));
